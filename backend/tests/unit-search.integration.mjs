// Creates, migrates and drops only a uniquely named disposable loopback database.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import postgres from 'postgres';
const url = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Loopback required');
const name = 'skoun_search_test_' + randomUUID().replaceAll('-', '');
const admin = postgres(url.toString(), { max: 1, onnotice: () => {} });
let client; let passed = 0;
const check = async (name, fn) => { await fn(); passed++; console.log('PASS ' + name); };
try {
  await admin.unsafe('CREATE DATABASE "' + name + '"');
  url.pathname = '/' + name; process.env.DATABASE_URL = url.toString();
  client = postgres(url.toString(), { max: 1, onnotice: () => {} });
  const journal = JSON.parse(await readFile(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8'));
  for (const entry of journal.entries) {
    const body = await readFile(new URL('../drizzle/' + entry.tag + '.sql', import.meta.url), 'utf8');
    for (const part of body.split('--> statement-breakpoint')) await client.unsafe(part);
  }
  const { searchUnits } = await import('../dist/modules/search/unit-search.service.js');
  const { listListingsQuerySchema: schema } = await import('../dist/modules/listings/listings.schemas.js');
  const { listingsService } = await import('../dist/modules/listings/listings.service.js');
  const { searchService } = await import('../dist/modules/search/search.service.js');
  const promo = await import('../dist/modules/promotions/promotions.service.js');
  const { DEFAULT_PROMOTION_CATALOG } = await import('../dist/config/promotion-catalog.js');
  const config = structuredClone(DEFAULT_PROMOTION_CATALOG);
  config.salesEnabled = true; config.products.forEach(p => p.priceStatus = 'published');
  config.packs.forEach((p,i) => { p.priceStatus = 'published'; p.amountUsdCents = [1200,5000,10000][i]; });
  process.env.PROMOTION_CATALOG_JSON = JSON.stringify(config);
  process.env.PROMOTION_PLACEMENT_ENABLED = 'true';
  const [owner] = await client`INSERT INTO users(role,post_credits,boost_credits,boost_credit_units_version) VALUES ('poster',100,100000,1) RETURNING id`;
  const [other] = await client`INSERT INTO users(role) VALUES ('poster') RETURNING id`;
  const [campus] = await client`INSERT INTO universities(name,slug,active,location) VALUES ('Search campus','search-campus',true,ST_GeogFromText('POINT(35.48 33.89)')) RETURNING id`;
  const units = [];
  for (let i = 0; i < 31; i++) {
    const place = i > 0 && i < 5 ? units[0].place_id : null;
    const [row] = await client`INSERT INTO listings(poster_id,place_id,listing_type,status,availability,monthly_rent_usd,electricity,water,wifi_included,area,title,location,published_at,expires_at)
      VALUES (${i === 5 ? other.id : owner.id},${place},'private_room','active','available',${100+i*10},'solar','state_well_24_7',true,'Hamra',${'Search unit '+i},ST_SetSRID(ST_MakePoint(${35.48+i*0.001},33.89),4326)::geography,now()-${i+' hours'}::interval,now()+interval '30 days') RETURNING *`;
    await client`INSERT INTO listing_photos(listing_id,url,sort_order) VALUES (${row.id},'/uploads/1.png',0),(${row.id},'/uploads/2.png',1),(${row.id},'/uploads/3.png',2)`;
    units.push(row);
  }
  // Separate owners/places at exactly the same coordinates must stay separate.
  await client`UPDATE listings SET location=(SELECT location FROM listings WHERE id=${units[0].id}) WHERE id=${units[5].id}`;
  const session = randomUUID();
  const search = (q = {}) => searchUnits(schema.parse({ areas: 'Hamra', ...q }), session);
  const ids = rows => rows.map(l => l.id);
  await check('units paginate globally without collapsing place members', async () => {
    const a = await search(), b = await search({ page: '2' });
    assert.equal(a.data.length, 24); assert.equal(b.data.length, 7); assert.equal(a.pagination.total, 31);
    assert.equal(new Set([...ids(a.data), ...ids(b.data)]).size, 31);
    assert.equal(a.data.filter(l => l.placeId === units[0].place_id).length, 5);
    assert.deepEqual(ids(a.data), ids((await search()).data));
    assert.equal((await search({ page: '999' })).pagination.page, 2);
  });
  await check('price asc/desc and campus/point distance sort before pagination', async () => {
    const asc = await search({ sort: 'price_asc', pageSize: '2' });
    const desc = await search({ sort: 'price_desc', pageSize: '2' });
    assert.deepEqual(asc.data.map(l => l.monthlyRentUsd), [100,110]);
    assert.deepEqual(desc.data.map(l => l.monthlyRentUsd), [400,390]);
    for (const location of [{ campusId: campus.id }, { lat: '33.89', lng: '35.48', radiusKm: '20' }]) {
      const r = await search({ ...location, sort: 'distance', pageSize: '2' });
      assert.deepEqual(new Set(ids(r.data)), new Set([units[0].id, units[1].id]));
      assert.ok(r.data.every(l => l.placeId));
      assert.equal((await search({ ...location, sort: 'price_desc', pageSize: '1' })).data[0].id, units[30].id);
      assert.equal((await search({ ...location, sort: 'newest', pageSize: '1' })).data[0].id, units[0].id);
    }
  });
  await check('matcher scores the full population and applies requirements for every sort', async () => {
    const prefs = { version: 1, budget: { value: { min: 390, max: 400 }, importance: 'prefer' } };
    const r = await search({ matcher: JSON.stringify(prefs), sort: 'match', pageSize: '1' });
    assert.equal(r.data[0].id, units[29].id); assert.equal(r.matches[units[29].id].score, 100);
    assert.equal(r.pagination.total, 31); assert.equal(r.widening.strictCount, 2);
    prefs.budget.importance = 'required';
    for (const sort of ['newest','price_asc','price_desc','distance','match']) {
      const result = await search({ matcher: JSON.stringify(prefs), sort });
      assert.equal(result.pagination.total, 2); assert.ok(result.data.every(l => l.monthlyRentUsd >= 390));
    }
    const location = { version: 1, location: { importance: 'required', value: { kind: 'campus', campusId: campus.id, label: 'Forged label', center: {lat:0,lng:0}, radiusKm: 0.01 } } };
    assert.equal((await search({ matcher: JSON.stringify(location) })).pagination.total, 6);
  });
  await check('map gets all matching units and detail siblings use real place membership', async () => {
    const map = await search({ view: 'map', pageSize: '1' }); assert.equal(map.data.length, 31);
    assert.equal(map.data.filter(l => l.placeId === units[0].place_id).length, 5);
    const siblings = await listingsService.listNearby(units[0].id);
    assert.deepEqual(new Set(ids(siblings)), new Set(units.slice(1,5).map(l => l.id)));
    assert.ok(!ids(siblings).includes(units[5].id));
  });
  const buy = (unit, productId) => promo.createPromotion(owner.id, { listingId:unit.id, productId, marketKey:'area:Hamra', mode:'start', autoRenew:false, catalogVersion:config.version, idempotencyKey:randomUUID() });
  await check('Featured is separate, deduplicated across pages; sibling campaigns remain allowed', async () => {
    await buy(units[1], 'featured_7'); await buy(units[2], 'featured_7'); await buy(units[3], 'featured_7');
    const a = await search({ pageSize:'2' }), b = await search({ pageSize:'2', page:'2' });
    assert.equal(a.featured.length, 3); assert.equal(a.pagination.total, 28);
    assert.deepEqual(ids(a.featured), ids(b.featured));
    const all = await search({ view:'map' });
    assert.ok(all.data.every(l => !ids(all.featured).includes(l.id)));
    assert.equal(new Set([...ids(all.featured), ...ids(all.data)]).size,31);
    const filtered = await search({ minRentUsd:'300' }); assert.equal(filtered.featured.length,0);
    const required = await search({matcher:JSON.stringify({version:1,budget:{value:{min:390,max:400},importance:'required'}})});
    assert.equal(required.featured.length,0); assert.equal(required.pagination.total,2);
  });
  await check('Bump affects newest only, never price, distance or best match', async () => {
    await buy(units[30], 'bump_3');
    assert.equal((await search({ pageSize:'1' })).data[0].id,units[30].id);
    for (const sort of ['price_asc','distance','match']) {
      const prefs = { version:1, budget:{value:{min:null,max:100},importance:'prefer'} };
      const r = await search({sort, campusId: sort==='distance' ? campus.id : undefined, matcher:JSON.stringify(prefs)});
      assert.equal(r.data[0].id,units[0].id);
      assert.ok(r.data.every(l => l.promotion?.type !== 'bump'));
    }
  });
  await check('legacy boosts are confined to newest and expiry removes their advantage', async () => {
    process.env.PROMOTION_PLACEMENT_ENABLED = 'false';
    await client`UPDATE listings SET boosted_until=now()+interval '1 day' WHERE id=${units[20].id}`;
    assert.equal((await search({pageSize:'1'})).data[0].id,units[20].id);
    assert.equal((await search({sort:'price_asc',pageSize:'1'})).data[0].id,units[0].id);
    await client`UPDATE listings SET boosted_until=now()-interval '1 second' WHERE id=${units[20].id}`;
    assert.equal((await search({pageSize:'1'})).data[0].id,units[0].id);
    process.env.PROMOTION_PLACEMENT_ENABLED = 'true';
  });
  await check('hidden, rented, expired, archived, unconfirmed and zero-bed units are excluded everywhere', async () => {
    await client`UPDATE listings SET hidden=true WHERE id=${units[1].id}`;
    await client`UPDATE listings SET availability='rented' WHERE id=${units[2].id}`;
    await client`UPDATE listings SET expires_at=now()-interval '1 hour' WHERE id=${units[3].id}`;
    await client`UPDATE listings SET status='archived' WHERE id=${units[4].id}`;
    await client`UPDATE places SET hidden=true WHERE id=${units[5].place_id}`;
    for (const i of [6,7]) await client`UPDATE listings SET listing_type='shared_dorm_bed',unit_type='shared_bed',beds=2,beds_total=2,beds_available=${i===6?null:0},inventory_needs_confirmation=${i===6} WHERE id=${units[i].id}`;
    for (const q of [{}, {campusId:campus.id}, {lat:'33.89',lng:'35.48',radiusKm:'20'}, {matcher:JSON.stringify({version:1,wifi:{value:true,importance:'prefer'}})}]) {
      const r = await search({...q,view:'map'});
      const found = new Set([...ids(r.data),...ids(r.featured)]);
      units.slice(1,8).forEach(l => assert.ok(!found.has(l.id)));
    }
    assert.deepEqual(await listingsService.listNearby(units[0].id),[]);
    const suggestions = await searchService.suggestions('Search unit');
    assert.ok(suggestions.listings.every(l => !units.slice(1,8).some(u=>u.id===l.id)));
  });
  await check('HTTP validates pagination/matcher and returns server metadata', async () => {
    const { default:express } = await import('express');
    const { listingsController } = await import('../dist/modules/listings/listings.controller.js');
    const { errorHandler } = await import('../dist/middleware/error-handler.js');
    const app = express(); app.get('/api/listings',(req,res,next)=>listingsController.list(req,res,next)); app.use(errorHandler);
    const server = app.listen(0,'127.0.0.1'); await once(server,'listening');
    const base = 'http://127.0.0.1:'+server.address().port+'/api/listings';
    try {
      for (const query of ['page=0','pageSize=101','sort=bad','matcher=bad','matcher='+encodeURIComponent(JSON.stringify({version:1,wifi:{value:'yes',importance:'prefer'}}))]) assert.equal((await fetch(base+'?'+query)).status,400);
      const response = await fetch(base+'?pageSize=2&sort=price_desc'); assert.equal(response.status,200);
      const body = await response.json(); assert.equal(body.data.length,2); assert.ok(body.pagination); assert.ok(body.featured); assert.ok(body.matches);
    } finally { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
  });
  console.log('Search scenarios passed: '+passed);
} catch(error) { console.error(error); process.exitCode=1; }
finally { if(client)await client.end(); await admin.unsafe('DROP DATABASE IF EXISTS "'+name+'" WITH (FORCE)'); await admin.end(); }
process.exit(process.exitCode ?? 0);

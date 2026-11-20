// Real Postgres + HTTP, on a uniquely named disposable loopback database only.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { exposeCurrentRuntimeView } from './current-runtime-view.mjs';
import { exposeSearchRuntime } from './search-runtime.mjs';
import { institutionSeeds } from '../dist/db/seeds/universities.js';
import { seedSearchCatalog } from '../dist/db/seeds/seed-search-catalog.js';

const target=new URL(process.env.DATABASE_URL);
if(!['localhost','127.0.0.1','[::1]'].includes(target.hostname)) throw new Error('Loopback required');
const name='studently_suggest_test_'+randomUUID().replaceAll('-','');
const admin=postgres(target.toString(),{max:1,onnotice:()=>{}});
let client,server,created=false,passed=0;
const check=async(name,fn)=>{await fn();passed++;console.log('PASS '+name);};
try {
  await admin.unsafe('CREATE DATABASE "'+name+'"'); created=true;
  target.pathname='/'+name; process.env.DATABASE_URL=target.toString();
  client=postgres(target.toString(),{max:1,onnotice:()=>{}});
  await client.unsafe('CREATE SCHEMA drizzle; CREATE TABLE drizzle.__drizzle_migrations(id serial primary key,hash text not null,created_at bigint)');
  const journal=JSON.parse(await readFile(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8'));
  for(const entry of journal.entries.filter(e=>e.idx<38)) {
    const body=await readFile(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8');
    for(const part of body.split('--> statement-breakpoint')) await client.unsafe(part);
    await client`INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES (${entry.tag},${entry.when})`;
  }
  await exposeCurrentRuntimeView(client);
  await exposeSearchRuntime(client);
  for(const inst of institutionSeeds) {
    const [parent]=await client`INSERT INTO institutions(name,short_name,slug) VALUES (${inst.name},${inst.shortName},${inst.slug}) RETURNING id`;
    for(const campus of inst.campuses) await client`INSERT INTO universities(institution_id,name,slug,city,is_main,location)
      VALUES (${parent.id},${campus.name},${campus.slug},${campus.city},${Boolean(campus.isMain)},ST_GeogFromText(${campus.location}))`;
  }
  await drizzle(client).transaction(tx=>seedSearchCatalog(tx));
  const [owner]=await client`INSERT INTO users(role) VALUES ('poster') RETURNING id`;
  const places=[];
  async function fixture(area,building,title='Bright studio',options={}) {
    const [place]=await client`INSERT INTO places(owner_id,area,building_name,location,electricity,water)
      VALUES (${owner.id},${area},${building},ST_GeogFromText('POINT(35.48 33.89)'),'solar','state_well_24_7') RETURNING id`;
    const [unit]=await client`INSERT INTO listings(poster_id,place_id,unit_type,gender_rule,space_type,property_type,status,availability,monthly_rent_usd,title,expires_at)
      VALUES (${owner.id},${place.id},'private_room','any','private_room','apartment',${options.status??'active'},${options.availability??'available'},400,${title},now()+interval '30 days') RETURNING id`;
    places.push({...place,unitId:unit.id}); return places.at(-1);
  }
  const hamra=await fixture('Hamra','Bliss House','شقة هادئة');
  const fanar=await fixture('Fanar','Fanar Residence');
  const dekwaneh=await fixture('Dekwaneh','Cedar House');
  const achrafieh=await fixture('Achrafieh','Sassine House');
  await client`INSERT INTO listings(poster_id,place_id,unit_type,gender_rule,space_type,property_type,status,availability,monthly_rent_usd,title,expires_at)
    SELECT poster_id,place_id,unit_type,gender_rule,space_type,property_type,status,availability,monthly_rent_usd,'Second unit',expires_at FROM listings WHERE id=${hamra.unitId}`;
  const unavailable=[];
  for(const reason of ['rented','expired','archived','hidden','place-hidden','unconfirmed','zero-bed']) {
    const p=await fixture('Hamra','Private '+reason);
    if(reason==='rented') await client`UPDATE listings SET availability='rented' WHERE id=${p.unitId}`;
    if(reason==='expired') await client`UPDATE listings SET expires_at=now()-interval '1 day' WHERE id=${p.unitId}`;
    if(reason==='archived') await client`UPDATE listings SET status='archived' WHERE id=${p.unitId}`;
    if(reason==='hidden') await client`UPDATE listings SET hidden=true WHERE id=${p.unitId}`;
    if(reason==='place-hidden') await client`UPDATE places SET hidden=true WHERE id=${p.id}`;
    if(['unconfirmed','zero-bed'].includes(reason)) await client`UPDATE listings SET unit_type='shared_bed',space_type='shared_room',beds=2,beds_total=2,beds_available=${reason==='zero-bed'?0:null},inventory_needs_confirmation=${reason==='unconfirmed'} WHERE id=${p.unitId}`;
    unavailable.push(p);
  }
  const {searchService}=await import('../dist/modules/search/search.service.js');
  const {searchRouter}=await import('../dist/modules/search/search.routes.js');
  const {listingsController}=await import('../dist/modules/listings/listings.controller.js');
  const {errorHandler}=await import('../dist/middleware/error-handler.js');
  const {default:express}=await import('express');
  const {searchController}=await import('../dist/modules/search/search.controller.js');
  const {searchRecentsService}=await import('../dist/modules/search/search-recents.service.js');
  const app=express();app.use(express.json());app.use('/api/search',searchRouter);
  // Isolated harness authenticates one seeded user; production routes still require Clerk.
  app.use('/test/recents',(req,res,next)=>{req.user={id:owner.id,role:'poster',clerkId:'test'};next();});
  app.get('/test/recents',(req,res,next)=>searchController.recents(req,res,next));
  app.post('/test/recents',(req,res,next)=>searchController.remember(req,res,next));
  app.delete('/test/recents',(req,res,next)=>searchController.clearRecents(req,res,next));
  app.get('/api/listings',(req,res,next)=>listingsController.list(req,res,next)); app.use(errorHandler);
  server=app.listen(0,'127.0.0.1'); await once(server,'listening');
  const base='http://127.0.0.1:'+server.address().port;
  const suggest=async(q,limit=10)=>(await (await fetch(base+'/api/search/suggest?'+new URLSearchParams({q,limit:String(limit)}))).json()).data;
  const browse=async(params)=>{const response=await fetch(base+'/api/listings?'+new URLSearchParams(params));assert.equal(response.status,200);return response.json();};
  const ids=r=>new Set([...r.data,...r.featured].map(x=>x.id));

  await check('empty and one-character queries return inventory-backed defaults',async()=>{
    for(const q of ['','a','ب','َ']) {
      const r=await suggest(q);assert.equal(r.mode,'defaults');assert.deepEqual(r.results,[]);
      assert.ok(r.sections.topAreas.length>=6&&r.sections.topAreas.length<=10);assert.ok(r.sections.topCampuses.length>=6&&r.sections.topCampuses.length<=10);
      assert.ok(r.sections.topAreas.every(x=>['area','city'].includes(x.type)));
    }
    assert.equal((await suggest('ha')).mode,'results');
    const small=await suggest('',2);assert.equal(small.sections.topAreas.length,6);assert.equal(small.sections.topCampuses.length,6);
  });
  await check('defaults expose live counts, campus-radius counts and curated location photos',async()=>{
    await client`INSERT INTO listing_photos(listing_id,url,sort_order) VALUES (${hamra.unitId},'/uploads/public-cover.jpg',0),(${unavailable[0].unitId},'/uploads/private-cover.jpg',0)`;
    await client`UPDATE listings SET updated_at=now() WHERE id=${hamra.unitId}`;
    const defaults=await suggest('',20);
    for(const area of defaults.sections.topAreas) {
      const [count]=await client`SELECT count(*)::int AS n FROM listing_resolved WHERE area=${area.canonicalArea}
        AND status='active' AND availability<>'rented' AND hidden_reason IS NULL AND expires_at>now()`;
      assert.equal(area.eligibleUnitCount,count.n);assert.ok(area.eligibleUnitCount>=0);
      const [location]=await client`SELECT image_url FROM search_locations WHERE id=${area.id}`;
      assert.equal(area.thumbnailUrl,location.image_url);assert.equal(area.thumbnailSource,location.image_url?'curated':null);
      assert.notEqual(area.thumbnailUrl,'/uploads/private-cover.jpg');assert.notEqual(area.thumbnailUrl,'/uploads/public-cover.jpg');
    }
    assert.equal(defaults.sections.topAreas.find(x=>x.canonicalArea==='Hamra').thumbnailUrl,'/assets/search/areas/hamra.jpg');
    const {campusHousingRadiusMeters}=await import('../dist/modules/campus/campus.repository.js');
    for(const campus of defaults.sections.topCampuses) {
      const [count]=await client`SELECT count(*)::int AS n FROM listing_resolved l JOIN universities u ON u.id=${campus.id}
        WHERE l.status='active' AND l.availability<>'rented' AND l.hidden_reason IS NULL AND l.expires_at>now()
          AND l.location IS NOT NULL AND ST_DWithin(l.location,u.location,${campusHousingRadiusMeters})`;
      assert.equal(campus.eligibleUnitCount,count.n);assert.equal(campus.thumbnailUrl,null);
      assert.equal(campus.nearbyRadiusMeters,campusHousingRadiusMeters);
      const target=new URL(campus.url,'http://test');assert.equal(Number(target.searchParams.get('radiusKm')),campusHousingRadiusMeters/1000);
      assert.equal((await browse(Object.fromEntries(target.searchParams))).pagination.totalMatching,count.n);
    }
  });
  await check('curated image edits invalidate cache and never fall back to a listing cover',async()=>{
    const before=(await suggest('Hamra')).results.find(x=>x.id==='area:hamra');
    await client`UPDATE search_locations SET image_url=NULL WHERE id='area:hamra'`;
    const cleared=(await suggest('Hamra')).results.find(x=>x.id==='area:hamra');
    assert.equal(cleared.thumbnailUrl,null);assert.equal(cleared.thumbnailSource,null);assert.equal(cleared.eligibleUnitCount,before.eligibleUnitCount);
    await client`UPDATE search_locations SET image_url='https://images.example.test/curated-hamra.jpg' WHERE id='area:hamra'`;
    assert.equal((await suggest('Hamra')).results.find(x=>x.id==='area:hamra').thumbnailUrl,'https://images.example.test/curated-hamra.jpg');
    await client`UPDATE search_locations SET image_url='/assets/search/areas/hamra.jpg' WHERE id='area:hamra'`;
    const {seedSearchLocationImages}=await import('../dist/db/seeds/search-location-images.js');
    await client`UPDATE search_locations SET image_url='https://images.example.test/custom.jpg' WHERE id='area:badaro'`;
    await drizzle(client).transaction(tx=>seedSearchLocationImages(tx));
    assert.equal((await client`SELECT image_url FROM search_locations WHERE id='area:badaro'`)[0].image_url,'https://images.example.test/custom.jpg');
    const photos=await client`SELECT image_url FROM search_locations WHERE kind='area' AND image_url IS NOT NULL`;
    assert.equal(photos.length,10);
  });
  await check('default areas rank eligible units without city totals and refresh on eligibility changes',async()=>{
    const before=await suggest('',20);
    assert.ok(before.sections.topAreas.every(x=>x.type==='area'));
    assert.deepEqual(before.sections.topAreas.filter(x=>x.eligibleUnitCount>0).map(x=>x.canonicalArea),['Hamra','Achrafieh','Dekwaneh','Fanar']);
    await client`UPDATE places SET hidden=true WHERE id=${hamra.id}`;
    const hidden=await suggest('',20);
    assert.deepEqual(hidden.sections.topAreas.filter(x=>x.eligibleUnitCount>0).map(x=>x.canonicalArea),['Achrafieh','Dekwaneh','Fanar']);
    assert.equal(hidden.sections.topAreas.find(x=>x.canonicalArea==='Hamra').eligibleUnitCount,0);
    await client`UPDATE places SET hidden=false WHERE id=${hamra.id}`;
    assert.equal((await suggest('',20)).sections.topAreas[0].canonicalArea,'Hamra');
  });
  await check('Arabic, French accents, transliteration and misspellings return canonical bilingual targets',async()=>{
    for(const [q,label] of [['حمرا','Hamra'],['حَمْرَا','Hamra'],['Fanâr','Fanar'],['Dekouané','Dekwaneh'],['dekwane','Dekwaneh'],['ashrafieh','Achrafieh'],['achrafih','Achrafieh'],['بيروت','Beirut'],['7amra','Hamra']]) {
      const r=await suggest(q);assert.ok(r.results.some(x=>x.label.en===label),q);
      for(const x of r.results) {assert.ok(x.label.ar);assert.ok(x.context.ar);assert.ok(x.url.startsWith('/search?'));}
    }
    for(const q of ['Fanar','الدكوانة']) {
      const town=(await suggest(q)).results.find(x=>x.type==='city');assert.equal(town.context.en,'Matn');assert.equal(town.context.ar,'المتن');
    }
  });
  await check('legacy UOB spelling suggests the corrected campus without changing its target',async()=>{
    for(const q of ['Dekouaneh Campus','UOB Dekouaneh','UOB Dekwaneh']) {
      const campus=(await suggest(q)).results.find(x=>x.type==='campus' && x.slug==='uob-dekouaneh');
      assert.ok(campus,q);assert.equal(campus.label.en,'UOB \u2014 Dekwaneh Campus');
      assert.ok(campus.label.ar);assert.match(campus.url,/universitySlugs=uob-dekouaneh/);
    }
  });
  await check('abbreviations resolve campuses and exact aliases outrank prefixes and fuzzy matches',async()=>{
    for(const q of ['AUB','LAU','USJ']) assert.ok((await suggest(q)).results.some(x=>x.type==='campus'),q);
    assert.ok((await suggest('AUB')).results.every(x=>x.label.en.startsWith('AUB —')));
    assert.ok((await suggest('USJ')).results.every(x=>x.label.en.startsWith('USJ —')));
    await client`INSERT INTO search_aliases(location_id,alias) VALUES ('area:hamra','cedar'),('area:achrafieh','cedar extension'),('area:badaro','cedarr')`;
    const r=await suggest('cedar');assert.deepEqual(r.results.slice(0,2).map(x=>x.id),['area:hamra','area:achrafieh']);
    assert.ok(r.results.findIndex(x=>x.id==='area:badaro')>1);
    await client`INSERT INTO search_aliases(location_id,alias) VALUES ('area:hamra','popular destination'),('area:achrafieh','popular destination')`;
    assert.equal((await suggest('popular destination')).results[0].id,'area:hamra');
    assert.equal((await suggest('a',2)).mode,'defaults');assert.equal((await suggest('au',2)).results.length,2);
  });
  await check('property results are deduplicated, public, and use original names plus Arabic area',async()=>{
    const r=await suggest('Bliss');const matches=r.results.filter(x=>x.type==='place');assert.equal(matches.length,1);assert.equal(matches[0].id,hamra.id);
    assert.match(matches[0].label.ar,/Bliss House/);assert.match(matches[0].label.ar,/حمر/);
    const privateRows=(await suggest('Private',20)).results.filter(x=>x.type==='place');assert.deepEqual(privateRows,[]);
    const dest=new URL(matches[0].url,base);assert.equal(dest.searchParams.get('placeId'),hamra.id);
    const result=await browse(dest.searchParams);assert.equal(result.pagination.totalMatching,2);assert.ok(result.data.every(x=>x.placeId===hamra.id));
  });
  await check('cache invalidates across host edits, eligibility changes, and alias edits',async()=>{
    assert.ok((await suggest('Bliss')).results.some(x=>x.id===hamra.id));
    await client`UPDATE places SET building_name='Quiet House' WHERE id=${hamra.id}`;
    assert.ok(!(await suggest('Bliss')).results.some(x=>x.id===hamra.id));assert.ok((await suggest('Quiet')).results.some(x=>x.id===hamra.id));
    await client`UPDATE places SET hidden=true WHERE id=${hamra.id}`;
    assert.ok(!(await suggest('Quiet')).results.some(x=>x.id===hamra.id));
    await client`UPDATE places SET hidden=false WHERE id=${hamra.id}`;
    const a=await searchService.suggest('Quiet');a.results.length=0;assert.ok((await suggest('Quiet')).results.length);
    await client`INSERT INTO search_aliases(location_id,alias) VALUES ('area:hamra','newly curated')`;
    assert.equal((await suggest('newly curated')).results[0].id,'area:hamra');
    const campus=(await suggest('AUB')).results.find(x=>x.type==='campus');assert.ok(campus);
    await client`UPDATE universities SET active=false WHERE id=${campus.id}`;
    assert.ok(!(await suggest('AUB')).results.some(x=>x.id===campus.id));
    await client`UPDATE universities SET active=true WHERE id=${campus.id}`;
  });
  await check('cached property disappears at expiry without a database write',async()=>{
    const p=await fixture('Hamra','Transient House');
    await client`UPDATE listings SET expires_at=now()+interval '1 second' WHERE id=${p.unitId}`;
    assert.ok((await suggest('Transient')).results.some(x=>x.id===p.id));
    await new Promise(resolve=>setTimeout(resolve,1100));
    assert.ok(!(await suggest('Transient')).results.some(x=>x.id===p.id));
  });
  await check('Arabic browse q and area aliases return stored canonical inventory with residual text',async()=>{
    for(const params of [{q:'حمرا'},{areas:'الحمرا'},{areas:'7amra'},{q:'حَمْرَا هادئة'},{q:'بيروت هادئة'},{city:'Beyrouth',areas:'الحمرا'}]) {
      const r=await browse(params);assert.ok(ids(r).has(hamra.unitId),JSON.stringify(params));assert.ok(r.searchResolution.canonicalAreas.includes('Hamra'));
    }
    for(const params of [{areas:'Dekouané'},{q:'dekwane'},{city:'الدكوانة'}]) assert.ok(ids(await browse(params)).has(dekwaneh.unitId));
    assert.ok(ids(await browse({q:'ashrafieh'})).has(achrafieh.unitId));
    assert.ok(ids(await browse({city:'Fanar'})).has(fanar.unitId));
    assert.equal((await browse({city:'beirut',q:'Fanar'})).pagination.totalMatching,0);
    assert.equal((await browse({placeId:dekwaneh.id,areas:'Hamra'})).pagination.totalMatching,0);
    assert.ok((await browse({q:'Hamra missingword'})).pagination.totalMatching===0);
  });
  await check('place constraints apply before pagination, point radius, campus radius and map results',async()=>{
    const [campus]=await client`SELECT id,slug FROM universities WHERE active LIMIT 1`;
    await client`UPDATE universities SET location=ST_GeogFromText('POINT(35.48 33.89)') WHERE id=${campus.id}`;
    for(const params of [{},{lat:'33.89',lng:'35.48',radiusKm:'5'},{campusId:campus.id},{universitySlugs:campus.slug},{view:'map'}]) {
      const r=await browse({...params,placeId:hamra.id,pageSize:'1'});assert.equal(r.pagination.totalMatching,2);
      assert.ok(r.data.every(x=>x.placeId===hamra.id));
    }
    const prefs={version:1,location:{importance:'required',value:{kind:'area',areas:['الحمرا'],label:'حمرا'}}};
    assert.ok(ids(await browse({matcher:JSON.stringify(prefs)})).has(hamra.unitId));
  });
  await check('HTTP validation, safe unknown aliases, limits, and deleted old endpoint',async()=>{
    for(const qs of ['limit=0','limit=21','limit=1.2','q='+('a'.repeat(65)),'q=a&q=b']) assert.equal((await fetch(base+'/api/search/suggest?'+qs)).status,400,qs);
    assert.equal((await fetch(base+'/api/search/suggestions?q=Hamra')).status,404);
    for(const qs of ['placeId=bad','city=unknown-city','areas=unknown-area']) assert.equal((await fetch(base+'/api/listings?'+qs)).status,400,qs);
    assert.deepEqual((await suggest("'; DROP TABLE listings; --")).results,[]);
    assert.equal((await suggest('qwertyuiozx')).results.length,0);
  });
  await check('recent destinations are canonical, bounded, deduplicated and isolated by account',async()=>{
    const [other]=await client`INSERT INTO users(role) VALUES ('renter') RETURNING id`;
    const http=async(method,body)=>fetch(base+'/test/recents',{method,headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
    assert.equal((await fetch(base+'/api/search/recents')).status,401);
    assert.equal((await fetch(base+'/api/search/recents',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,401);
    for(const body of [{type:'city',id:'area:hamra'},{type:'area',id:'area:hamra',userId:other.id},{type:'campus',id:'bad'},
      {type:'area',id:'area:hamra',label:{en:'forged'},url:'https://evil.test'}])assert.equal((await http('POST',body)).status,400);
    assert.equal((await http('POST',{type:'place',id:unavailable[0].id})).status,404);
    const rows=await client`SELECT id,kind FROM search_locations ORDER BY id LIMIT 11`;
    await Promise.all(rows.map(row=>searchRecentsService.remember(owner.id,{type:row.kind,id:row.id})));
    assert.equal((await client`SELECT count(*)::int AS n FROM user_search_recents WHERE user_id=${owner.id}`)[0].n,8);
    let response=await http('POST',{type:'area',id:'area:hamra'});assert.equal(response.status,200);
    assert.match(response.headers.get('cache-control'),/private.*no-store/);
    let payload=await response.json();assert.equal(payload.data[0].id,'area:hamra');assert.equal(payload.data[0].label.en,'Hamra');
    await http('POST',{type:'area',id:'area:hamra'});
    assert.equal((await searchRecentsService.list(owner.id)).filter(x=>x.id==='area:hamra').length,1);
    await searchRecentsService.remember(other.id,{type:'city',id:'city:dekwaneh'});
    assert.deepEqual((await searchRecentsService.list(other.id)).map(x=>x.id),['city:dekwaneh']);
    assert.equal((await searchRecentsService.list(other.id))[0].context.en,'Matn');
    const [campus]=await client`SELECT id FROM universities WHERE slug='uob-dekouaneh'`;
    await http('POST',{type:'campus',id:campus.id});
    await client`UPDATE universities SET name='Canonical live rename' WHERE id=${campus.id}`;
    payload=await (await http('GET')).json();assert.match(payload.data[0].label.en,/Canonical live rename/);
    await client`UPDATE universities SET name='Dekwaneh Campus' WHERE id=${campus.id}`;
    await http('POST',{type:'place',id:hamra.id});
    await client`UPDATE places SET hidden=true WHERE id=${hamra.id}`;
    assert.ok(!(await searchRecentsService.list(owner.id)).some(x=>x.type==='place'&&x.id===hamra.id));
    await client`UPDATE places SET hidden=false WHERE id=${hamra.id}`;
    assert.equal((await http('DELETE')).status,204);
    assert.deepEqual(await searchRecentsService.list(owner.id),[]);
    assert.equal((await searchRecentsService.list(other.id)).length,1);
  });
  console.log('Suggest scenarios passed: '+passed);
} catch(error) {console.error(error);process.exitCode=1;}
finally {
  if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  if(client)await client.end();
  if(created)await admin.unsafe('DROP DATABASE IF EXISTS "'+name+'" WITH (FORCE)');
  await admin.end();
}
process.exit(process.exitCode??0);

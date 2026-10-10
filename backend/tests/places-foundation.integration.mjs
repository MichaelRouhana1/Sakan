// Isolated database only: never migrate/reset DATABASE_URL.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { applyFoundation, preflight, snapshot } from '../ops/places/foundation.mjs';
import { seedTarget,assertSeedMarker } from '../ops/places/seed-guard.mjs';
import { seedHousing,fixtureId } from '../ops/places/seed-housing.mjs';
import { housingFixtures } from '../src/db/seeds/housing-fixtures.mjs';
import { tmpdir } from 'node:os';
import { mkdtemp,rm } from 'node:fs/promises';
import path from 'node:path';

const url=new URL(process.env.DATABASE_URL);
if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('Foundation tests require a loopback database server');
const name='skoun_places_test_'+randomUUID().replaceAll('-','');
const admin=postgres(url.toString(),{max:1,onnotice:()=>{}});
let client;let assetsDir;let passed=0;
const check=async(label,fn)=>{await fn();passed++;console.log('PASS '+label);};
try{
 await admin.unsafe('CREATE DATABASE "'+name+'"');
 url.pathname='/'+name; process.env.DATABASE_URL=url.toString();
 client=postgres(url.toString(),{max:1,onnotice:()=>{}});
 const journal=JSON.parse(await readFile(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8'));
 await client.unsafe('CREATE SCHEMA drizzle; CREATE TABLE drizzle.__drizzle_migrations(id serial primary key,hash text not null,created_at bigint)');
 for(const entry of journal.entries.filter(x=>x.idx<31)){
  const body=await readFile(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8');
  for(const part of body.split('--> statement-breakpoint'))await client.unsafe(part);
  await client`insert into drizzle.__drizzle_migrations(hash,created_at) values(${createHash('sha256').update(body).digest('hex')},${entry.when})`;
 }
 const [owner]=await client`insert into users(role) values('poster') returning id`;
 const [other]=await client`insert into users(role) values('poster') returning id`;
 const [campus]=await client`insert into universities(name,slug,location) values('Test campus','test-campus',ST_GeogFromText('POINT(35.48 33.90)')) returning id`;
 async function legacy(type='studio',poster=owner.id,extra=''){
  return (await client.unsafe(`insert into listings(poster_id,listing_type,monthly_rent_usd,electricity,water,area,location,amenities,generator_amperes,wifi_included,beds,title,view_count,contact_tap_count,created_at,updated_at,published_at,expires_at) values($1,$2,500,'solar','state_well_24_7','Hamra',ST_GeogFromText('POINT(35.481 33.901)'),'["parking","wifi"]',10,true,4,'Legacy home',27,9,'2026-01-01','2026-01-02','2026-01-03','2027-01-03') ${extra} returning *`,[poster,type]))[0];
 }
 const a=await legacy();const bed=await legacy('shared_dorm_bed');
 await client`insert into listing_photos(listing_id,url,caption) values(${a.id},'/unit.jpg','Original')`;
 await client`insert into saved_listings(user_id,listing_id) values(${other.id},${a.id})`;
 await client`insert into listing_campus_routes(listing_id,campus_id,listing_lng,listing_lat,campus_lng,campus_lat,distance_m,duration_s,coords) values(${a.id},${campus.id},35.481,33.901,35.48,33.90,150,120,'[{"lng":35.48,"lat":33.90},{"lng":35.481,"lat":33.901}]')`;
 await check('read-only preflight before migration',async()=>{
  const before=await snapshot(client);const report=await preflight(client);
  assert.deepEqual(report.blockers,[]);assert.equal(report.counts.planned_places,2);
  assert.deepEqual(await snapshot(client),before);
 });
 await check('backfill preserves all legacy fields and referencing rows',async()=>{
  const result=await applyFoundation(client);assert.equal(result.legacyDataUnchanged,true);
  assert.deepEqual(result.before,result.after);
 });
 await check('one-to-one backfill and resolver parity',async()=>{
  const report=await preflight(client);assert.deepEqual(report.blockers,[]);assert.deepEqual(report.resolver,{compared:2,mismatches:0});assert.deepEqual(report.routes,{compared:1,mismatches:0});
  assert.equal((await client`select count(*)::int n from place_photos`)[0].n,0);
  const [b]=await client`select * from listings where id=${bed.id}`;
  assert.equal(b.beds_available,null);assert.equal(b.inventory_needs_confirmation,true);assert.equal(b.beds_total,4);
 });
 await check('migration runner is idempotent',async()=>assert.equal((await applyFoundation(client)).legacyDataUnchanged,true));
 await check('guarded rollback and reapply preserve legacy data',async()=>{
  const before=await snapshot(client);
  await client.unsafe(await readFile(new URL('../ops/places/rollback-foundation.sql',import.meta.url),'utf8'));
  assert.equal((await preflight(client)).counts.planned_places,2);
  assert.deepEqual(await snapshot(client),before);
  await applyFoundation(client);
 });
 await check('legacy insert supplies required link and canonical types',async()=>{
  const l=await legacy('private_room');assert.equal(l.unit_type,'private_room');assert.ok(l.place_id);assert.equal(l.gender_rule,'any');
 });
 await check('false and null override, inheritance and removal',async()=>{
  await client`update listings set place_overrides='{"wifi_included":false,"generator_amperes":null}' where id=${a.id}`;
  let [r]=await client`select * from listing_resolved where id=${a.id}`;
  assert.equal(r.wifi_included,false);assert.equal(r.generator_amperes,null);assert.equal(r.effective_sources.wifi_included,'unit');
  await client`update places set generator_amperes=20,wifi_included=false,water_bill_included=true where id=${a.id}`;
  [r]=await client`select * from listing_resolved where id=${a.id}`;
  assert.equal(r.generator_amperes,null);assert.equal(r.water_bill_included,true);assert.equal(r.updated_at.toISOString(),'2026-01-02T00:00:00.000Z');
  await client`update listings set place_overrides='{}' where id=${a.id}`;
  [r]=await client`select * from listing_resolved where id=${a.id}`;assert.equal(r.generator_amperes,20);assert.equal(r.effective_sources.generator_amperes,'place');
 });
 await check('invalid override keys, types and nulls fail atomically',async()=>{
  for(const value of [{owner_id:other.id},{location:null},{wifi_included:null},{wifi_included:'false'},{generator_amperes:1.5},{water:'unknown'}])
   await assert.rejects(client`update listings set place_overrides=${client.json(value)} where id=${a.id}`);
 });
 await check('amenity additions, explicit false and restored inheritance',async()=>{
  await client`update listings set unit_amenities='["ac"]',amenity_overrides='{"parking":false,"balcony":true}' where id=${a.id}`;
  assert.deepEqual((await client`select amenities from listing_resolved where id=${a.id}`)[0].amenities,['wifi','ac','balcony']);
  assert.deepEqual((await client`select effective_sources->'amenities' sources from listing_resolved where id=${a.id}`)[0].sources,{parking:'unit',wifi:'place',ac:'unit',balcony:'unit'});
  await client`update listings set amenity_overrides='{}',unit_amenities='[]' where id=${a.id}`;
  assert.deepEqual((await client`select amenities from listing_resolved where id=${a.id}`)[0].amenities,['parking','wifi']);
 });
 await check('legacy edits remain effective without touching dates/counters',async()=>{
  await client`update listings set wifi_included=true,amenities='["ac"]' where id=${a.id}`;
  const [r]=await client`select * from listing_resolved where id=${a.id}`;
  assert.equal(r.wifi_included,true);assert.deepEqual(r.amenities,['ac']);assert.equal(r.view_count,27);assert.equal(r.contact_tap_count,9);
  assert.equal((await preflight(client)).resolver.mismatches,0);
 });
 await check('owner mismatch and impossible bed counts rejected',async()=>{
  await assert.rejects(client`update listings set poster_id=${other.id} where id=${a.id}`);
  await assert.rejects(client`update listings set beds_available=5 where id=${bed.id}`);
  await client`update listings set beds_available=2 where id=${bed.id}`;
  assert.equal((await client`select inventory_needs_confirmation from listings where id=${bed.id}`)[0].inventory_needs_confirmation,false);
 });
 await check('place pin invalidates old and new route caches',async()=>{
  await client`update places set location=ST_GeogFromText('POINT(35.49 33.91)') where id=${a.id}`;
  assert.equal((await client`select count(*)::int n from place_campus_routes`)[0].n,0);
  assert.equal((await client`select count(*)::int n from listing_campus_routes`)[0].n,0);
  assert.equal((await preflight(client)).resolver.mismatches,0);
 });
 await check('preflight rejects blocking price data and remains read-only',async()=>{
  await client`update listings set monthly_rent_usd=0 where id=${a.id}`;
  const before=await snapshot(client);const report=await preflight(client);assert.ok(report.blockers.some(x=>x.startsWith('invalid_prices')));
  assert.deepEqual(await snapshot(client),before);
  await client`update listings set monthly_rent_usd=500 where id=${a.id}`;
 });
 const { walkingRoutesRepository:routes }=await import('../dist/modules/walking-routes/walking-routes.repository.js');
 const { walkingRoutesService:routeService }=await import('../dist/modules/walking-routes/walking-routes.service.js');
 const sibling=await legacy('private_room');
 await client`update listings set place_id=${a.id} where id=${sibling.id}`;
 await check('two units share one cache and one Mapbox request',async()=>{
  process.env.MAPBOX_ACCESS_TOKEN='fixture-token';
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,20));return {ok:true,json:async()=>({routes:[{distance:200,duration:180,geometry:{coordinates:[[35.48,33.90],[35.49,33.91]]}}]})};};
  try{
   const results=await Promise.all([routeService.getWalkingRoute(a.id,'test-campus'),routeService.getWalkingRoute(sibling.id,'test-campus')]);
   assert.equal(calls,1);assert.deepEqual(results[0],results[1]);assert.equal(results[0].status,'ok');
   assert.equal((await client`select count(*)::int n from place_campus_routes where place_id=${a.id}`)[0].n,1);
   assert.deepEqual((await routes.findWalking(a.id,campus.id)).coords,(await routes.findWalking(sibling.id,campus.id)).coords);
   assert.equal((await preflight(client)).routes.mismatches,0);
  }finally{globalThis.fetch=original;}
 });
 await check('database lock serializes misses across repository instances',async()=>{
  let inside=0,maxInside=0;
  await Promise.all([1,2,3].map(()=>routes.withPlaceLock(a.id,campus.id,async()=>{
   inside++;maxInside=Math.max(maxInside,inside);await new Promise(resolve=>setTimeout(resolve,15));inside--;
  })));
  assert.equal(maxInside,1);
 });
 await check('campus edit invalidates both caches; stale fetch cannot repopulate',async()=>{
  await client`update universities set location=ST_GeogFromText('POINT(35.50 33.92)') where id=${campus.id}`;
  assert.equal(await routes.findWalking(a.id,campus.id),null);
  await routes.upsertWalking({listingId:a.id,campusId:campus.id,listingLng:35.49,listingLat:33.91,campusLng:35.48,campusLat:33.90,distanceM:200,durationS:180,coords:[{lng:35.48,lat:33.90},{lng:35.49,lat:33.91}]});
  assert.equal(await routes.findWalking(a.id,campus.id),null);
 });
 await check('fallback is not cached and route response keeps its original shape',async()=>{
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>{calls++;return {ok:false,status:503};};
  try{
   const result=await routeService.getWalkingRoute(a.id,'test-campus');
   assert.deepEqual(Object.keys(result).sort(),['coords','distanceM','durationS','status']);assert.equal(result.status,'fallback');
   await routeService.getWalkingRoute(sibling.id,'test-campus');assert.equal(calls,1);
   assert.equal(await routes.findWalking(a.id,campus.id),null);
  }finally{globalThis.fetch=original;}
 });
 await check('legacy location edit detaches only the edited shared unit',async()=>{
  await client`update listings set location=ST_GeogFromText('POINT(35.51 33.93)') where id=${sibling.id}`;
  const pins=await Promise.all([routes.findListingPin(a.id),routes.findListingPin(sibling.id)]);
  assert.notEqual(pins[0].placeId,pins[1].placeId);assert.equal(pins[0].lng,35.49);assert.equal(pins[1].lng,35.51);
  assert.equal((await preflight(client)).resolver.mismatches,0);
 });
 const seedEnv={NODE_ENV:'test',DEPLOYMENT_ENV:'local',DATABASE_URL:url.toString(),UPLOAD_DIR:''};
 await check('production, protected names, remote local hosts and unmarked DBs are refused',async()=>{
  for(const patch of [{NODE_ENV:'production'},{DEPLOYMENT_ENV:'production'},{DEPLOYMENT_ENV:undefined},{DATABASE_URL:'postgres://x@localhost/postgres'},{DATABASE_URL:'postgres://x@db.example/skoun_dev'},{DEPLOYMENT_ENV:'staging',DATABASE_URL:'postgres://x@db.example/skoun_staging'}])
   assert.throws(()=>seedTarget({...seedEnv,...patch}));
  assert.throws(()=>seedTarget({...seedEnv,DEV_DATABASE_URL:undefined},{reset:true}));
  await assert.rejects(client.begin('read only',tx=>assertSeedMarker(tx,seedTarget(seedEnv))));
 });
 await client.unsafe('CREATE SCHEMA skoun_ops; CREATE TABLE skoun_ops.environment_guard(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),environment text NOT NULL,database_name text NOT NULL)');
 await client`insert into skoun_ops.environment_guard(environment,database_name) values('local',${name})`;
 for(const slug of new Set(housingFixtures.map(x=>x.campus)))await client`insert into universities(name,slug,location) values(${slug},${slug},ST_GeogFromText('POINT(35.48 33.90)')) on conflict(slug) do nothing`;
 assetsDir=await mkdtemp(path.join(tmpdir(),'skoun-housing-assets-'));seedEnv.UPLOAD_DIR=assetsDir;
 await check('new seed creates all place/unit scenarios and bundled galleries',async()=>{
  const nonDemoBefore=await client`select to_jsonb(l) value from listings l order by id`;
  const result=await seedHousing(client,seedEnv);
  assert.equal(result.places,10);assert.equal(result.units,17);assert.equal(result.unitPhotos,51);assert.equal(result.placePhotos,20);assert.equal(result.promotions,2);
  assert.deepEqual(await client`select to_jsonb(l) value from listings l where poster_id<>${fixtureId('owner')} order by id`,nonDemoBefore);
  assert.equal((await preflight(client)).resolver.mismatches,0);
  const [female]=await client`select beds_total,beds_available,gender_rule from listings where id=${fixtureId('unit/hamra-female-beds/shared')}`;
  assert.deepEqual(female,{beds_total:3,beds_available:1,gender_rule:'female_only'});
 });
 await check('seed rerun changes no rows, counters, dates, or promotion history',async()=>{
  const before=await snapshot(client);const result=await seedHousing(client,seedEnv);
  assert.equal(result.places,0);assert.equal(result.units,0);assert.equal(result.promotions,0);assert.deepEqual(await snapshot(client),before);
 });
 await check('rollback refuses multi-unit and shared gallery data',async()=>{
  await assert.rejects(client.unsafe(await readFile(new URL('../ops/places/rollback-foundation.sql',import.meta.url),'utf8')));
  await client.unsafe('ROLLBACK');
  assert.ok((await client`select id from places where id=${fixtureId('place/achrafieh-rooms')}`)[0]);
 });
 await check('manifest-only deletion preserves another listing belonging to demo owner',async()=>{
  const legacyManifest=JSON.parse(await readFile(new URL('../src/db/seeds/legacy-housing-manifest.json',import.meta.url),'utf8'));
  const entry=legacyManifest.listings[0];
  await client`insert into users(id,role) values(${entry.poster_id},'poster')`;
  await client`insert into listings(id,poster_id,title,created_at,listing_type,monthly_rent_usd,electricity,water,area) values(${entry.id},${entry.poster_id},${entry.title},${entry.created_at},'studio',250,'solar','state_well_24_7','Hamra')`;
  const extra=await legacy('studio',entry.poster_id);
  assert.equal((await seedHousing(client,seedEnv)).removedLegacyListings,1);
  assert.ok((await client`select id from listings where id=${extra.id}`)[0]);
 });
 console.log('Foundation scenarios passed: '+passed);
}catch(error){console.error(error);process.exitCode=1;}
finally{
 if(client)await client.end();
 await admin.unsafe('DROP DATABASE IF EXISTS "'+name+'" WITH (FORCE)');await admin.end();
 if(assetsDir && path.resolve(assetsDir).startsWith(path.resolve(tmpdir())+path.sep) && path.basename(assetsDir).startsWith('skoun-housing-assets-'))await rm(assetsDir,{recursive:true});
}
// The application repository owns a separate lazy pool. The test DB is already
// removed and all test assertions have completed.
process.exit(process.exitCode??0);


import 'dotenv/config';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { exposeCurrentRuntimeView } from './current-runtime-view.mjs';

const source = new URL(process.env.DATABASE_URL);
const admin = postgres(source.toString(), {max:1,onnotice:()=>{}});
const name = `studently_renew_test_${randomUUID().replaceAll('-','')}`;
let database;
let passed=0;
const check=async(label,fn)=>{await fn();passed++;console.log(`PASS ${label}`);};
try {
 await admin.unsafe(`CREATE DATABASE "${name}"`);
 source.pathname=`/${name}`;
 process.env.DATABASE_URL=source.toString();
 database=postgres(source.toString(),{max:1,onnotice:()=>{}});
 await database.unsafe('CREATE SCHEMA drizzle; CREATE TABLE drizzle.__drizzle_migrations(id serial primary key,hash text not null,created_at bigint)');
 const journal=JSON.parse(await readFile(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8'));
 for(const entry of journal.entries.filter(e=>e.idx!==38)) {
  const migration=await readFile(new URL(`../drizzle/${entry.tag}.sql`,import.meta.url),'utf8');
  for(const statement of migration.split('--> statement-breakpoint')) await database.unsafe(statement);
  await database`INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES (${entry.tag},${entry.when})`;
 }
 await exposeCurrentRuntimeView(database);
 const {listingExpiryRepository:renewal}=await import('../dist/modules/listings/listing-expiry.repository.js');
 const {unitAutoRenew,processUnitAutoRenewals}=await import('../dist/modules/listings/unit-auto-renew.service.js');
 const {expiryNotificationsRepository:notifications}=await import('../dist/modules/listings/expiry-notifications.repository.js');
 const promotions=await import('../dist/modules/promotions/promotions.service.js');
 const {listingsService}=await import('../dist/modules/listings/listings.service.js');
 const {DEFAULT_PROMOTION_CATALOG}=await import('../dist/config/promotion-catalog.js');
 const catalog=structuredClone(DEFAULT_PROMOTION_CATALOG);
 catalog.salesEnabled=true;catalog.products.forEach(p=>p.priceStatus='published');catalog.packs.forEach(p=>{p.priceStatus='published';p.amountUsdCents=1200;});
 process.env.PROMOTION_CATALOG_JSON=JSON.stringify(catalog);process.env.PROMOTION_PLACEMENT_ENABLED='true';
 const [owner]=await database`INSERT INTO users(role,post_credits,boost_credits,boost_credit_units_version,legacy_boost_credit_unit_rate) VALUES ('poster',20,100000,1,1200) RETURNING id`;
 const now=new Date();
 const later=ms=>new Date(now.getTime()+ms);
 const notify=async(c,kind)=>{notices.push([c.listingId,kind]);};
 let notices=[];
 async function unit(ms=1800000,extra={}) {
  const [p]=await database`INSERT INTO places(owner_id,area,electricity,water,wifi_included) VALUES (${owner.id},'Hamra','solar','state_well_24_7',true) RETURNING id`;
  const [l]=await database`INSERT INTO listings(poster_id,place_id,unit_type,gender_rule,status,availability,space_type,property_type,monthly_rent_usd,title,published_at,expires_at)
   VALUES (${owner.id},${p.id},'whole_apartment','any','active','available','entire_place','studio',500,'Renew test',now()-interval '20 days',${later(ms)}) RETURNING *`;
  await database`INSERT INTO listing_photos(listing_id,url,sort_order) VALUES (${l.id},'https://example.com/1',0),(${l.id},'https://example.com/2',1),(${l.id},'https://example.com/3',2)`;
  return l;
 }
 const balance=async()=>Number((await database`SELECT post_credits FROM users WHERE id=${owner.id}`)[0].post_credits);
 const current=async(id)=>(await database`SELECT * FROM listings WHERE id=${id}`)[0];
 const run=(ids,at=now)=>processUnitAutoRenewals(at,{listingIds:ids,notify});
 await check('default off; explicit on/off; no charge when toggling',async()=>{
  const l=await unit();assert.equal(l.auto_renew,false);const before=await balance();
  await unitAutoRenew.set(owner.id,l.id,true);await unitAutoRenew.set(owner.id,l.id,false);
  assert.equal((await current(l.id)).auto_renew,false);assert.equal(await balance(),before);await run([l.id]);assert.equal((await current(l.id)).expires_at.getTime(),l.expires_at.getTime());
 });
 await check('manual early and late date math; identical key retries charge once',async()=>{
  for(const ms of [10*86400000,-86400000]) {
   const l=await unit(ms);const before=await balance();const beforeTime=Date.now();
   await Promise.all([renewal.renew(l.id,owner.id,l.expires_at),renewal.renew(l.id,owner.id,l.expires_at)]);
   const after=await current(l.id);assert.equal(await balance(),before-1);
   if(ms>0) assert.equal(after.expires_at.getTime(),l.expires_at.getTime()+30*86400000);
   else assert.ok(Math.abs(after.expires_at.getTime()-beforeTime-30*86400000)<3000);
  }
 });
 await check('final hour only; concurrent workers renew once and stay public',async()=>{
  const l=await unit();await unitAutoRenew.set(owner.id,l.id,true);const before=await balance();
  await Promise.all([run([l.id]),run([l.id])]);await run([l.id]);
  assert.equal(await balance(),before-1);assert.equal((await current(l.id)).expires_at.getTime(),l.expires_at.getTime()+30*86400000);
  const events=await database`SELECT source FROM listing_lifecycle_events WHERE listing_id=${l.id} AND event_type='renewed'`;assert.equal(events.length,1);assert.equal(events[0].source,'system');
  assert.equal((await listingsService.getById(l.id)).id,l.id);
  const outside=await unit(3600001);await unitAutoRenew.set(owner.id,outside.id,true);await run([outside.id]);assert.equal((await current(outside.id)).expires_at.getTime(),outside.expires_at.getTime());
  const boundary=await unit(3600000);await unitAutoRenew.set(owner.id,boundary.id,true);await run([boundary.id]);assert.ok((await current(boundary.id)).expires_at>boundary.expires_at);
 });
 await check('no after-expiry catch-up; exact expiry is hidden and archives normally',async()=>{
  const l=await unit(-1);await database`UPDATE listings SET auto_renew=true WHERE id=${l.id}`;
  const before=await balance();await run([l.id]);assert.equal(await balance(),before);
  await assert.rejects(()=>listingsService.getById(l.id));
  const candidate=(await notifications.dueExpiryCandidates(now)).find(c=>c.listingId===l.id);assert.ok(candidate);await notifications.ensureExpired(candidate);assert.equal((await current(l.id)).status,'archived');
 });
 await check('402 rolls back; credit warning before expiry; manual recovery works',async()=>{
  const l=await unit(2*86400000);await unitAutoRenew.set(owner.id,l.id,true);await database`UPDATE users SET post_credits=0 WHERE id=${owner.id}`;
  await run([l.id]);assert.ok(notices.some(n=>n[0]===l.id&&n[1]==='renewal_credit_needed'));
  await assert.rejects(()=>renewal.renew(l.id,owner.id,l.expires_at),e=>e.statusCode===402);
  assert.equal((await database`SELECT * FROM listing_charge_ledger WHERE listing_id=${l.id} AND reason='renew'`).length,0);
  await database`UPDATE users SET post_credits=20 WHERE id=${owner.id}`;await renewal.renew(l.id,owner.id,l.expires_at);
 });
 await check('shared bed 409, warning, no charge, then confirm and renew',async()=>{
  const l=await unit();await database`UPDATE listings SET unit_type='shared_bed',beds_total=3,beds_available=NULL,inventory_needs_confirmation=true WHERE id=${l.id}`;
  await unitAutoRenew.set(owner.id,l.id,true);const before=await balance();await run([l.id]);
  assert.ok(notices.some(n=>n[0]===l.id&&n[1]==='renewal_beds_needed'));assert.equal(await balance(),before);
  await assert.rejects(()=>renewal.renew(l.id,owner.id,l.expires_at),e=>e.statusCode===409&&/beds/i.test(e.message));
  await database`UPDATE listings SET beds_available=2,inventory_needs_confirmation=false WHERE id=${l.id}`;await run([l.id]);assert.equal(await balance(),before-1);
 });
 await check('Rented and archive suppress auto-renew; old-cycle decisions rejected',async()=>{
  const l=await unit();await unitAutoRenew.set(owner.id,l.id,true);await renewal.recordDecision(l.id,owner.id,{cycleExpiresAt:l.expires_at.toISOString(),decision:'rented'});
  const before=await balance();await run([l.id]);assert.equal(await balance(),before);assert.equal((await current(l.id)).auto_renew,false);
  const other=await unit();await renewal.renew(other.id,owner.id,other.expires_at);
  await assert.rejects(()=>renewal.recordDecision(other.id,owner.id,{cycleExpiresAt:other.expires_at.toISOString(),decision:'rented'}),e=>e.statusCode===409);
 });
 await check('shared wallet competition charges once per unit without overspending',async()=>{
  const a=await unit(),b=await unit();await unitAutoRenew.set(owner.id,a.id,true);await unitAutoRenew.set(owner.id,b.id,true);
  await database`UPDATE users SET post_credits=1 WHERE id=${owner.id}`;await Promise.all([run([a.id,b.id]),run([a.id,b.id])]);
  assert.equal(await balance(),0);const changed=[await current(a.id),await current(b.id)].filter(l=>l.expires_at.getTime()>a.expires_at.getTime());assert.equal(changed.length,1);
  await database`UPDATE users SET post_credits=20 WHERE id=${owner.id}`;
 });
 await check('hidden auto-renew units do not consume another unit’s credit forecast',async()=>{
  await database`UPDATE listings SET auto_renew=false WHERE poster_id=${owner.id}`;
  const hidden=await unit(1000000),visible=await unit(2000000);
  await unitAutoRenew.set(owner.id,hidden.id,true);await unitAutoRenew.set(owner.id,visible.id,true);
  await database`UPDATE listings SET hidden=true WHERE id=${hidden.id}`;
  await database`UPDATE users SET post_credits=1 WHERE id=${owner.id}`;
  assert.equal((await unitAutoRenew.view(owner.id,visible.id)).blocked,null);
  await run([hidden.id,visible.id]);assert.equal(await balance(),0);
  assert.equal((await current(hidden.id)).expires_at.getTime(),hidden.expires_at.getTime());
  assert.ok((await current(visible.id)).expires_at>visible.expires_at);
  await database`UPDATE users SET post_credits=20 WHERE id=${owner.id}`;
 });
 await check('host listings include the same eligibility as unit checks without exposing other owners',async()=>{
  const rows=await listingsService.listMine(owner.id);
  assert.ok(rows.length>1);
  for(const row of rows) {
   const state=await unitAutoRenew.view(owner.id,row.id);
   assert.equal(row.autoRenewState.blocked,state.blocked);
   assert.equal(row.autoRenewState.enabled,state.enabled);
  }
  const [other]=await database`INSERT INTO users(role) VALUES ('poster') RETURNING id`;
  assert.equal((await unitAutoRenew.list(other.id)).length,0);
 });
 await check('multi-unit place renews only the requested unit; stale toggle and rented snapshots cannot charge',async()=>{
  const a=await unit(),b=await unit();
  await database`UPDATE listings SET unit_type='private_room' WHERE id IN (${a.id},${b.id})`;
  await database`UPDATE listings SET place_id=${a.place_id} WHERE id=${b.id}`;
  await renewal.renew(a.id,owner.id,a.expires_at);
  assert.equal((await current(b.id)).expires_at.getTime(),b.expires_at.getTime());
  await unitAutoRenew.set(owner.id,b.id,true);await unitAutoRenew.set(owner.id,b.id,false);
  const before=await balance();
  await assert.rejects(()=>renewal.renew(b.id,owner.id,b.expires_at,{automatic:true,now}),e=>e.statusCode===409);
  await unitAutoRenew.set(owner.id,b.id,true);
  await Promise.allSettled([
    renewal.recordDecision(b.id,owner.id,{cycleExpiresAt:b.expires_at.toISOString(),decision:'rented'}),
    renewal.renew(b.id,owner.id,b.expires_at,{automatic:true,now}),
  ]);
  const state=await current(b.id);
  assert.ok(state.status==='archived' || state.expires_at>b.expires_at);
  assert.ok(await balance()>=before-1);
  if(state.availability==='rented') await assert.rejects(()=>renewal.renew(b.id,owner.id,b.expires_at),e=>e.statusCode===409);
 });
 await check('72-hour reminder window and Yes check-in spend no credit',async()=>{
  const a=await unit(3*86400000),b=await unit(3*86400000+1);const candidates=await notifications.preExpiryCandidates(now);
  assert.ok(candidates.some(c=>c.listingId===a.id));assert.ok(!candidates.some(c=>c.listingId===b.id));
  const before=await balance();await renewal.recordDecision(a.id,owner.id,{cycleExpiresAt:a.expires_at.toISOString(),decision:'still_available'});assert.equal(await balance(),before);
  const input={listingId:a.id,cycleExpiresAt:a.expires_at,kind:'pre_expiry',channel:'email',recipientKey:'test@example.com',now};
  const first=await notifications.claimDelivery(input);await notifications.finishDelivery(first.id,{status:'sent'});assert.equal(await notifications.claimDelivery(input),null);
 });
 await check('promotion ends at original cycle boundary, frees slot and refunds once',async()=>{
  const l=await unit();const promotion=await promotions.createPromotion(owner.id,{listingId:l.id,productId:'featured_7',mode:'start',autoRenew:true,catalogVersion:catalog.version,idempotencyKey:randomUUID()});
  await unitAutoRenew.set(owner.id,l.id,true);await run([l.id]);assert.equal((await promotions.readPromotion(owner.id,promotion.id)).status,'active');
  await promotions.settleExpiredPromotionCycles(later(1800001),[l.id]);const ended=await promotions.readPromotion(owner.id,promotion.id);assert.equal(ended.status,'stopped');assert.equal(ended.autoRenew,false);assert.ok(ended.refundedUnits>0);
  await promotions.settleExpiredPromotionCycles(later(1800001),[l.id]);assert.equal((await promotions.readPromotion(owner.id,promotion.id)).refundedUnits,ended.refundedUnits);
 });
 console.log(`${passed} renewal integration checks passed`);
} finally {
 await database?.end();
 await admin.unsafe(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${name}'`);
 await admin.unsafe(`DROP DATABASE IF EXISTS "${name}"`);
 await admin.end();
}
process.exit(0);

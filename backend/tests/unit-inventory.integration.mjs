// Only a newly created disposable loopback database is migrated or deleted.
import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import postgres from 'postgres';
const url=new URL(process.env.DATABASE_URL);
if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('Loopback database required');
const name='skoun_inventory_test_'+randomUUID().replaceAll('-','');
const admin=postgres(url.toString(),{max:1,onnotice:()=>{}});
let client;let passed=0;
const check=async(name,fn)=>{await fn();passed++;console.log('PASS '+name)};
try {
 await admin.unsafe('CREATE DATABASE "'+name+'"');
 url.pathname='/'+name;process.env.DATABASE_URL=url.toString();
 client=postgres(url.toString(),{max:1,onnotice:()=>{}});
 const journal=JSON.parse(await readFile(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8'));
 await client.unsafe('CREATE SCHEMA drizzle; CREATE TABLE drizzle.__drizzle_migrations(id serial primary key,hash text not null,created_at bigint)');
 for(const entry of journal.entries.filter(e=>e.idx<34)) {
  const body=await readFile(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8');
  for(const part of body.split('--> statement-breakpoint'))await client.unsafe(part);
  await client`INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES (${createHash('sha256').update(body).digest('hex')},${entry.when})`;
 }
 await check('targeted slice 2 migration runner applies once and is retry-safe',async()=>{
  const {applyInventory}=await import('../ops/places/apply-inventory.mjs');
  assert.equal((await applyInventory(client)).applied,true);assert.equal((await applyInventory(client)).applied,false);
 });
 process.env.ADMIN_AUTH_REQUIRED='true';process.env.ADMIN_API_KEY='inventory-integration-admin-key';
 const inv=await import('../dist/modules/listings/inventory.service.js');
 const {listingsRepository:repo}=await import('../dist/modules/listings/listings.repository.js');
 const {listingsService}=await import('../dist/modules/listings/listings.service.js');
 const {listingExpiryRepository:expiry}=await import('../dist/modules/listings/listing-expiry.repository.js');
 const staff=await import('../dist/modules/admin/admin-listings.service.js');
 const promo=await import('../dist/modules/promotions/promotions.service.js');
 const {DEFAULT_PROMOTION_CATALOG}=await import('../dist/config/promotion-catalog.js');
 const config=structuredClone(DEFAULT_PROMOTION_CATALOG);config.salesEnabled=true;config.products.forEach(p=>p.priceStatus='published');config.packs.forEach((p,i)=>{p.priceStatus='published';p.amountUsdCents=[1200,5000,10000][i]});
 process.env.PROMOTION_CATALOG_JSON=JSON.stringify(config);process.env.PROMOTION_PLACEMENT_ENABLED='true';
 const [owner]=await client`INSERT INTO users(role,post_credits,boost_credits,boost_credit_units_version) VALUES ('poster',100,100000,1) RETURNING id`;
 const [other]=await client`INSERT INTO users(role,post_credits) VALUES ('poster',0) RETURNING id`;
 const actor={kind:'api_key',clerkId:null,userId:null};
 async function unit(type='studio',place=null,poster=owner.id) {
  const [row]=await client`INSERT INTO listings(poster_id,place_id,listing_type,status,availability,monthly_rent_usd,electricity,water,wifi_included,area,title,beds,location,published_at,expires_at)
   VALUES (${poster},${place},${type},'active','available',500,'solar','state_well_24_7',true,'Hamra','Inventory test home',4,ST_GeogFromText('POINT(35.48 33.89)'),now(),now()+interval '30 days') RETURNING *`;
  await client`INSERT INTO listing_photos(listing_id,url,sort_order) VALUES (${row.id},'/uploads/1.png',0),(${row.id},'/uploads/2.png',1),(${row.id},'/uploads/3.png',2)`;
  return row;
 }
 const row=async id=>(await client`SELECT *,unit_hidden_reason(listings) AS hidden_reason FROM listings WHERE id=${id}`)[0];
 const update=async(id,patch,poster=owner.id)=>inv.updateUnitInventory(id,{expectedVersion:(await row(id)).inventory_version,...patch},poster);
 const buy=(l,productId='bump_3')=>promo.createPromotion(owner.id,{listingId:l.id,productId,marketKey:'area:Hamra',mode:'start',autoRenew:false,catalogVersion:config.version,idempotencyKey:randomUUID()});
 const whole=await unit();const room=await unit('private_room',whole.place_id);
 await check('whole and room available together; units stay separate in search',async()=>{
  assert.equal((await row(whole.id)).hidden_reason,null);assert.equal((await row(room.id)).hidden_reason,null);
  const found=await repo.listActiveByAreas(['Hamra']);assert.ok(found.some(x=>x.id===whole.id)&&found.some(x=>x.id===room.id));
 });
 await check('two sibling Bumps permitted; hide/occupancy refunds only affected units once',async()=>{
  const a=await buy(whole),b=await buy(room);
  await update(room.id,{availability:'rented'});
  assert.equal((await row(whole.id)).hidden_reason,'occupied_alternative');
  const stopped=await promo.readPromotion(owner.id,a.id);assert.equal(stopped.status,'stopped');assert.equal(stopped.refundedUnits,stopped.spentUnits);
  assert.equal((await promo.readPromotion(owner.id,b.id)).status,'stopped');
  const before=(await client`SELECT boost_credits FROM users WHERE id=${owner.id}`)[0].boost_credits;
  await update(room.id,{availability:'rented'});
  assert.equal((await client`SELECT boost_credits FROM users WHERE id=${owner.id}`)[0].boost_credits,before);
  await assert.rejects(update(whole.id,{availability:'rented'}),/occupied inventory/);
  assert.equal((await row(whole.id)).availability,'available');
 });
 await check('archive and restore preserve occupancy, hiding and expiry',async()=>{
  const before=await row(room.id);
  await staff.adminMutateListing(room.id,{kind:'archive',adminNote:'Test archive'},actor);
  assert.equal((await row(whole.id)).hidden_reason,'occupied_alternative');
  await staff.adminMutateListing(room.id,{kind:'restore',adminNote:'Test restore'},actor);
  const after=await row(room.id);assert.equal(after.availability,'rented');assert.equal(after.expires_at.toISOString(),before.expires_at.toISOString());
  await update(room.id,{availability:'available'});assert.equal((await row(whole.id)).hidden_reason,null);
 });
 await check('whole rented hides rooms; same pin with another owner is independent',async()=>{
  const stranger=await unit('private_room',null,other.id);
  await update(whole.id,{availability:'rented'});
  assert.equal((await row(room.id)).hidden_reason,'occupied_alternative');assert.equal((await row(stranger.id)).hidden_reason,null);
  await assert.rejects(update(room.id,{availability:'rented'}),/occupied inventory/);
  await assert.rejects(update(room.id,{hidden:true},other.id),/not found/);
  await assert.rejects(unit('private_room',whole.place_id,other.id));
  await update(whole.id,{availability:'available'});
 });
 await check('building apartments have independent occupancy and multiple Featured campaigns',async()=>{
  const a=await unit();await client`UPDATE places SET kind='building' WHERE id=${a.place_id}`;
  const b=await unit('studio',a.place_id),c=await unit('studio',a.place_id),d=await unit('studio',a.place_id);
  const campaigns=await Promise.all([a,b,c].map(l=>buy(l,'featured_7')));assert.equal(campaigns.length,3);
  await assert.rejects(buy(d,'featured_7'));
  await update(a.id,{availability:'rented'});assert.equal((await row(b.id)).hidden_reason,null);
  assert.equal((await promo.readPromotion(owner.id,campaigns[1].id)).status,'active');
  await inv.setPlaceHidden(a.place_id,true,owner.id);
  assert.equal((await promo.readPromotion(owner.id,campaigns[1].id)).status,'stopped');
  await inv.setPlaceHidden(a.place_id,false,owner.id);assert.equal((await row(a.id)).availability,'rented');
 });
 const beds=await unit('shared_dorm_bed');const bedWhole=await unit('studio',beds.place_id);
 await check('unknown beds cannot be promoted or occupied, and block alternative rental',async()=>{
  assert.equal((await row(beds.id)).hidden_reason,'confirm_beds');
  await assert.rejects(update(beds.id,{availability:'available'}),/Confirm/);
  await assert.rejects(buy(beds));await assert.rejects(update(bedWhole.id,{availability:'rented'}));
  await assert.rejects(update(beds.id,{bedsTotal:3,bedsAvailable:4}),/exceed/);
 });
 await check('confirmed partial and zero vacancy; optimistic conflict; total synced to legacy beds',async()=>{
  await update(beds.id,{bedsTotal:3,bedsAvailable:1});
  assert.equal((await row(beds.id)).beds,3);assert.equal((await row(bedWhole.id)).hidden_reason,'occupied_alternative');
  const version=(await row(beds.id)).inventory_version;
  const attempts=await Promise.allSettled([inv.updateUnitInventory(beds.id,{expectedVersion:version,bedsAvailable:0},owner.id),inv.updateUnitInventory(beds.id,{expectedVersion:version,bedsAvailable:2},owner.id)]);
  assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
  await update(beds.id,{bedsAvailable:0});assert.equal((await row(beds.id)).availability,'rented');
  await assert.rejects(update(beds.id,{availability:'available'}),/available beds/);
  await update(beds.id,{bedsAvailable:3});assert.equal((await row(beds.id)).availability,'available');assert.equal((await row(bedWhole.id)).hidden_reason,null);
 });
 await check('hiding removes search/detail/promotion eligibility without changing dates or availability',async()=>{
  const before=await row(beds.id);await update(beds.id,{hidden:true});
  assert.ok(!(await repo.listActiveByAreas(['Hamra'])).some(l=>l.id===beds.id));
  await assert.rejects(listingsService.getById(beds.id),/not found/);
  assert.equal((await row(beds.id)).expires_at.toISOString(),before.expires_at.toISOString());
  await update(beds.id,{hidden:false});
 });
 const input={spaceType:'entire_place',propertyType:'studio',priceBasis:'per_unit_month',monthlyRentUsd:500,electricity:'solar',water:'state_well_24_7',wifiIncluded:true,bedrooms:1,beds:1,bathrooms:1,maxOccupancy:1,furnishingType:'furnished',floorNumber:1,title:'Atomic publish unit',description:'Atomic inventory integration fixture.',contactName:'Test host',contactPhone:'+96171123456',area:'Hamra',locationWkt:'POINT(35.48 33.89)',photoUrls:['/uploads/a.png','/uploads/b.png','/uploads/c.png']};
 const {createListingSchema}=await import('../dist/modules/listings/listings.schemas.js');const parsed=createListingSchema.parse(input);
 await check('parallel publish allocates one free unit and one charged unit; all-or-nothing when exhausted',async()=>{
  const [u]=await client`INSERT INTO users(role,post_credits) VALUES ('renter',1) RETURNING id`;
  const attempts=await Promise.allSettled(Array.from({length:3},()=>listingsService.create(u.id,parsed)));
  assert.equal(attempts.filter(x=>x.status==='fulfilled').length,2);
  const [balance]=await client`SELECT post_credits,free_slot_publishes_month FROM users WHERE id=${u.id}`;assert.equal(balance.post_credits,0);assert.equal(balance.free_slot_publishes_month,1);
  assert.equal((await client`SELECT count(*)::int n,sum(credits)::int charged FROM listing_charge_ledger WHERE owner_id=${u.id}`)[0].charged,1);
  assert.equal((await client`SELECT count(*)::int n FROM listing_photos p JOIN listings l ON l.id=p.listing_id WHERE l.poster_id=${u.id}`)[0].n,6);
  assert.equal((await client`SELECT count(*)::int n FROM places WHERE owner_id=${u.id}`)[0].n,2);
 });
 await check('failed photo insert rolls back place, unit and free-slot accounting',async()=>{
  const [u]=await client`INSERT INTO users(role,post_credits) VALUES ('renter',1) RETURNING id`;
  await assert.rejects(listingsService.create(u.id,{...parsed,photoUrls:['x'.repeat(3000),'/uploads/b.png','/uploads/c.png']}));
  assert.equal((await client`SELECT count(*)::int n FROM listings WHERE poster_id=${u.id}`)[0].n,0);
  assert.equal((await client`SELECT count(*)::int n FROM places WHERE owner_id=${u.id}`)[0].n,0);
  assert.equal((await client`SELECT post_credits,free_slot_publishes_month FROM users WHERE id=${u.id}`)[0].free_slot_publishes_month,0);
 });
 await check('renew is charged once on concurrent retries and never guesses shared-bed vacancy',async()=>{
  const target=await unit();const before=(await client`SELECT post_credits FROM users WHERE id=${owner.id}`)[0].post_credits;
  await Promise.all([expiry.renew(target.id,owner.id,target.expires_at),expiry.renew(target.id,owner.id,target.expires_at)]);
  assert.equal((await client`SELECT post_credits FROM users WHERE id=${owner.id}`)[0].post_credits,before-1);
  assert.equal((await client`SELECT count(*)::int n FROM listing_charge_ledger WHERE listing_id=${target.id}`)[0].n,1);
  await update(beds.id,{bedsAvailable:0});await assert.rejects(expiry.renew(beds.id,owner.id,beds.expires_at),/available beds/);
 });
 await check('admin list paginates units; real details, edits, reports, photos and audit persist',async()=>{
  const page1=await staff.adminInventoryList(staff.adminInventoryQuery.parse({page:1,pageSize:2}));const page2=await staff.adminInventoryList(staff.adminInventoryQuery.parse({page:2,pageSize:2}));
  assert.equal(page1.items.length,2);assert.ok(!page1.items.some(a=>page2.items.some(b=>a.id===b.id)));assert.equal(page1.total,page1.counts.all);
  const detail=await staff.adminListingDetail(room.id);
  const patch=Object.fromEntries(['title','description','area','landmark','monthlyRentUsd','listingType','contactName','contactPhone','whatsappNumber','electricity','water','wifiIncluded','bedrooms','bathrooms'].map(k=>[k,detail[k]]));patch.monthlyRentUsd=725;
  await staff.adminMutateListing(room.id,staff.adminListingAction.parse({kind:'edit',patch,adminNote:'Correct rent'}),actor);
  assert.equal((await row(room.id)).place_id,whole.place_id,'a rent-only edit must not split a shared place');
  const flagged=await staff.adminMutateListing(room.id,{kind:'photo',photoId:detail.photos[0].id,flagged:true,adminNote:'Check image'},actor);assert.equal(flagged.photos[0].flagged,true);
  await client`INSERT INTO listing_reports(listing_id,reporter_user_id,reason) VALUES (${room.id},${other.id},'fake')`;
  const dismissed=await staff.adminMutateListing(room.id,{kind:'dismiss_reports',adminNote:'Verified'},actor);assert.equal(dismissed.openReports.length,0);
  assert.equal(dismissed.monthlyRentUsd,725);assert.ok(dismissed.moderationHistory.length>=3);
 });
 await check('bulk admin failure rolls back successful earlier rows and audit',async()=>{
  const a=await unit(),b=await unit();await repo.archiveById(b.id,owner.id);
  await assert.rejects(staff.adminBulkListings({ids:[a.id,b.id],kind:'archive',adminNote:'Bulk test'},actor));assert.equal((await row(a.id)).status,'active');
 });
 await check('hiding after expiry refunds from expiry, and occupied deletion preserves sibling protection',async()=>{
  const a=await unit();const c=await buy(a);
  await client`UPDATE promotion_campaigns SET active_since=now()-interval '2 days',started_at=now()-interval '2 days',ends_at=now()+interval '1 day' WHERE id=${c.id}`;
  await client`UPDATE listings SET expires_at=now()-interval '1 day' WHERE id=${a.id}`;
  await update(a.id,{hidden:true});
  assert.ok((await promo.readPromotion(owner.id,c.id)).refundedUnits>=Math.ceil(c.spentUnits*2/3));
  await update(room.id,{availability:'rented'});
  await assert.rejects(repo.deleteByOwner(room.id,owner.id),/Confirm vacancy/);
  assert.equal((await row(whole.id)).hidden_reason,'occupied_alternative');
 });
 await check('two test listings are approved by exact ID/title/area/rent in deletion manifest',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../src/db/seeds/legacy-housing-manifest.json',import.meta.url),'utf8'));
  assert.equal(manifest.listings.length,28);assert.equal(manifest.listings.find(x=>x.id==='fe681bc2-5698-4e87-8036-3d58173577a8').monthly_rent_usd,520);
  assert.equal(manifest.listings.find(x=>x.id==='b5756273-2e8f-4eb1-b0fb-bb068e4bd438').monthly_rent_usd,650);
 });
 await check('admin HTTP requires authentication and validates requests before writes',async()=>{
  const {default:express}=await import('express');const {once}=await import('node:events');
  const {adminRouter}=await import('../dist/modules/admin/admin.routes.js');
  const {errorHandler}=await import('../dist/middleware/error-handler.js');
  const app=express();app.use(express.json());app.use('/api/admin',adminRouter);app.use(errorHandler);
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');
  const base='http://127.0.0.1:'+server.address().port+'/api/admin/inventory/listings';
  const headers={'x-admin-key':process.env.ADMIN_API_KEY,'content-type':'application/json'};
  try {
   assert.equal((await fetch(base)).status,401);
   const response=await fetch(base+'?pageSize=2',{headers});assert.equal(response.status,200);assert.equal((await response.json()).data.items.length,2);
   assert.equal((await fetch(base+'?pageSize=0',{headers})).status,400);
   assert.equal((await fetch(base+'/bad-id',{headers})).status,400);
   assert.equal((await fetch(base+'/'+room.id+'/actions',{method:'POST',headers,body:JSON.stringify({kind:'inventory',adminNote:'',inventory:{expectedVersion:0,hidden:true}})})).status,400);
   assert.equal((await fetch(base+'/'+room.id+'/actions',{method:'POST',headers,body:JSON.stringify({kind:'inventory',adminNote:'Stale',inventory:{expectedVersion:0,hidden:true}})})).status,409);
  } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 });
 console.log('Inventory scenarios passed: '+passed);
} catch(e) {console.error(e);process.exitCode=1;}
finally {if(client)await client.end();await admin.unsafe('DROP DATABASE IF EXISTS "'+name+'" WITH (FORCE)');await admin.end();}
process.exit(process.exitCode??0);

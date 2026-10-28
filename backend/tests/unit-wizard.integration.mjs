import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import postgres from 'postgres';
import { exposeCurrentRuntimeView } from './current-runtime-view.mjs';
const url=new URL(process.env.DATABASE_URL);
if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('Loopback database required');
const name='studently_wizard_test_'+randomUUID().replaceAll('-','');
const admin=postgres(url.toString(),{max:1,onnotice:()=>{}});let client,passed=0;
const check=async(name,fn)=>{await fn();passed++;console.log('PASS '+name)};
try{
 await admin.unsafe('CREATE DATABASE "'+name+'"');url.pathname='/'+name;process.env.DATABASE_URL=url.toString();
 client=postgres(url.toString(),{max:1,onnotice:()=>{}});
 await client.unsafe('CREATE SCHEMA drizzle; CREATE TABLE drizzle.__drizzle_migrations(id serial primary key,hash text not null,created_at bigint)');
 const journal=JSON.parse(await readFile(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8'));
 for(const entry of journal.entries.filter(e=>e.idx<36)){
  const body=await readFile(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8');
  for(const part of body.split('--> statement-breakpoint'))await client.unsafe(part);
  await client`INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES (${createHash('sha256').update(body).digest('hex')},${entry.when})`;
 }
 await check('targeted wizard migration applies once',async()=>{
  const {applyWizard}=await import('../ops/places/apply-wizard.mjs');
  assert.deepEqual((await applyWizard(client)).migrations,['0036_unit_publish_batches']);assert.equal((await applyWizard(client)).applied,false);
 });
 await exposeCurrentRuntimeView(client);
 const {publishUnits,publishUnitsSchema,ownerPlace,publishQuote,publishedBatch}=await import('../dist/modules/listings/unit-publish.service.js');
 const {editPlace,editPlaceSchema}=await import('../dist/modules/listings/place-edit.service.js');
 const {listingsRepository:repo}=await import('../dist/modules/listings/listings.repository.js');
 const {listingsService}=await import('../dist/modules/listings/listings.service.js');
 const {updateUnitInventory}=await import('../dist/modules/listings/inventory.service.js');
 const {createListingSchema}=await import('../dist/modules/listings/listings.schemas.js');
 const [owner]=await client`INSERT INTO users(role,post_credits) VALUES ('poster',10) RETURNING id`;
 const [other]=await client`INSERT INTO users(role,post_credits) VALUES ('poster',10) RETURNING id`;
 const details=createListingSchema.parse({spaceType:'private_room',propertyType:'apartment',monthlyRentUsd:300,electricity:'solar',water:'state_well_24_7',bedrooms:1,beds:1,bathrooms:1,maxOccupancy:1,furnishingType:'furnished',floorNumber:1,title:'Bright room in Hamra',description:'A bright furnished room for a student near campus.',contactName:'Test Host',contactPhone:'+96171123456',area:'Hamra',locationWkt:'POINT(35.48 33.89)',photoUrls:['/uploads/a.jpg','/uploads/b.jpg','/uploads/c.jpg']});
 const batch=(count=2,extra={})=>publishUnitsSchema.parse({requestId:randomUUID(),expectedTotal:count,kind:'apartment',shared:details,sharedPhotos:[{url:'/uploads/shared.jpg',caption:'Kitchen'}],units:Array.from({length:count},()=>({details,bathroomPrivacy:'shared'})),...extra});
 const rows=()=>client`SELECT * FROM listings ORDER BY created_at,id`;
 let first;
 await check('atomic batch uses one place, separate covers and per-unit free/paid credits',async()=>{
  assert.deepEqual((await publishQuote(owner.id,2)).units.map(u=>u.credits),[0,1]);
  const input=batch(2,{expectedTotal:1});first=await publishUnits(owner.id,input);
  assert.equal(first.listingIds.length,2);assert.deepEqual(first.credits,[0,1]);assert.equal(first.total,1);
  const units=await rows();assert.equal(new Set(units.map(u=>u.place_id)).size,1);
  const listing=await repo.findById(first.listingIds[0]);assert.equal(listing.coverUrl,'/uploads/a.jpg');assert.equal(listing.sharedPhotos.length,1);
  assert.equal((await client`SELECT post_credits FROM users WHERE id=${owner.id}`)[0].post_credits,9);
  assert.deepEqual(await publishUnits(owner.id,input),first);
  assert.deepEqual(await publishedBatch(owner.id,input.requestId),first);assert.equal(await publishedBatch(other.id,input.requestId),null);
  assert.equal((await rows()).length,2);
  await assert.rejects(()=>publishUnits(owner.id,{...input,units:[input.units[0]]}),/already used/);
 });
 await check('failed final unit rolls back place, photos, charges, free-slot and every unit',async()=>{
  const [poor]=await client`INSERT INTO users(role,post_credits) VALUES ('poster',0) RETURNING id`;
  const before=(await rows()).length;
  await assert.rejects(()=>publishUnits(poor.id,batch(2,{expectedTotal:1})),/credit/i);
  assert.equal((await rows()).length,before);
  assert.equal((await client`SELECT * FROM places WHERE owner_id=${poor.id}`).length,0);
  assert.equal((await client`SELECT * FROM listing_charge_ledger WHERE owner_id=${poor.id}`).length,0);
  assert.equal(Number((await client`SELECT free_slot_publishes_month FROM users WHERE id=${poor.id}`)[0].free_slot_publishes_month),0);
 });
 await check('concurrent identical publish retries charge and create once',async()=>{
  const input=batch(2);const [a,b]=await Promise.all([publishUnits(owner.id,input),publishUnits(owner.id,input)]);
  assert.deepEqual(a,b);assert.equal((await client`SELECT * FROM listings WHERE place_id=${a.placeId}`).length,2);
 });
 await check('changed credit quote rolls back and demands review',async()=>{
  const before=(await rows()).length;
  await assert.rejects(()=>publishUnits(owner.id,batch(1,{expectedTotal:0})),/total changed/);
  assert.equal((await rows()).length,before);
 });
 await check('add a unit uses actual shared values and enforces place ownership',async()=>{
  const input=batch(1,{placeId:first.placeId,shared:{...details,area:'Verdun',electricity:'generator_24_7',generatorAmperes:10}});
  const added=await publishUnits(owner.id,input);const unit=await repo.findById(added.listingIds[0]);
  assert.equal(unit.placeId,first.placeId);assert.equal(unit.area,'Hamra');assert.equal(unit.electricity,'solar');
  await assert.rejects(()=>publishUnits(other.id,{...input,requestId:randomUUID()}),/not found/);
  await assert.rejects(()=>ownerPlace(other.id,first.placeId),/not found/);
 });
 await check('all electricity fields can differ, then reset to shared; siblings stay intact',async()=>{
  let place=await ownerPlace(owner.id,first.placeId);
  const power=['electricity','electricityCutsStart','electricityCutsEnd','electricityHoursOn','electricityCutWindows','generatorAmperes','hasSolar','generatorIncluded'];
  const edit={...details,bathroomPrivacy:'private',electricity:'scheduled_cuts',generatorAmperes:10,electricityCutWindows:[{start:'01:00',end:'05:00'}],hasSolar:true,generatorIncluded:true,differentFields:power,expectedPlaceUpdatedAt:new Date(place.updatedAt).toISOString()};
  await listingsService.update({id:owner.id,clerkId:'test',role:'poster'},first.listingIds[0],edit);
  const [audit]=await client`SELECT payload FROM admin_audit_events WHERE entity_id=${first.listingIds[0]} AND action='listing.update' ORDER BY created_at DESC LIMIT 1`;
  assert.equal(audit.payload.before.bathroomPrivacy,'shared');assert.equal(audit.payload.after.bathroomPrivacy,'private');
  let unit=await repo.findById(first.listingIds[0]);assert.equal(unit.electricity,'scheduled_cuts');assert.equal(unit.electricityHoursOn,20);assert.equal(unit.generatorIncluded,true);assert.equal(unit.hasSolar,true);
  assert.equal((await repo.findById(first.listingIds[1])).electricity,'solar');
  await listingsService.update({id:owner.id,clerkId:'test',role:'poster'},first.listingIds[0],{...edit,differentFields:[]});
  unit=await repo.findById(first.listingIds[0]);assert.equal(unit.electricity,'solar');assert.equal(unit.generatorAmperes,null);
  assert.deepEqual((await client`SELECT place_overrides FROM listings WHERE id=${unit.id}`)[0].place_overrides,{});
 });
 await check('shared editor projects values and galleries without moving unit photos; stale and foreign edits rejected',async()=>{
  const place=await ownerPlace(owner.id,first.placeId);
  const input=editPlaceSchema.parse({details:{...details,wifiIncluded:true},photos:[],expectedUpdatedAt:new Date(place.updatedAt).toISOString()});
  await editPlace(owner.id,first.placeId,input);
  assert.equal((await repo.findById(first.listingIds[1])).wifiIncluded,true);
  assert.equal((await repo.findById(first.listingIds[1])).photos.length,3);
  assert.equal((await repo.findById(first.listingIds[1])).sharedPhotos.length,0);
  await assert.rejects(()=>editPlace(owner.id,first.placeId,input),/changed/);
  await assert.rejects(()=>editPlace(other.id,first.placeId,input),/not found/);
 });
 await check('new shared rooms require confirmed positive bounded beds and retain gender',async()=>{
  const input=batch(1,{units:[{details:{...details,spaceType:'shared_room',listingType:'shared_dorm_bed',beds:3,genderRestriction:'girls_only'},bathroomPrivacy:'shared',bedsAvailable:2}]});
  const r=await publishUnits(owner.id,input);const unit=await repo.findById(r.listingIds[0]);
  assert.equal(unit.bedsAvailable,2);assert.equal(unit.bedsTotal,3);assert.equal(unit.inventoryNeedsConfirmation,false);assert.equal(unit.genderRestriction,'girls_only');
  for(const value of [undefined,4])await assert.rejects(()=>publishUnits(owner.id,{...input,requestId:randomUUID(),units:[{...input.units[0],bedsAvailable:value}]}),/available beds/);
  for(const value of [0,-1,1.5])assert.equal(publishUnitsSchema.safeParse({...input,units:[{...input.units[0],bedsAvailable:value}]}).success,false);
 });
 await check('buildings contain independent whole apartments; batch photo bounds enforced',async()=>{
  const input=batch(2,{kind:'building',units:Array.from({length:2},()=>({details:{...details,spaceType:'entire_place'},bathroomPrivacy:'private'}))});
  const r=await publishUnits(owner.id,input);assert.equal((await ownerPlace(owner.id,r.placeId)).kind,'building');
  const unit=await repo.findById(r.listingIds[0]);await updateUnitInventory(unit.id,{expectedVersion:unit.inventoryVersion,availability:'rented'},owner.id);
  assert.equal((await repo.findById(r.listingIds[1])).hiddenReason,null);
  assert.equal(publishUnitsSchema.safeParse({...input,sharedPhotos:Array.from({length:16},()=>({url:'/uploads/a.jpg'}))}).success,false);
  assert.equal(publishUnitsSchema.safeParse({...input,units:[{...input.units[0],details:{...details,photoUrls:['/uploads/a.jpg']}}]}).success,false);
 });
 await check('only changed utility fields are overrides; equal copies keep inheriting',async()=>{
  const place=await ownerPlace(owner.id,first.placeId);
  const fields=['electricity','electricityCutsStart','electricityCutsEnd','electricityHoursOn','electricityCutWindows','generatorAmperes','hasSolar','generatorIncluded','water','wifiIncluded','routerUps','hasElevator','elevator24_7','conciergeIncluded','cookingGasIncluded','waterBillIncluded','buildingFeesIncluded','parkingIncludedInRent','amenities'];
  const edit={...details,wifiIncluded:place.wifiIncluded,electricity:'generator_24_7',generatorAmperes:5,differentFields:fields,expectedPlaceUpdatedAt:new Date(place.updatedAt).toISOString()};
  await listingsService.update({id:owner.id,clerkId:'test',role:'poster'},first.listingIds[0],edit);
  const [row]=await client`SELECT place_overrides FROM listings WHERE id=${first.listingIds[0]}`;
  assert.deepEqual(Object.keys(row.place_overrides).sort(),['electricity','generator_amperes']);
  const saved=await ownerPlace(owner.id,first.placeId);
  await editPlace(owner.id,first.placeId,editPlaceSchema.parse({details:{...details,water:'tank_delivery'},photos:[],expectedUpdatedAt:new Date(saved.updatedAt).toISOString()}));
  assert.equal((await repo.findById(first.listingIds[0])).water,'tank_delivery');
  assert.equal((await repo.findById(first.listingIds[0])).electricity,'generator_24_7');
  assert.equal((await repo.findById(first.listingIds[1])).water,'tank_delivery');
  assert.equal((await repo.findById(first.listingIds[1])).electricity,'solar');
 });
 await check('shared changes preserve unit-specific power, and structural location stays place-owned',async()=>{
  const place=await ownerPlace(owner.id,first.placeId);
  const power=['electricity','generatorAmperes','hasSolar','generatorIncluded','electricityCutWindows','electricityCutsStart','electricityCutsEnd','electricityHoursOn'];
  const edit={...details,electricity:'generator_24_7',generatorAmperes:15,hasSolar:false,differentFields:power,expectedPlaceUpdatedAt:new Date(place.updatedAt).toISOString()};
  await listingsService.update({id:owner.id,clerkId:'test',role:'poster'},first.listingIds[0],edit);
  await editPlace(owner.id,first.placeId,editPlaceSchema.parse({details:{...details,hasSolar:true},photos:[],expectedUpdatedAt:new Date(place.updatedAt).toISOString()}));
  assert.equal((await repo.findById(first.listingIds[0])).electricity,'generator_24_7');
  assert.equal((await repo.findById(first.listingIds[0])).hasSolar,true);
  assert.equal((await repo.findById(first.listingIds[1])).hasSolar,true);
  const updated=await ownerPlace(owner.id,first.placeId);
  await assert.rejects(()=>listingsService.update({id:owner.id,clerkId:'test',role:'poster'},first.listingIds[0],{...edit,area:'Verdun',expectedPlaceUpdatedAt:new Date(updated.updatedAt).toISOString()}),/shared location/);
  await client`UPDATE listings SET published_at=now()-interval '2 days' WHERE id=${first.listingIds[1]}`;
  await assert.rejects(()=>editPlace(owner.id,first.placeId,editPlaceSchema.parse({details:{...details,locationWkt:'POINT(35.49 33.89)'},photos:[],expectedUpdatedAt:new Date(updated.updatedAt).toISOString()})),/locked/);
 });
 console.log(`Wizard integration: ${passed} scenarios passed`);
}catch(error){console.error(error);process.exitCode=1;}finally{
 await client?.end();await admin.unsafe('DROP DATABASE IF EXISTS "'+name+'" WITH (FORCE)');await admin.end();
}

process.exit(process.exitCode??0);

import { createHash } from 'node:crypto';
import { readFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { housingFixtures, sharedDefaults } from '../../src/db/seeds/housing-fixtures.mjs';
import { seedTarget, assertSeedMarker } from './seed-guard.mjs';
export const fixtureId=key=>{
 const h=createHash('sha256').update('skoun-housing-v1:'+key).digest('hex');
 return h.slice(0,8)+'-'+h.slice(8,12)+'-4'+h.slice(13,16)+'-8'+h.slice(17,20)+'-'+h.slice(20,32);
};
const manifest=JSON.parse(await readFile(new URL('../../src/db/seeds/legacy-housing-manifest.json',import.meta.url),'utf8'));
const assets=['unit-bedroom','unit-living','unit-detail','shared-facade','shared-kitchen'];
const ownerId=fixtureId('owner');
const jsonColumns=new Set(['amenities','electricity_cut_windows','place_overrides','unit_amenities','amenity_overrides','contact_numbers']);
const serializable=(tx,row)=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,jsonColumns.has(k)?tx.json(v):v]));

export async function seedHousing(client,raw=process.env){
 const target=seedTarget(raw);
 await client.begin('read only',tx=>assertSeedMarker(tx,target));
 const destination=path.resolve(raw.UPLOAD_DIR??'uploads','housing-demo-v1');
 await mkdir(destination,{recursive:true});
 for(const asset of assets)await copyFile(fileURLToPath(new URL('../../src/db/seeds/assets/'+asset+'.png',import.meta.url)),path.join(destination,asset+'.png'));
 const base=(raw.PUBLIC_BASE_URL??'http://localhost:'+(raw.PORT??'3001')).replace(/\/$/,'');
 const photo=asset=>base+'/uploads/housing-demo-v1/'+asset+'.png';
 return client.begin(async tx=>{
  await assertSeedMarker(tx,target);
  await tx`select pg_advisory_xact_lock(183710,2)`;
  await tx.unsafe('CREATE TABLE IF NOT EXISTS skoun_ops.housing_seed_manifest(entity text NOT NULL,id uuid NOT NULL,PRIMARY KEY(entity,id))');
  const result={removedLegacyListings:0,places:0,units:0,unitPhotos:0,placePhotos:0,promotions:0,preservedNonManifestListings:0};
  const existing=await tx`select id,poster_id,title,created_at,place_id,area,monthly_rent_usd from listings where id=any(${manifest.listings.map(x=>x.id)}::uuid[]) for update`;
  for(const row of existing){
   const expected=manifest.listings.find(x=>x.id===row.id);
   const matches=expected.fingerprint_kind==='owner_confirmed_test'
    ? row.title===expected.title && row.area===expected.area && row.monthly_rent_usd===expected.monthly_rent_usd
    : row.poster_id===expected.poster_id && row.title===expected.title && row.created_at.toISOString()===expected.created_at;
   if(!matches)
    throw new Error('Legacy manifest fingerprint changed; refusing to delete '+row.id);
  }
  if(existing.length){
   const live=await tx`select id from promotion_campaigns where listing_id=any(${existing.map(x=>x.id)}::uuid[])`;
   if(live.length)throw new Error('Manifest listing has promotion history; review before removal');
   await tx`delete from listings where id=any(${existing.map(x=>x.id)}::uuid[])`;
   await tx`delete from places where id=any(${existing.map(x=>x.place_id)}::uuid[]) and not exists(select from listings where listings.place_id=places.id)`;
   result.removedLegacyListings=existing.length;
  }
  async function insert(entity,table,row){
   const [exists]=await tx.unsafe('select id from '+table+' where id=$1',[row.id]);
   if(exists){
    const [owned]=await tx`select id from skoun_ops.housing_seed_manifest where entity=${entity} and id=${row.id}`;
    if(!owned)throw new Error('Fixture ID collision outside seed manifest: '+entity+'/'+row.id);
    return false; // Reruns preserve dates, counters, host edits, and ledger rows.
   }
   const data=serializable(tx,row);
   await tx`insert into ${tx(table)} ${tx(data,Object.keys(data))}`;
   await tx`insert into skoun_ops.housing_seed_manifest(entity,id) values(${entity},${row.id}) on conflict do nothing`;
   return true;
  }
  await insert('user','users',{id:ownerId,role:'poster',first_name:'Housing',last_name:'Demo',post_credits:99,boost_credits:0,boost_credit_units_version:1,legacy_boost_credit_unit_rate:1200,free_credit_claimed:true});
  const now=new Date(); const future=new Date(now.getTime()+30*86400000); const past=new Date(now.getTime()-86400000);
  for(const fixture of housingFixtures){
   const [campus]=await tx`select id from universities where slug=${fixture.campus}`;
   if(!campus)throw new Error('Seed campuses first; missing '+fixture.campus);
   const placeId=fixtureId('place/'+fixture.key);
   const shared={...sharedDefaults,...fixture.shared,area:fixture.area,address_line:fixture.address,building_name:'Demo '+fixture.key,landmark:null,primary_campus_id:campus.id,location:`SRID=4326;POINT(${fixture.lng} ${fixture.lat})`};
   if(await insert('place','places',{id:placeId,owner_id:ownerId,kind:fixture.kind,city:fixture.city,...shared}))result.places++;
   for(const [i,asset]of ['shared-facade','shared-kitchen'].entries()){
    if(await insert('place_photo','place_photos',{id:fixtureId('place-photo/'+fixture.key+'/'+i),place_id:placeId,url:photo(asset),caption:i?'Shared kitchen · demo illustration':'Facade · demo illustration',sort_order:i}))result.placePhotos++;
   }
   for(const unit of fixture.units){
    const id=fixtureId('unit/'+fixture.key+'/'+unit.key);
    const isBed=unit.type==='shared_bed';const isRoom=unit.type==='private_room';
    const row={id,poster_id:ownerId,place_id:placeId,unit_type:unit.type,listing_type:isBed?'shared_dorm_bed':isRoom?'private_room':'entire_apartment',
     space_type:isBed?'shared_room':isRoom?'private_room':'entire_place',property_type:isBed?'dormitory':'apartment',
     price_basis:isBed?'per_bed_month':isRoom?'per_room_month':'per_unit_month',
     status:'active',availability:unit.availability??'available',monthly_rent_usd:unit.rent,security_deposit_usd:unit.rent,
     ...shared,place_overrides:unit.overrides??{},unit_amenities:unit.amenities??['study_desk','ac_all_rooms'],
     gender_restriction:unit.gender==='female_only'?'girls_only':unit.gender==='male_only'?'boys_only':'anyone',
     beds:unit.beds,beds_total:isBed?unit.beds:null,beds_available:isBed?unit.available:null,
     bedrooms:unit.bedrooms,bathrooms:unit.bathrooms,bathroom_privacy:unit.privacy,max_occupancy:unit.beds,
     floor_number:unit.floor,area_sqm:unit.size,furnishing_type:'furnished',title:unit.title,
     description:'Local demo housing fixture. Bundled illustrations; no booking or payment service.',
     contact_name:'Demo host',contact_phone:null,whatsapp_number:null,contact_numbers:[],
     lease_term:'flexible',payment_modality:'monthly',available_from:now.toISOString().slice(0,10),
     published_at:unit.expired?new Date(now.getTime()-31*86400000):now,expires_at:unit.expired?past:future};
    if(await insert('listing','listings',row))result.units++;
    for(const [i,asset]of ['unit-bedroom','unit-living','unit-detail'].entries()){
     if(await insert('listing_photo','listing_photos',{id:fixtureId('unit-photo/'+fixture.key+'/'+unit.key+'/'+i),listing_id:id,url:photo(asset),caption:['Bedroom','Living area','Study area'][i]+' · demo illustration',sort_order:i}))result.unitPhotos++;
    }
    if(unit.promotion){
     // Nonproduction fixtures use explicit demo grants and charges. This does
     // not enable sales/placement or alter a real user's wallet.
     const campaign=fixtureId('promotion/'+fixture.key+'/'+unit.key);
     const creditUnits=unit.promotion==='featured'?1200:200;
     const [slot]=await tx`select n from generate_series(1,3) n where not exists(select from promotion_campaigns where market_key=${'area:'+fixture.area} and slot_index=n and status='active' and type='featured') order by n limit 1`;
     const [alreadySeeded]=await tx`select id from promotion_campaigns where id=${campaign}`;
     if(!alreadySeeded && unit.promotion==='featured' && !slot)throw new Error('No free demo Featured slot in '+fixture.area);
     if(await insert('promotion','promotion_campaigns',{
      id:campaign,owner_id:ownerId,listing_id:id,listing_id_snapshot:id,listing_title:unit.title,listing_published_at:now,
      type:unit.promotion,product_id:unit.promotion+'_7',catalog_version:'housing-fixture-v1',duration_days:7,
      credit_units:creditUnits,spent_units:creditUnits,refunded_units:0,status:'active',market_key:'area:'+fixture.area,market_label:fixture.area,
      slot_index:unit.promotion==='featured'?(slot?.n??1):null,
      remaining_seconds:7*86400,started_at:now,active_since:now,ends_at:new Date(now.getTime()+7*86400000),auto_renew:false,
      last_bumped_at:unit.promotion==='bump'?now:null,next_bump_at:unit.promotion==='bump'?new Date(now.getTime()+86400000):null,
      idempotency_key:'housing-fixture/'+campaign,
     })){
      result.promotions++;
      await insert('promotion_interval','promotion_service_intervals',{id:fixtureId('interval/'+campaign),campaign_id:campaign,started_at:now});
      for(const [reason,delta] of [['demo_grant',creditUnits],['demo_charge',-creditUnits]])
       await insert('promotion_ledger','promotion_wallet_ledger',{id:fixtureId(reason+'/'+campaign),user_id:ownerId,campaign_id:campaign,operation_key:reason+'/'+campaign,delta_units:delta,reason});
     }
    }
   }
  }
  result.preservedNonManifestListings=Number((await tx`select count(*) n from listings l where not exists(select from skoun_ops.housing_seed_manifest m where m.entity='listing' and m.id=l.id)`)[0].n);
  return result;
 });
}


import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

export const foundationTags = ['0031_places_foundation','0032_places_backfill_resolver','0033_place_route_bridge'];
export const legacyColumns = JSON.parse(await readFile(new URL('./legacy-columns.json',import.meta.url),'utf8'));
const journal = JSON.parse(await readFile(new URL('../../drizzle/meta/_journal.json',import.meta.url),'utf8'));
const quote = value => '"' + value.replaceAll('"','""') + '"';
export const legacyProjection = (alias='l') => legacyColumns.map(c=>`${alias}.${quote(c.column_name)}`).join(',');

// All probes run inside one REPEATABLE READ READ ONLY transaction. This function
// performs no DDL, temporary writes, sequence calls, repairs, or migration work.
export async function preflight(client) {
 return client.begin('isolation level repeatable read read only',async tx=>{
  const report={readOnly:true,blockers:[],warnings:[],counts:{},resolver:null,routes:null,ledger:{}};
  const [mode]=await tx`show transaction_read_only`;
  if(mode.transaction_read_only!=='on') throw new Error('Read-only transaction required');
  const [objects]=await tx`select to_regclass('public.listings')::text listings,to_regclass('public.places')::text places,to_regclass('public.listing_resolved')::text resolver,to_regclass('drizzle.__drizzle_migrations')::text ledger`;
  if(!objects.listings){report.blockers.push('Missing listings table');return report;}
  const cols=await tx`select column_name,udt_name,is_nullable from information_schema.columns where table_schema='public' and table_name='listings'`;
  for(const expected of legacyColumns){
   const actual=cols.find(c=>c.column_name===expected.column_name);
   // Two audited histories exist locally: an early property_type enum and
   // nullable contact/description columns. Neither is rewritten by foundation.
   const types=expected.column_name==='property_type'?['property_type','listing_property_type']:[expected.udt_name];
   const nullability=['description','contact_name'].includes(expected.column_name)?['YES','NO']:[expected.is_nullable];
   if(!actual || !types.includes(actual.udt_name) || !nullability.includes(actual.is_nullable))
    report.blockers.push('Legacy schema mismatch: '+expected.column_name);
  }
  if(report.blockers.length)return report;
  const [counts]=await tx`select count(*)::int listings,count(*) filter(where listing_type='shared_dorm_bed')::int legacy_shared_beds,
   count(*) filter(where monthly_rent_usd<=0)::int invalid_prices,
   count(*) filter(where listing_type='shared_dorm_bed' and beds<1)::int invalid_beds,
   count(*) filter(where status='active' and location is null)::int active_missing_pin,
   count(*) filter(where location is not null and (st_x(location::geometry) not between -180 and 180 or st_y(location::geometry) not between -90 and 90))::int invalid_pins
   from listings`;
  report.counts={...counts};
  for(const key of ['invalid_prices','invalid_beds','active_missing_pin','invalid_pins'])if(counts[key])report.blockers.push(key+': '+counts[key]);
  report.counts.photos=Number((await tx`select count(*) n from listing_photos`)[0].n);
  report.counts.legacy_routes=Number((await tx`select count(*) n from listing_campus_routes`)[0].n);
  const badRoutes=await tx`select id from listing_campus_routes where distance_m<0 or duration_s<0 or jsonb_typeof(coords)<>'array' or jsonb_array_length(coords)<2`;
  if(badRoutes.length)report.blockers.push('Invalid route cache rows: '+badRoutes.length);
  if(!objects.ledger)report.blockers.push('Missing migration ledger');
  else {
   const ledger=await tx`select hash,created_at from drizzle.__drizzle_migrations order by created_at`;
   const known=[];
   for(const entry of journal.entries){
    const body=await readFile(new URL('../../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8');
    const hash=createHash('sha256').update(body).digest('hex');
    known.push(hash);
    const atTime=ledger.find(r=>Number(r.created_at)===entry.when);
    if(atTime && atTime.hash!==hash)report.blockers.push('Migration checksum mismatch: '+entry.tag);
   }
   report.ledger={entries:ledger.length,recognized:ledger.filter(x=>known.includes(x.hash)).length,unrecognized:ledger.filter(x=>!known.includes(x.hash)).length};
   if(report.ledger.unrecognized)report.warnings.push('Historical migration ledger differs from repository; legacy schema contract checked; no old migrations will be replayed.');
   const hash=createHash('sha256').update(await readFile(new URL('../../drizzle/0030_promotions.sql',import.meta.url))).digest('hex');
   if(!ledger.some(x=>x.hash===hash))report.blockers.push('0030_promotions must be applied before foundation');
   if(ledger.some(x=>Number(x.created_at)>journal.entries.at(-1).when))report.blockers.push('Database contains later migrations than this checkout');
  }
  const unvalidated=await tx`select conname from pg_constraint where conrelid='public.listings'::regclass and not convalidated`;
  if(unvalidated.length)report.blockers.push('Unvalidated listing constraints: '+unvalidated.map(x=>x.conname).join(','));
  if(objects.places){
   const [linked]=await tx`select count(distinct l.place_id)::int linked_places,count(*) filter(where p.id is null or p.owner_id<>l.poster_id)::int broken_links,count(*) filter(where l.inventory_needs_confirmation)::int unknown_bed_inventory from listings l left join places p on p.id=l.place_id`;
   Object.assign(report.counts,linked);
   if(linked.broken_links)report.blockers.push('Missing or mismatched place owner links');
   if(!objects.resolver)report.blockers.push('Missing listing_resolved view');
   else {
    const [parity]=await tx.unsafe(`select count(*)::int compared,count(*) filter(where to_jsonb(old) is distinct from to_jsonb(resolved))::int mismatches from (select ${legacyProjection()} from listings l) old full join (select ${legacyProjection('r')} from listing_resolved r) resolved using(id)`);
    report.resolver=parity;
    if(parity.mismatches)report.blockers.push('Resolver differs from legacy reads: '+parity.mismatches);
   }
   const [routes]=await tx`select count(*)::int compared,count(*) filter(where p.id is null or (r.listing_lng,r.listing_lat,r.campus_lng,r.campus_lat,r.distance_m,r.duration_s,r.coords) is distinct from (p.place_lng,p.place_lat,p.campus_lng,p.campus_lat,p.distance_m,p.duration_s,p.coords))::int mismatches from listing_campus_routes r join listings l on l.id=r.listing_id left join place_campus_routes p on p.place_id=l.place_id and p.campus_id=r.campus_id and p.profile=r.profile`;
   report.routes=routes;
   if(routes.mismatches)report.blockers.push('Legacy/place route cache mismatch: '+routes.mismatches);
   if(linked.unknown_bed_inventory)report.warnings.push(linked.unknown_bed_inventory+' shared-bed listings need host confirmation before slice 2 inventory is enabled.');
  }else {
   report.counts.planned_places=counts.listings;
   report.counts.planned_route_copies=report.counts.legacy_routes;
   if(counts.legacy_shared_beds)report.warnings.push(counts.legacy_shared_beds+' legacy shared-bed counts will remain unknown; no vacancy is inferred.');
  }
  return report;
 });
}

// Fingerprint every original listing column and every table with a listing FK.
// Includes IDs, counters, all dates, photos, lifecycle, wallets/campaign links.
// No row data or credentials is written to the report.
export async function snapshot(tx){
 const result={};
 const listingRows=await tx.unsafe(`select md5(coalesce(jsonb_agg(to_jsonb(x) order by id)::text,'[]')) digest,count(*)::int count from (select ${legacyProjection()} from listings l) x`);
 result.listings=listingRows[0];
 const refs=await tx`select distinct n.nspname schema,c.relname name from pg_constraint f join pg_class c on c.oid=f.conrelid join pg_namespace n on n.oid=c.relnamespace where f.contype='f' and f.confrelid='public.listings'::regclass order by 1,2`;
 for(const r of refs){
  const [digest]=await tx.unsafe(`select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'[]')) digest,count(*)::int count from ${quote(r.schema)}.${quote(r.name)} t`);
  result[r.schema+'.'+r.name]=digest;
 }
 return result;
}

export async function applyFoundation(client){
 const report=await preflight(client);
 if(report.blockers.length)throw new Error('Preflight blocked: '+report.blockers.join('; '));
 return client.begin(async tx=>{
  await tx`set local lock_timeout='10s'`;
  await tx`select pg_advisory_xact_lock(183710,1)`;
  // Freeze legacy writes during the snapshot and backfill; reads keep working.
  await tx`lock table listings in share row exclusive mode`;
  const before=await snapshot(tx);
  for(const tag of foundationTags){
   const entry=journal.entries.find(x=>x.tag===tag);
   const body=await readFile(new URL('../../drizzle/'+tag+'.sql',import.meta.url),'utf8');
   const hash=createHash('sha256').update(body).digest('hex');
   const [done]=await tx`select id from drizzle.__drizzle_migrations where hash=${hash}`;
   if(done)continue;
   for(const statement of body.split('--> statement-breakpoint'))await tx.unsafe(statement);
   await tx`insert into drizzle.__drizzle_migrations(hash,created_at) values(${hash},${entry.when})`;
  }
  const after=await snapshot(tx);
  if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Backfill changed legacy listing data or a referencing table; rolling back');
  return {before,after,legacyDataUnchanged:true};
 });
}


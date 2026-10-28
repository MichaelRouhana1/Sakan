import { deriveListingType } from './deriveListingType.js';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { sql, eq, asc, getTableColumns } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { places, placePhotos } from '../../db/schema/places.js';
import { ConflictError, NotFoundError, ValidationError } from '../../lib/errors.js';
import { FREE_SLOT_REPLACEMENTS_PER_MONTH } from '../../constants/listings.js';
import { promotionLock } from '../promotions/promotions.service.js';
import { listingsRepository } from './listings.repository.js';
import { createListingSchema, sharedDetailsSchema } from './listings.schemas.js';
import { locationFields, sharedFields, sharedSqlValues } from './place-fields.js';
import { settlePlaceInventory } from './inventory.service.js';

const fieldKeys = [...Object.keys(sharedFields), 'amenities'] as unknown as [string, ...string[]];
export const sharedPhotoSchema = z.object({url:z.string().max(2048).refine(v=>/^https?:\/\//.test(v)||v.startsWith('/uploads/')),caption:z.string().max(48).default('')});
export const publishUnitsSchema = z.object({
 expectedTotal:z.number().int().min(0).max(20), requestId:z.uuid(), placeId:z.uuid().optional(), kind:z.enum(['apartment','building']),
 shared:sharedDetailsSchema, sharedPhotos:z.array(sharedPhotoSchema).max(15),
 units:z.array(z.object({details:createListingSchema, differentFields:z.array(z.enum(fieldKeys)).max(fieldKeys.length).default([]),
  bathroomPrivacy:z.enum(['private','shared']), bedsAvailable:z.number().int().min(1).max(20).optional(),
 })).min(1).max(20),
});
export type PublishUnitsInput = z.infer<typeof publishUnitsSchema>;
export type PublishedBatch = {placeId:string;listingIds:string[];credits:number[];total:number};

export async function publishedBatch(ownerId:string,requestId:string):Promise<PublishedBatch|null>{
 const [receipt]=await db.execute(sql`SELECT result FROM unit_publish_batches WHERE owner_id=${ownerId}::uuid AND request_id=${requestId}::uuid`);
 return receipt ? receipt.result as PublishedBatch : null;
}

export async function ownerPlace(ownerId:string, placeId:string) {
 const [place] = await db.select({...getTableColumns(places), location:sql<string>`ST_AsText(location::geometry)`,
  lng:sql<number>`ST_X(location::geometry)`,lat:sql<number>`ST_Y(location::geometry)`}).from(places)
  .where(sql`${places.id}=${placeId}::uuid AND ${places.ownerId}=${ownerId}::uuid`);
 if(!place)throw new NotFoundError('Apartment or building not found');
 const photos=await db.select().from(placePhotos).where(eq(placePhotos.placeId,placeId)).orderBy(asc(placePhotos.sortOrder));
 return {...place,elevator24_7:place.elevator247,photos};
}

export async function publishQuote(ownerId:string,count:number) {
 const [owner] = await db.execute(sql`SELECT post_credits,free_slot_publishes_month_key,free_slot_publishes_month,
  (SELECT count(*) FROM listings WHERE poster_id=${ownerId}::uuid AND status='active') AS active FROM users WHERE id=${ownerId}::uuid`);
 if(!owner)throw new NotFoundError('User not found');
 const month=new Date().toISOString().slice(0,7);
 const used=owner.free_slot_publishes_month_key===month?Number(owner.free_slot_publishes_month):0;
 const free=Number(owner.active)===0 && used<FREE_SLOT_REPLACEMENTS_PER_MONTH;
 const units=Array.from({length:count},(_,i)=>({index:i,credits:i===0&&free?0:1}));
 return {units,total:units.reduce((n,u)=>n+u.credits,0),balance:Number(owner.post_credits)};
}

export async function publishUnits(ownerId:string,input:PublishUnitsInput) {
 const hash=createHash('sha256').update(JSON.stringify({...input,expectedTotal:undefined})).digest('hex');
 return db.transaction(async tx=>{
  await promotionLock(tx);
  await tx.execute(sql`SELECT id FROM users WHERE id=${ownerId}::uuid FOR UPDATE`);
  const [prior]=await tx.execute(sql`SELECT * FROM unit_publish_batches WHERE owner_id=${ownerId}::uuid AND request_id=${input.requestId}::uuid`);
  if(prior){
   if(prior.request_hash!==hash)throw new ConflictError('This publish request was already used. Refresh your dashboard.');
   return prior.result as {placeId:string;listingIds:string[];credits:number[];total:number};
  }
  let placeId=input.placeId;
  let place:Record<string,unknown>;
  if(placeId){
   const [owned]=await tx.execute(sql`SELECT *,ST_AsText(location::geometry) AS location_wkt FROM places WHERE id=${placeId}::uuid AND owner_id=${ownerId}::uuid FOR UPDATE`);
   if(!owned)throw new NotFoundError('Apartment or building not found');
   place=owned;
  }else{
   const shared=sharedSqlValues(input.shared);
   const [created]=await tx.execute(sql`INSERT INTO places(owner_id,kind,area,location,electricity,water)
    VALUES(${ownerId}::uuid,${input.kind}::place_kind,${input.shared.area},ST_GeogFromText(${input.shared.locationWkt}),${input.shared.electricity}::electricity_status,${input.shared.water}::water_status) RETURNING id`);
   placeId=String(created!.id);
   const values={...shared,...Object.fromEntries(Object.entries(locationFields).map(([key,col])=>[col,input.shared[key as keyof typeof input.shared]??null])),amenities:input.shared.amenities};
   // jsonb_populate_record applies the database's existing enum/field types.
   const columns=Object.keys(values);
   await tx.execute(sql`UPDATE places p SET (${sql.join(columns.map(c=>sql.identifier(c)),sql`,`)}) =
    (SELECT ${sql.join(columns.map(c=>sql.identifier(c)),sql`, `)} FROM jsonb_populate_record(NULL::places,${JSON.stringify(values)}::jsonb)) WHERE id=${placeId}::uuid`);
   if(input.sharedPhotos.length)await tx.insert(placePhotos).values(input.sharedPhotos.map((p,i)=>({placeId:placeId!,url:p.url,caption:p.caption,sortOrder:i})));
   const [createdPlace]=await tx.execute(sql`SELECT *,ST_AsText(location::geometry) AS location_wkt FROM places WHERE id=${placeId}::uuid`);
   place=createdPlace!;
  }
  const listingIds:string[]=[];
  const credits:number[]=[];
  for(const unit of input.units){
   const effective:Record<string,unknown>={...unit.details,locationWkt:place.location_wkt,publishNow:true};
   for(const [key,col] of Object.entries(locationFields))effective[key]=place[col]??undefined;
   for(const [key,col] of Object.entries(sharedFields))if(!unit.differentFields.includes(key))effective[key]=place[col];
   if(!unit.differentFields.includes('amenities'))effective.amenities=place.amenities;
   effective.listingType=deriveListingType(unit.details.spaceType,unit.details.propertyType);
   const details=createListingSchema.parse(effective);
   if(place.kind==='building' && details.spaceType!=='entire_place')throw new ValidationError('A building contains whole apartments. Add rooms to an apartment.');
   if(details.spaceType==='shared_room' && (unit.bedsAvailable==null||unit.bedsAvailable>details.beds))throw new ValidationError('Confirm available beds between 1 and the total bed count');
   const sqlValues=sharedSqlValues(details);
   const overrides=Object.fromEntries(Object.entries(sharedFields).filter(([key,col])=>unit.differentFields.includes(key) && JSON.stringify(sqlValues[col] ?? null)!==JSON.stringify(place[col] ?? null)).map(([,col])=>[col,sqlValues[col]]));
   const placeAmenities=Array.isArray(place.amenities)?place.amenities as string[]:[];
   const customAmenities=unit.differentFields.includes('amenities') && JSON.stringify([...(details.amenities??[])].sort())!==JSON.stringify([...placeAmenities].sort());
   const id=await listingsRepository.insertUnit(tx,ownerId,details,{placeId,placeOverrides:overrides,
    unitAmenities:customAmenities?details.amenities:[],amenityOverrides:customAmenities?Object.fromEntries((place.amenities as string[]).filter(a=>!details.amenities.includes(a)).map(a=>[a,false])):{},
    bathroomPrivacy:unit.bathroomPrivacy,bedsTotal:details.spaceType==='shared_room'?details.beds:null,
    bedsAvailable:details.spaceType==='shared_room'?unit.bedsAvailable:null});
   if(!id)throw new Error('Unit creation failed');
   listingIds.push(id);
   const [charge]=await tx.execute(sql`SELECT credits FROM listing_charge_ledger WHERE operation_key=${'publish:'+id}`);
   credits.push(Number(charge!.credits));
  }
  if(credits.reduce((a,b)=>a+b,0)!==input.expectedTotal)throw new ConflictError('Your credit total changed. Review the updated total and publish again.');
  await settlePlaceInventory(tx,placeId!);
  const result={placeId:placeId!,listingIds,credits,total:credits.reduce((a,b)=>a+b,0)};
  await tx.execute(sql`INSERT INTO unit_publish_batches(owner_id,request_id,request_hash,result) VALUES(${ownerId}::uuid,${input.requestId}::uuid,${hash},${JSON.stringify(result)}::jsonb)`);
  return result;
 });
}

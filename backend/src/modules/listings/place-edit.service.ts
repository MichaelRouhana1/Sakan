import { z } from 'zod';
import { sql, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { placePhotos } from '../../db/schema/places.js';
import { ConflictError, NotFoundError, StructuralFieldsLockedError } from '../../lib/errors.js';
import { promotionLock } from '../promotions/promotions.service.js';
import { sharedDetailsSchema } from './listings.schemas.js';
import { sharedPhotoSchema, ownerPlace } from './unit-publish.service.js';
import { locationFields, sharedSqlValues } from './place-fields.js';
import { settlePlaceInventory } from './inventory.service.js';

export const editPlaceSchema=z.object({details:sharedDetailsSchema,photos:z.array(sharedPhotoSchema).max(15),expectedUpdatedAt:z.string().datetime()});
export async function editPlace(ownerId:string,id:string,input:z.infer<typeof editPlaceSchema>){
 await db.transaction(async tx=>{
  await promotionLock(tx);
  const [place]=await tx.execute(sql`SELECT *,ST_AsText(location::geometry) AS location_wkt FROM places WHERE id=${id}::uuid AND owner_id=${ownerId}::uuid FOR UPDATE`);
  if(!place)throw new NotFoundError('Apartment or building not found');
  if(new Date(String(place.updated_at)).toISOString()!==input.expectedUpdatedAt)throw new ConflictError('Shared details changed. Refresh before saving.');
  const details=input.details;
  const values:Record<string,unknown>={...sharedSqlValues(details),...Object.fromEntries(Object.entries(locationFields).map(([key,col])=>[col,details[key as keyof typeof details]??null])),amenities:details.amenities};
  const hard=Object.values(locationFields).filter(col=>JSON.stringify(place[col]??null)!==JSON.stringify(values[col]??null));
  const [moved]=await tx.execute(sql`SELECT NOT ST_Equals(location::geometry,ST_GeomFromText(${details.locationWkt},4326)) AS moved FROM places WHERE id=${id}::uuid`);
  if(moved?.moved)hard.push('location' as typeof hard[number]);
  if(place.target_audience!==details.targetAudience)hard.push('target_audience' as typeof hard[number]);
  if(hard.length){
   const locked=await tx.execute(sql`SELECT id FROM listings WHERE place_id=${id}::uuid AND published_at IS NOT NULL AND published_at<=now()-interval '24 hours'`);
   if(locked.length)throw new StructuralFieldsLockedError(hard);
  }
  const columns=Object.keys(values);
  await tx.execute(sql`UPDATE places SET (${sql.join(columns.map(c=>sql.identifier(c)),sql`,`)})=
   (SELECT ${sql.join(columns.map(c=>sql.identifier(c)),sql`, `)} FROM jsonb_populate_record(NULL::places,${JSON.stringify(values)}::jsonb)),
   location=ST_GeogFromText(${details.locationWkt}),updated_at=now() WHERE id=${id}::uuid`);
  await tx.delete(placePhotos).where(eq(placePhotos.placeId,id));
  if(input.photos.length)await tx.insert(placePhotos).values(input.photos.map((p,i)=>({placeId:id,url:p.url,caption:p.caption,sortOrder:i})));
  await settlePlaceInventory(tx,id);
 });
 return ownerPlace(ownerId,id);
}

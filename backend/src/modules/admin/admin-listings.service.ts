import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { listings, listingPhotos, listingReports, users, adminAuditEvents } from '../../db/schema/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../lib/errors.js';
import { promotionLock, stopListingPromotions } from '../promotions/promotions.service.js';
import { lockInventory, settlePlaceInventory, changeUnitInventory, inventorySchema } from '../listings/inventory.service.js';
import { listingPublicColumns } from '../listings/listings.repository.js';
import { writeAudit, type AuditActor } from './admin.audit.js';
import { snapshotFromRow } from '../listings/listing-update-snapshot.js';
import { recordListingUpdateAudit } from '../listings/listing-update-audit.js';
import type { PromotionWalletTransaction as Tx } from '../credits/promotion-wallet.js';

export const adminInventoryQuery = z.object({
 q:z.string().max(200).optional(), queue:z.enum(['all','active','flagged','draft','archived','removed']).default('all'),
 sort:z.enum(['publishedAt','expiresAt','rent','flags']).default('publishedAt'),
 page:z.coerce.number().int().min(1).max(100000).default(1),pageSize:z.coerce.number().int().min(1).max(100).default(10),
});
const note = z.string().trim().min(1).max(2000);
const editPatch = z.object({
 title:z.string().trim().min(1).max(256),description:z.string().max(10000),area:z.string().trim().min(1).max(128),
 landmark:z.string().max(256),monthlyRentUsd:z.number().int().positive(),
 listingType:z.enum(['studio','entire_apartment','private_room','shared_dorm_bed']),
 contactName:z.string().max(128),contactPhone:z.string().max(32),whatsappNumber:z.string().max(32),
 electricity:z.enum(['solar','generator_24_7','scheduled_cuts']),water:z.enum(['state_well_24_7','tank_delivery']),
 wifiIncluded:z.boolean(),bedrooms:z.number().int().min(0).max(100),bathrooms:z.number().int().min(0).max(100),
}).strict();
export const adminListingAction = z.discriminatedUnion('kind',[
 z.object({kind:z.enum(['archive','remove','restore','dismiss_reports']),adminNote:note}),
 z.object({kind:z.literal('edit'),adminNote:note,patch:editPatch}),
 z.object({kind:z.literal('photo'),adminNote:note,photoId:z.uuid(),flagged:z.boolean()}),
 z.object({kind:z.literal('inventory'),adminNote:note,inventory:inventorySchema}),
]);
export const adminListingBulk = z.object({ids:z.array(z.uuid()).min(1).max(100),kind:z.enum(['archive','remove','dismiss_reports']),adminNote:note});

export async function adminListingDetail(id: string, tx: Tx = db as unknown as Tx) {
 const [row] = await tx.select({...listingPublicColumns,poster:{id:users.id,firstName:users.firstName,lastName:users.lastName,email:users.email}})
  .from(listings).innerJoin(users,eq(users.id,listings.posterId)).where(eq(listings.id,id));
 if (!row) throw new NotFoundError('Listing not found');
 const photos = await tx.select().from(listingPhotos).where(eq(listingPhotos.listingId,id)).orderBy(asc(listingPhotos.sortOrder),asc(listingPhotos.id));
 const reports = await tx.select({id:listingReports.id,reason:listingReports.reason,at:listingReports.createdAt}).from(listingReports)
  .where(and(eq(listingReports.listingId,id),eq(listingReports.status,'open'))).orderBy(desc(listingReports.createdAt));
 const history = await tx.select().from(adminAuditEvents).where(and(eq(adminAuditEvents.entityType,'listing'),eq(adminAuditEvents.entityId,id))).orderBy(desc(adminAuditEvents.createdAt)).limit(100);
 return {...row,description:row.description??'',landmark:row.landmark??'',contactName:row.contactName??'',contactPhone:row.contactPhone??'',whatsappNumber:row.whatsappNumber??'',
  poster:{...row.poster,firstName:row.poster.firstName??'',lastName:row.poster.lastName??'',email:row.poster.email??''},
  photos:photos.map(p=>({...p,caption:p.caption??''})),openReports:reports,
  moderationHistory:history.filter(h=>h.action!=='listing.update').map(h=>({id:h.id,kind:h.action==='report.dismiss'?'dismiss_reports':h.action.replace('listing.',''),note:String(h.payload.adminNote??''),at:h.createdAt,actor:h.actorClerkId??h.actorKind}))};
}

export async function adminInventoryList(query: z.infer<typeof adminInventoryQuery>) {
 return db.transaction(async tx => {
 const term = query.q?.trim();
 const match = term ? sql`(l.title ILIKE ${'%'+term+'%'} OR l.area ILIKE ${'%'+term+'%'} OR u.email ILIKE ${'%'+term+'%'} OR l.id::text=${term})` : sql`true`;
 const queue = sql`CASE WHEN l.status='removed' THEN 'removed' WHEN l.status='draft' THEN 'draft'
  WHEN EXISTS(SELECT 1 FROM listing_reports r WHERE r.listing_id=l.id AND r.status='open') THEN 'flagged'
  WHEN l.status='archived' THEN 'archived' ELSE 'active' END`;
 const grouped = await tx.execute(sql`SELECT ${queue} AS queue,count(*)::int AS n FROM listings l JOIN users u ON u.id=l.poster_id WHERE ${match} GROUP BY 1`);
 const counts:Record<string,number> = {all:0,active:0,flagged:0,draft:0,archived:0,removed:0};
 for (const r of grouped) {counts[String(r.queue)]=Number(r.n);counts.all!+=Number(r.n);}
 const ordering = {publishedAt:sql`l.published_at DESC NULLS LAST`,expiresAt:sql`l.expires_at ASC NULLS LAST`,rent:sql`l.monthly_rent_usd ASC`,flags:sql`(SELECT count(*) FROM listing_reports r WHERE r.listing_id=l.id AND r.status='open') DESC`}[query.sort];
 const ids = await tx.execute(sql`SELECT l.id FROM listings l JOIN users u ON u.id=l.poster_id WHERE ${match}
  AND (${query.queue}='all' OR ${queue}=${query.queue}) ORDER BY ${ordering},l.id LIMIT ${query.pageSize} OFFSET ${(query.page-1)*query.pageSize}`);
 const items=[];
 for (const row of ids) items.push(await adminListingDetail(String(row.id),tx));
 return {items,counts,total:counts[query.queue],page:query.page,pageSize:query.pageSize};
 },{isolationLevel:'repeatable read',accessMode:'read only'});
}

async function mutate(tx:Tx,id:string,input:z.infer<typeof adminListingAction>,actor:AuditActor) {
 const unit=await lockInventory(tx,id);
 let action: string=input.kind;
 if (input.kind==='inventory') await changeUnitInventory(tx,id,input.inventory);
 else if (input.kind==='edit') {
  if(unit.status==='removed') throw new ConflictError('Restore access before editing a removed listing');
  // Structural conversion needs the later unit editor; do not silently discard occupancy.
  if(input.patch.listingType!==unit.listing_type) throw new ValidationError('Unit type cannot change in this editor');
  const before=await adminListingDetail(id,tx);
  await tx.update(listings).set({...input.patch,landmark:input.patch.landmark || null,updatedAt:new Date()}).where(eq(listings.id,id));
  const after=await adminListingDetail(id,tx);
  await recordListingUpdateAudit({actor,listingId:id,channel:'admin_patch',publishedAt:before.publishedAt,before:snapshotFromRow(before),after:snapshotFromRow(after)},tx);
 } else if(input.kind==='photo') {
  const rows=await tx.update(listingPhotos).set({flagged:input.flagged}).where(and(eq(listingPhotos.id,input.photoId),eq(listingPhotos.listingId,id))).returning({id:listingPhotos.id});
  if(!rows.length) throw new NotFoundError('Photo not found');
  action=input.flagged?'flag_photo':'clear_photo_flag';
 } else if(input.kind==='dismiss_reports') {
  await tx.update(listingReports).set({status:'dismissed',reviewedAt:new Date()}).where(and(eq(listingReports.listingId,id),eq(listingReports.status,'open')));
 } else {
  const next={archive:'archived',remove:'removed',restore:'active'}[input.kind] as 'archived'|'removed'|'active';
  if(input.kind==='archive' && unit.status!=='active') throw new ConflictError('Only live units can be archived');
  if(input.kind==='remove' && unit.status==='draft') throw new ConflictError('Draft units cannot be taken down');
  if(input.kind==='restore' && unit.status!=='archived') throw new ConflictError('Only archived units can be restored');
  // Restore preserves vacancy and original expiry; it is not a free renewal.
  await tx.update(listings).set({status:next,updatedAt:new Date()}).where(eq(listings.id,id));
  if(next!=='active') {
   await stopListingPromotions(tx,id,'listing_'+next);
   await tx.update(listingReports).set({status:'actioned',reviewedAt:new Date()}).where(and(eq(listingReports.listingId,id),eq(listingReports.status,'open')));
  }
 }
 const current = await lockInventory(tx,id);
 await settlePlaceInventory(tx,String(current.place_id));
 if (current.place_id !== unit.place_id) await settlePlaceInventory(tx,String(unit.place_id));
 await writeAudit(actor,'listing.'+action,'listing',id,{...input},tx);
 return adminListingDetail(id,tx);
}
export async function adminMutateListing(id:string,input:z.infer<typeof adminListingAction>,actor:AuditActor) {
 return db.transaction(async tx=>{await promotionLock(tx);return mutate(tx,id,input,actor)});
}
export async function adminBulkListings(input:z.infer<typeof adminListingBulk>,actor:AuditActor) {
 return db.transaction(async tx=>{
  await promotionLock(tx);const result=[];
  for(const id of [...new Set(input.ids)].sort()) result.push(await mutate(tx,id,{kind:input.kind,adminNote:input.adminNote},actor));
  return result;
 });
}

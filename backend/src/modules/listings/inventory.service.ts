import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../lib/errors.js';
import { promotionLock, recheckListingPromotions } from '../promotions/promotions.service.js';
import type { PromotionWalletTransaction as Tx } from '../credits/promotion-wallet.js';
import { writeAudit, type AuditActor } from '../admin/admin.audit.js';

export const inventorySchema = z.object({
 expectedVersion: z.number().int().nonnegative(),
 hidden: z.boolean().optional(),
 availability: z.enum(['available','pending','rented']).optional(),
 bedsTotal: z.number().int().min(1).max(10000).optional(),
 bedsAvailable: z.number().int().min(0).max(10000).optional(),
 bedAction: z.enum(['rent_one','free_one']).optional(),
 genderRestriction: z.enum(['anyone','girls_only','boys_only']).optional(),
}).strict().refine(v => Object.keys(v).length > 1, 'Choose an inventory change');
export type InventoryInput = z.infer<typeof inventorySchema>;

/** All writers take promotionLock first, then place/units, then wallet locks. */
export async function lockInventory(tx: Tx, listingId: string, ownerId?: string) {
 const [link] = await tx.execute(sql`SELECT place_id,poster_id FROM listings WHERE id=${listingId}::uuid`);
 if (!link || (ownerId && link.poster_id !== ownerId)) throw new NotFoundError('Listing not found');
 await tx.execute(sql`SELECT id FROM places WHERE id=${link.place_id}::uuid FOR UPDATE`);
 const rows = await tx.execute(sql`SELECT * FROM listings WHERE place_id=${link.place_id}::uuid ORDER BY id FOR UPDATE`);
 return rows.find(row => row.id === listingId)!;
}

/** Validate occupancy and settle every affected campaign in the caller's transaction. */
export async function settlePlaceInventory(tx: Tx, placeId: string) {
 const conflicts = await tx.execute(sql`SELECT a.id FROM listings a JOIN places p ON p.id=a.place_id
  JOIN listings b ON b.place_id=a.place_id AND b.id<>a.id
  WHERE a.place_id=${placeId}::uuid AND p.kind='apartment'
   AND a.unit_type='whole_apartment' AND unit_occupied(a) AND (unit_occupied(b) OR b.inventory_needs_confirmation) LIMIT 1`);
 if (conflicts.length) throw new ConflictError('This apartment already has occupied inventory. Confirm it is vacant before renting another offer.');
 const siblings = await tx.execute(sql`SELECT id FROM listings WHERE place_id=${placeId}::uuid ORDER BY id`);
 for (const row of siblings) await recheckListingPromotions(tx, String(row.id));
}

export async function changeUnitInventory(tx: Tx, listingId: string, input: InventoryInput, ownerId?: string) {
 const unit = await lockInventory(tx, listingId, ownerId);
 if (Number(unit.inventory_version) !== input.expectedVersion) throw new ConflictError('Inventory changed. Refresh before saving.');
 let total = unit.beds_total as number | null;
 let available = unit.beds_available as number | null;
 let availability = input.availability ?? String(unit.availability);
 const bedChange = input.bedsTotal !== undefined || input.bedsAvailable !== undefined || input.bedAction !== undefined;
 if (unit.unit_type !== 'shared_bed' && bedChange) throw new ValidationError('Only shared-bed units have bed inventory');
 if (input.genderRestriction !== undefined && unit.unit_type !== 'shared_bed') throw new ValidationError('Use the listing editor to change this unit’s gender preference');
 if (input.bedAction) {
  if (input.bedsTotal !== undefined || input.bedsAvailable !== undefined || input.availability !== undefined) throw new ValidationError('Choose a bed action or confirm counts, not both');
  if (available === null || unit.inventory_needs_confirmation) throw new ValidationError('Confirm the number of available beds first');
  if (input.bedAction === 'rent_one' && available === 0) throw new ConflictError('There are no available beds to rent');
  if (input.bedAction === 'free_one' && available === total) throw new ConflictError('All beds are already available');
  available += input.bedAction === 'rent_one' ? -1 : 1;
 }
 if (unit.unit_type === 'shared_bed') {
  if (input.bedsTotal !== undefined && input.bedsAvailable === undefined) throw new ValidationError('Confirm available beds when changing the total');
  total = input.bedsTotal ?? total;
  available = input.bedsAvailable ?? available;
  if ((bedChange || input.availability !== undefined) && available === null) throw new ValidationError('Confirm the number of available beds first');
  if (available !== null && (!total || available > total)) throw new ValidationError('Available beds cannot exceed total beds');
  if (input.availability === 'rented' && input.bedsAvailable === undefined) available = 0;
  if (available === 0) {
   if (input.availability && input.availability !== 'rented') throw new ValidationError('Add available beds before reopening this unit');
   availability = 'rented';
  } else if (available !== null && available > 0) {
   if (input.availability === 'rented') throw new ValidationError('A rented unit must have zero available beds');
   if (availability === 'rented') availability = 'available';
  }
 }
 await tx.execute(sql`UPDATE listings SET hidden=${input.hidden ?? unit.hidden},
  gender_restriction=${input.genderRestriction ?? unit.gender_restriction},
  availability=${availability}::listing_availability,beds_total=${total},beds_available=${available},updated_at=now()
  WHERE id=${listingId}::uuid`);
 await settlePlaceInventory(tx, String(unit.place_id));
 return readInventory(tx, listingId);
}

export async function readInventory(tx: Tx, listingId: string, ownerId?: string) {
 const [row] = await tx.execute(sql`SELECT l.id,l.title,l.status,l.place_id AS "placeId",l.unit_type AS "unitType",l.hidden,
  p.hidden AS "placeHidden",l.gender_restriction AS "genderRestriction",
  l.availability,l.beds_total AS "bedsTotal",l.beds_available AS "bedsAvailable",
  l.inventory_needs_confirmation AS "inventoryNeedsConfirmation",l.inventory_version AS "inventoryVersion",
  unit_hidden_reason(l) AS "hiddenReason",
  COALESCE((SELECT jsonb_agg(jsonb_build_object('id',s.id,'title',COALESCE(NULLIF(s.title,''),CASE s.unit_type WHEN 'whole_apartment' THEN 'Whole apartment' WHEN 'shared_bed' THEN 'Shared room' ELSE 'Room' END),
   'inventoryNeedsConfirmation',s.inventory_needs_confirmation) ORDER BY s.id)
   FROM listings s WHERE p.kind='apartment' AND s.place_id=l.place_id AND s.poster_id=l.poster_id AND s.id<>l.id
    AND (unit_occupied(s) OR (l.unit_type='whole_apartment' AND s.inventory_needs_confirmation))
    AND (s.unit_type='whole_apartment' OR l.unit_type='whole_apartment')), '[]'::jsonb) AS blockers
  FROM listings l JOIN places p ON p.id=l.place_id AND p.owner_id=l.poster_id
  WHERE l.id=${listingId}::uuid ${ownerId ? sql`AND l.poster_id=${ownerId}::uuid` : sql``}`);
 if (!row) throw new NotFoundError('Listing not found');
 return row;
}

export async function getOwnerInventory(listingId: string, ownerId: string) {
 return db.transaction(tx => readInventory(tx, listingId, ownerId));
}

export async function updateUnitInventory(listingId: string, input: InventoryInput, ownerId?: string, audit?: {actor: AuditActor; note: string}) {
 const parsed = inventorySchema.parse(input);
 return db.transaction(async tx => {
  await promotionLock(tx);
  const result = await changeUnitInventory(tx, listingId, parsed, ownerId);
  if (audit) await writeAudit(audit.actor,'listing.inventory','listing',listingId,{adminNote:audit.note,...parsed},tx);
  return result;
 });
}

export async function setPlaceHidden(placeId: string, hidden: boolean, ownerId: string) {
 return db.transaction(async tx => {
  await promotionLock(tx);
  const rows = await tx.execute(sql`UPDATE places SET hidden=${hidden},updated_at=now() WHERE id=${placeId}::uuid AND owner_id=${ownerId}::uuid RETURNING id`);
  if (!rows.length) throw new NotFoundError('Place not found');
  await tx.execute(sql`UPDATE listings SET inventory_version=inventory_version+1 WHERE place_id=${placeId}::uuid`);
  await settlePlaceInventory(tx,placeId);
  return {id:placeId,hidden};
 });
}

import { sql } from 'drizzle-orm';
import { FREE_SLOT_REPLACEMENTS_PER_MONTH } from '../../constants/listings.js';
import { ForbiddenError, InsufficientCreditsError, NotFoundError } from '../../lib/errors.js';
import type { PromotionWalletTransaction as Tx } from '../credits/promotion-wallet.js';

export async function chargeUnit(tx: Tx, ownerId: string, listingId: string, reason: 'publish'|'renew', operationKey: string) {
 const [owner] = await tx.execute(sql`SELECT * FROM users WHERE id=${ownerId}::uuid FOR UPDATE`);
 if (!owner) throw new NotFoundError('User not found');
 if (['restricted','banned'].includes(String(owner.account_status))) throw new ForbiddenError('This account cannot publish listings');
 const previous = await tx.execute(sql`SELECT id FROM listing_charge_ledger WHERE operation_key=${operationKey}`);
 if (previous.length) return;
 const month = new Date().toISOString().slice(0,7);
 const used = owner.free_slot_publishes_month_key === month ? Number(owner.free_slot_publishes_month) : 0;
 const [active] = await tx.execute(sql`SELECT count(*)::int AS n FROM listings WHERE poster_id=${ownerId}::uuid AND id<>${listingId}::uuid AND status='active'`);
 // Hidden units still occupy their paid/free publish slot. Charges are never per place.
 const free = reason === 'publish' && Number(active!.n) === 0 && used < FREE_SLOT_REPLACEMENTS_PER_MONTH;
 if (!free && Number(owner.post_credits) < 1) throw new InsufficientCreditsError('One post credit is required for this unit');
 if (free) await tx.execute(sql`UPDATE users SET free_slot_publishes_month_key=${month},free_slot_publishes_month=${used+1},role='poster',updated_at=now() WHERE id=${ownerId}::uuid`);
 else await tx.execute(sql`UPDATE users SET post_credits=post_credits-1,role='poster',updated_at=now() WHERE id=${ownerId}::uuid`);
 await tx.execute(sql`INSERT INTO listing_charge_ledger(owner_id,listing_id,listing_id_snapshot,operation_key,reason,credits)
  VALUES (${ownerId}::uuid,${listingId}::uuid,${listingId}::uuid,${operationKey},${reason},${free?0:1})`);
}

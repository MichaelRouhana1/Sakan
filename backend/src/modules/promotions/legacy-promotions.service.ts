import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { promotionLock } from './promotions.service.js';
import { ensurePromotionWallet } from '../credits/promotion-wallet.js';

export function cutoverLegacyPromotions() {
  return db.transaction(async tx => {
  await promotionLock(tx);
  const rows = await tx.execute(sql`SELECT id,poster_id,boosted_until FROM listings WHERE boosted_until>now() FOR UPDATE`);
  for (const row of rows) {
    const wallet = await ensurePromotionWallet(tx, String(row.poster_id));
    const seconds = Math.max(0, (new Date(String(row.boosted_until)).getTime() - Date.now()) / 1000);
    const units = Math.ceil(wallet.legacyCreditUnitRate * seconds / (7 * 86400));
    const inserted = await tx.execute(sql`INSERT INTO promotion_wallet_ledger(user_id,operation_key,delta_units,reason) VALUES (${row.poster_id}::uuid,${`legacy-placement:${row.id}:${row.boosted_until}`},${units},'legacy_placement_return') ON CONFLICT DO NOTHING RETURNING id`);
    if (inserted.length) await tx.execute(sql`UPDATE users SET boost_credits=boost_credits+${units},updated_at=now() WHERE id=${row.poster_id}::uuid`);
    await tx.execute(sql`UPDATE listings SET boosted_until=NULL WHERE id=${row.id}::uuid`);
  }
  return { convertedPlacements: rows.length };
});
}

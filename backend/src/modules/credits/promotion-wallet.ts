import { eq, sql } from "drizzle-orm";
import type { Database } from "../../db/index.js";
import { adminAuditEvents, users } from "../../db/schema/index.js";
import { NotFoundError } from "../../lib/errors.js";
import { PROMOTION_CREDIT_SCALE } from "../../config/promotion-catalog.js";

export type PromotionWalletTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export function legacyCreditUnits(credits: number, rate: number) {
  const units = credits * rate;
  if (!Number.isSafeInteger(units) || units < 0 || units > 2_147_483_647) throw new Error("Invalid promotion wallet amount");
  return units;
}

/** Lock the wallet before every debit, refund or grant; conversion is once-only and audited. */
export async function ensurePromotionWallet(tx: PromotionWalletTransaction, userId: string) {
  const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update").limit(1);
  if (!user) throw new NotFoundError("User not found");
  let rate = user.legacyBoostCreditUnitRate;
  if (rate == null) {
    const settings = await tx.execute<{ value: { creditUnits?: number } }>(sql`select value from promotion_settings where key = 'legacy_credit_unit_rate'`);
    rate = Number(settings[0]?.value?.creditUnits);
    if (!Number.isSafeInteger(rate) || rate <= 0) throw new Error("Legacy promotion conversion rate is not configured");
  }
  const boostCreditUnits = user.boostCreditUnitsVersion >= 1 ? user.boostCredits : legacyCreditUnits(user.boostCredits, rate);
  if (user.boostCreditUnitsVersion < 1 || user.legacyBoostCreditUnitRate == null) {
    await tx.update(users).set({ boostCredits: boostCreditUnits, boostCreditUnitsVersion: 1, legacyBoostCreditUnitRate: rate, updatedAt: new Date() }).where(eq(users.id, userId));
    await tx.insert(adminAuditEvents).values({
      actorKind: "api_key", actorClerkId: null, action: "promotion_wallet.convert", entityType: "user", entityId: userId,
      payload: { previousBoostCredits: user.boostCredits, boostCreditUnits, legacyCreditUnitRate: rate },
    });
  }
  return { boostCreditUnits, boostCredits: boostCreditUnits / PROMOTION_CREDIT_SCALE, postCredits: user.postCredits, legacyCreditUnitRate: rate };
}

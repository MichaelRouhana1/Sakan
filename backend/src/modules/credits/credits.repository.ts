import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  adminAuditEvents,
  creditTransactions,
  users,
} from "../../db/schema/index.js";
import type { AdminActor } from "../../middleware/auth.js";
import { ensurePromotionWallet, legacyCreditUnits } from './promotion-wallet.js';

export type InsertCreditTransaction = {
  userId: string;
  referenceId: string;
  bundleType: "starter" | "bundle_5" | "boost_pack" | "custom";
  postCreditsDelta: number;
  boostCreditsDelta: number;
  amountUsdCents: number;
  channel: "whish" | "omt";
  providerExternalId?: string | null;
  checkoutUrl?: string | null;
  catalogPackId?: string;
  catalogVersion?: string;
  boostCreditUnitsVersion?: number;
};

export type AdminReview = AdminActor & {
  adminNote?: string;
};

export class CreditsRepository {
  async createPending(input: InsertCreditTransaction) {
    const [row] = await db
      .insert(creditTransactions)
      .values({
        ...input,
        status: "pending",
      })
      .returning();
    return row;
  }

  async findByReferenceId(referenceId: string) {
    const [row] = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.referenceId, referenceId))
      .limit(1);
    return row ?? null;
  }

  async findByProviderExternalId(providerExternalId: string) {
    const [row] = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.providerExternalId, providerExternalId))
      .limit(1);
    return row ?? null;
  }

  async findById(id: string) {
    const [row] = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.id, id))
      .limit(1);
    return row ?? null;
  }

  async listPending() {
    return db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.status, "pending"))
      .orderBy(desc(creditTransactions.createdAt));
  }

  async attachCheckout(txId: string, checkoutUrl: string) {
    const [row] = await db
      .update(creditTransactions)
      .set({ checkoutUrl, updatedAt: new Date() })
      .where(eq(creditTransactions.id, txId))
      .returning();
    return row ?? null;
  }

  async setProviderTransactionId(txId: string, providerTransactionId: string) {
    const [row] = await db
      .update(creditTransactions)
      .set({ providerTransactionId, updatedAt: new Date() })
      .where(eq(creditTransactions.id, txId))
      .returning();
    return row ?? null;
  }

  async approveTransaction(txId: string, review: AdminReview) {
    return db.transaction(async (tx) => {
      const [pending] = await tx
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.id, txId))
        .for("update")
        .limit(1);

      if (!pending || pending.status !== "pending") {
        return null;
      }

      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, pending.userId))
        .for("update")
        .limit(1);

      if (!user) {
        return null;
      }

      const wallet = await ensurePromotionWallet(tx, user.id);
      const grantedUnits = pending.boostCreditUnitsVersion >= 1 ? pending.boostCreditsDelta : legacyCreditUnits(pending.boostCreditsDelta, wallet.legacyCreditUnitRate);
      const now = new Date();

      await tx
        .update(users)
        .set({
          postCredits: user.postCredits + pending.postCreditsDelta,
          boostCredits: wallet.boostCreditUnits + grantedUnits,
          updatedAt: now,
        })
        .where(eq(users.id, user.id));

      const [updated] = await tx
        .update(creditTransactions)
        .set({
          status: "approved",
          approvedAt: now,
          reviewedAt: now,
          reviewedByKind: review.kind,
          reviewedByClerkId: review.clerkId,
          reviewedByUserId: review.userId,
          adminNote: review.adminNote,
          updatedAt: now,
        })
        .where(
          and(
            eq(creditTransactions.id, txId),
            eq(creditTransactions.status, "pending"),
          ),
        )
        .returning();

      if (!updated) return null;

      if (grantedUnits) await tx.execute(sql`INSERT INTO promotion_wallet_ledger(user_id,operation_key,delta_units,reason) VALUES (${user.id}::uuid,${`credit:${pending.id}`},${grantedUnits},'whish_top_up') ON CONFLICT DO NOTHING`);

      await tx.insert(adminAuditEvents).values({
        actorKind: review.kind,
        actorClerkId: review.clerkId,
        action: "credit_tx.approve",
        entityType: "credit_transaction",
        entityId: updated.id,
        payload: {
          adminNote: review.adminNote ?? null,
          referenceId: pending.referenceId,
          postCreditsDelta: pending.postCreditsDelta,
          boostCreditsDelta: pending.boostCreditsDelta,
          amountUsdCents: pending.amountUsdCents,
        },
      });

      return updated;
    });
  }

  async rejectTransaction(txId: string, review: AdminReview) {
    return db.transaction(async (tx) => {
      const [pending] = await tx
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.id, txId))
        .for("update")
        .limit(1);

      if (!pending || pending.status !== "pending") {
        return null;
      }

      const now = new Date();

      const [updated] = await tx
        .update(creditTransactions)
        .set({
          status: "rejected",
          reviewedAt: now,
          reviewedByKind: review.kind,
          reviewedByClerkId: review.clerkId,
          reviewedByUserId: review.userId,
          adminNote: review.adminNote,
          updatedAt: now,
        })
        .where(
          and(
            eq(creditTransactions.id, txId),
            eq(creditTransactions.status, "pending"),
          ),
        )
        .returning();

      if (!updated) return null;

      await tx.insert(adminAuditEvents).values({
        actorKind: review.kind,
        actorClerkId: review.clerkId,
        action: "credit_tx.reject",
        entityType: "credit_transaction",
        entityId: updated.id,
        payload: {
          adminNote: review.adminNote ?? null,
          referenceId: pending.referenceId,
          amountUsdCents: pending.amountUsdCents,
        },
      });

      return updated;
    });
  }
}

export const creditsRepository = new CreditsRepository();

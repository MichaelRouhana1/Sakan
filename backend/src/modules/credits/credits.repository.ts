import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  adminAuditEvents,
  creditTransactions,
  users,
} from "../../db/schema/index.js";
import type { AdminActor } from "../../middleware/auth.js";

export type InsertCreditTransaction = {
  userId: string;
  referenceId: string;
  bundleType: "starter" | "bundle_5" | "boost_pack" | "custom";
  postCreditsDelta: number;
  boostCreditsDelta: number;
  amountUsdCents: number;
  channel: "whish" | "omt";
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

  async approveTransaction(txId: string, review: AdminReview) {
    return db.transaction(async (tx) => {
      const [pending] = await tx
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.id, txId))
        .limit(1);

      if (!pending || pending.status !== "pending") {
        return null;
      }

      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, pending.userId))
        .limit(1);

      if (!user) {
        return null;
      }

      const now = new Date();

      await tx
        .update(users)
        .set({
          postCredits: user.postCredits + pending.postCreditsDelta,
          boostCredits: user.boostCredits + pending.boostCreditsDelta,
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

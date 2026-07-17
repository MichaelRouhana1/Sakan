import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { creditTransactions, users } from "../../db/schema/index.js";

export type InsertCreditTransaction = {
  userId: string;
  referenceId: string;
  bundleType: "starter" | "bundle_5" | "boost_pack" | "custom";
  postCreditsDelta: number;
  boostCreditsDelta: number;
  amountUsdCents: number;
  channel: "whish" | "omt";
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
      .where(eq(creditTransactions.status, "pending"));
  }

  async approveTransaction(txId: string, adminNote?: string) {
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

      await tx
        .update(users)
        .set({
          postCredits: user.postCredits + pending.postCreditsDelta,
          boostCredits: user.boostCredits + pending.boostCreditsDelta,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      const [updated] = await tx
        .update(creditTransactions)
        .set({
          status: "approved",
          approvedAt: new Date(),
          adminNote,
          updatedAt: new Date(),
        })
        .where(eq(creditTransactions.id, txId))
        .returning();

      return updated;
    });
  }

  async rejectTransaction(txId: string, adminNote?: string) {
    const [updated] = await db
      .update(creditTransactions)
      .set({
        status: "rejected",
        adminNote,
        updatedAt: new Date(),
      })
      .where(eq(creditTransactions.id, txId))
      .returning();
    return updated ?? null;
  }
}

export const creditsRepository = new CreditsRepository();

import { eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users } from "../../db/schema/index.js";
export class UsersRepository {
  async findById(id: string) {
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  }

  async findByEmail(email: string) {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return row ?? null;
  }

  async findByClerkId(clerkId: string) {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);
    return row ?? null;
  }

  async provisionFromClerk(input: {
    clerkId: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  }) {
    let user = await this.findByClerkId(input.clerkId);
    if (user) {
      return user;
    }

    if (input.email) {
      user = await this.findByEmail(input.email);
      if (user) {
        const [updated] = await db
          .update(users)
          .set({ clerkId: input.clerkId, updatedAt: new Date() })
          .where(eq(users.id, user.id))
          .returning();
        return updated ?? user;
      }
    }

    const [row] = await db
      .insert(users)
      .values({
        clerkId: input.clerkId,
        email: input.email || null,
        firstName: input.firstName || null,
        lastName: input.lastName || null,
        role: "renter",
        postCredits: 0,
        emailVerifiedAt: input.email ? new Date() : null,
      })
      .returning();

    return row;
  }

  async updateRole(id: string, role: "renter" | "poster") {
    const existing = await this.findById(id);
    if (!existing) return null;

    const postCredits =
      role === "poster" && existing.postCredits < 1
        ? 1
        : existing.postCredits;
    const freeCreditClaimed =
      role === "poster" ? true : existing.freeCreditClaimed;

    const [row] = await db
      .update(users)
      .set({
        role,
        postCredits,
        freeCreditClaimed,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return row ?? null;
  }

  async setCampus(id: string, campusId: string) {
    const [row] = await db
      .update(users)
      .set({ campusId, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return row ?? null;
  }

  async setGender(id: string, gender: "male" | "female") {
    const [row] = await db
      .update(users)
      .set({ gender, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return row ?? null;
  }

  async debitPostCredit(id: string) {
    const [row] = await db
      .update(users)
      .set({
        postCredits: sql`GREATEST(${users.postCredits} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return row ?? null;
  }

  async bumpFreeSlotPublish(id: string, monthKey: string) {
    const existing = await this.findById(id);
    if (!existing) return null;
    const next =
      existing.freeSlotPublishesMonthKey === monthKey
        ? existing.freeSlotPublishesMonth + 1
        : 1;
    const [row] = await db
      .update(users)
      .set({
        freeSlotPublishesMonthKey: monthKey,
        freeSlotPublishesMonth: next,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return row ?? null;
  }

  async setAccountStatus(
    id: string,
    accountStatus: "active" | "restricted" | "banned",
  ) {
    const [row] = await db
      .update(users)
      .set({ accountStatus, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return row ?? null;
  }
}

export const usersRepository = new UsersRepository();

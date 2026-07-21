import { eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users } from "../../db/schema/index.js";
import type { RegisterUserInput } from "./users.schemas.js";

export class UsersRepository {
  async findById(id: string) {
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  }

  async findByPhone(phone: string) {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);
    return row ?? null;
  }

  async create(input: RegisterUserInput) {
    const postCredits = input.role === "poster" ? 1 : 0;
    const [row] = await db
      .insert(users)
      .values({
        phone: input.phone,
        role: input.role,
        postCredits,
        freeCreditClaimed: input.role === "poster",
        phoneVerifiedAt: new Date(),
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
        phoneVerifiedAt: existing.phoneVerifiedAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return row ?? null;
  }

  async markPhoneVerified(id: string) {
    const [row] = await db
      .update(users)
      .set({
        phoneVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
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
}

export const usersRepository = new UsersRepository();

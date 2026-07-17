import { eq } from "drizzle-orm";
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
      })
      .returning();
    return row;
  }
}

export const usersRepository = new UsersRepository();

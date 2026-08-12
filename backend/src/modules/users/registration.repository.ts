import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import { emailRegistrationChallenges } from "../../db/schema/index.js";

export type ChallengeInsert = {
  email: string;
  codeHash: string;
  expiresAt: Date;
  lastSentAt: Date;
  sendCount?: number;
};

export class RegistrationRepository {
  async findLatestOpenChallenge(email: string) {
    const [row] = await db
      .select()
      .from(emailRegistrationChallenges)
      .where(
        and(
          eq(emailRegistrationChallenges.email, email),
          isNull(emailRegistrationChallenges.consumedAt),
        ),
      )
      .orderBy(desc(emailRegistrationChallenges.createdAt))
      .limit(1);
    return row ?? null;
  }

  async createChallenge(input: ChallengeInsert) {
    const [row] = await db
      .insert(emailRegistrationChallenges)
      .values({
        email: input.email,
        codeHash: input.codeHash,
        expiresAt: input.expiresAt,
        lastSentAt: input.lastSentAt,
        sendCount: input.sendCount ?? 1,
        attemptCount: 0,
      })
      .returning();
    return row;
  }

  async resetChallengeCode(
    id: string,
    input: {
      codeHash: string;
      expiresAt: Date;
      lastSentAt: Date;
      sendCount: number;
    },
  ) {
    const [row] = await db
      .update(emailRegistrationChallenges)
      .set({
        codeHash: input.codeHash,
        expiresAt: input.expiresAt,
        lastSentAt: input.lastSentAt,
        sendCount: input.sendCount,
        attemptCount: 0,
        verifiedAt: null,
        completionTokenHash: null,
        completionTokenExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(emailRegistrationChallenges.id, id))
      .returning();
    return row ?? null;
  }

  async incrementAttempt(id: string) {
    const existing = await this.findById(id);
    if (!existing) return null;
    const [row] = await db
      .update(emailRegistrationChallenges)
      .set({
        attemptCount: existing.attemptCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(emailRegistrationChallenges.id, id))
      .returning();
    return row ?? null;
  }

  async markVerified(
    id: string,
    input: {
      completionTokenHash: string;
      completionTokenExpiresAt: Date;
      /** Scramble stored OTP hash so the same code cannot be reused. */
      consumedCodeHash: string;
    },
  ) {
    const [row] = await db
      .update(emailRegistrationChallenges)
      .set({
        verifiedAt: new Date(),
        codeHash: input.consumedCodeHash,
        completionTokenHash: input.completionTokenHash,
        completionTokenExpiresAt: input.completionTokenExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(emailRegistrationChallenges.id, id))
      .returning();
    return row ?? null;
  }

  async findByCompletionTokenHash(tokenHash: string) {
    const now = new Date();
    const [row] = await db
      .select()
      .from(emailRegistrationChallenges)
      .where(
        and(
          eq(emailRegistrationChallenges.completionTokenHash, tokenHash),
          isNull(emailRegistrationChallenges.consumedAt),
          gt(emailRegistrationChallenges.completionTokenExpiresAt, now),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async consumeChallenge(id: string) {
    const [row] = await db
      .update(emailRegistrationChallenges)
      .set({
        consumedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(emailRegistrationChallenges.id, id))
      .returning();
    return row ?? null;
  }

  async findById(id: string) {
    const [row] = await db
      .select()
      .from(emailRegistrationChallenges)
      .where(eq(emailRegistrationChallenges.id, id))
      .limit(1);
    return row ?? null;
  }
}

export const registrationRepository = new RegistrationRepository();

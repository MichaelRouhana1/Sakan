import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  ne,
  notInArray,
  sql,
} from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  listings,
  roommateBlocks,
  roommateInvites,
  roommateLookingCards,
  roommateMatches,
  roommateReports,
  users,
} from "../../db/schema/index.js";
import type { UpsertLookingCardInput } from "./roommate.schemas.js";

export class RoommateRepository {
  async findCardByUser(userId: string) {
    const [row] = await db
      .select()
      .from(roommateLookingCards)
      .where(
        and(
          eq(roommateLookingCards.userId, userId),
          ne(roommateLookingCards.status, "withdrawn"),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findCardById(id: string) {
    const [row] = await db
      .select()
      .from(roommateLookingCards)
      .where(eq(roommateLookingCards.id, id))
      .limit(1);
    return row ?? null;
  }

  async upsertCard(userId: string, input: UpsertLookingCardInput) {
    const existing = await this.findCardByUser(userId);
    const values = {
      userId,
      areas: input.areas,
      budgetMaxUsd: input.budgetMaxUsd,
      sleepSchedule: input.sleepSchedule,
      smoking: input.smoking,
      pets: input.pets,
      moveInTiming: input.moveInTiming,
      contactPhone: input.contactPhone,
      photoUrls: input.photoUrls ?? [],
      status: input.status ?? ("active" as const),
      updatedAt: new Date(),
    };
    if (existing) {
      const [row] = await db
        .update(roommateLookingCards)
        .set(values)
        .where(eq(roommateLookingCards.id, existing.id))
        .returning();
      return row!;
    }
    const [row] = await db
      .insert(roommateLookingCards)
      .values(values)
      .returning();
    return row!;
  }

  async withdrawCard(userId: string) {
    const existing = await this.findCardByUser(userId);
    if (!existing) return null;
    const [row] = await db
      .update(roommateLookingCards)
      .set({ status: "withdrawn", updatedAt: new Date() })
      .where(eq(roommateLookingCards.id, existing.id))
      .returning();
    return row ?? null;
  }

  async countCardCreatesToday(phone: string) {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const rows = await db
      .select({ id: roommateLookingCards.id })
      .from(roommateLookingCards)
      .innerJoin(users, eq(users.id, roommateLookingCards.userId))
      .where(
        and(eq(users.phone, phone), gte(roommateLookingCards.createdAt, start)),
      );
    return rows.length;
  }

  async listSeekersForListing(params: {
    holderUserId: string;
    holderGender: "male" | "female";
    listingArea: string;
  }) {
    const blocked = await db
      .select({ id: roommateBlocks.blockedUserId })
      .from(roommateBlocks)
      .where(eq(roommateBlocks.blockerUserId, params.holderUserId));
    const blockedByThem = await db
      .select({ id: roommateBlocks.blockerUserId })
      .from(roommateBlocks)
      .where(eq(roommateBlocks.blockedUserId, params.holderUserId));
    const excludeIds = [
      params.holderUserId,
      ...blocked.map((b) => b.id),
      ...blockedByThem.map((b) => b.id),
    ];

    const rows = await db
      .select({
        card: roommateLookingCards,
      })
      .from(roommateLookingCards)
      .innerJoin(users, eq(users.id, roommateLookingCards.userId))
      .where(
        and(
          eq(roommateLookingCards.status, "active"),
          eq(users.gender, params.holderGender),
          sql`${params.listingArea} = ANY(${roommateLookingCards.areas})`,
          excludeIds.length > 0
            ? notInArray(roommateLookingCards.userId, excludeIds)
            : undefined,
        ),
      )
      .orderBy(desc(roommateLookingCards.updatedAt))
      .limit(50);

    return rows.map((r) => r.card);
  }

  async countNearby(area: string) {
    const [row] = await db
      .select({ n: count() })
      .from(roommateLookingCards)
      .where(
        and(
          eq(roommateLookingCards.status, "active"),
          sql`${area} = ANY(${roommateLookingCards.areas})`,
        ),
      );
    return Number(row?.n ?? 0);
  }

  async countPendingInvitesToday(holderPhone: string) {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const rows = await db
      .select({ id: roommateInvites.id })
      .from(roommateInvites)
      .innerJoin(users, eq(users.id, roommateInvites.holderUserId))
      .where(
        and(
          eq(users.phone, holderPhone),
          gte(roommateInvites.createdAt, start),
          inArray(roommateInvites.status, ["pending", "accepted", "declined"]),
        ),
      );
    return rows.length;
  }

  async createInvite(input: {
    holderUserId: string;
    seekerUserId: string;
    lookingCardId: string;
    listingId: string;
    note: string;
  }) {
    const [row] = await db
      .insert(roommateInvites)
      .values({
        holderUserId: input.holderUserId,
        seekerUserId: input.seekerUserId,
        lookingCardId: input.lookingCardId,
        listingId: input.listingId,
        note: input.note,
        status: "pending",
      })
      .returning();
    return row!;
  }

  async findInviteById(id: string) {
    const [row] = await db
      .select()
      .from(roommateInvites)
      .where(eq(roommateInvites.id, id))
      .limit(1);
    return row ?? null;
  }

  async listInvitesForSeeker(seekerUserId: string) {
    return db
      .select()
      .from(roommateInvites)
      .where(eq(roommateInvites.seekerUserId, seekerUserId))
      .orderBy(desc(roommateInvites.createdAt));
  }

  async listInvitesSent(holderUserId: string) {
    return db
      .select()
      .from(roommateInvites)
      .where(eq(roommateInvites.holderUserId, holderUserId))
      .orderBy(desc(roommateInvites.createdAt));
  }

  async setInviteStatus(
    id: string,
    status: "accepted" | "declined" | "withdrawn" | "expired",
  ) {
    const [row] = await db
      .update(roommateInvites)
      .set({ status, updatedAt: new Date() })
      .where(eq(roommateInvites.id, id))
      .returning();
    return row ?? null;
  }

  async createMatch(invite: {
    id: string;
    holderUserId: string;
    seekerUserId: string;
    listingId: string;
    lookingCardId: string;
  }) {
    const [row] = await db
      .insert(roommateMatches)
      .values({
        inviteId: invite.id,
        holderUserId: invite.holderUserId,
        seekerUserId: invite.seekerUserId,
        listingId: invite.listingId,
        lookingCardId: invite.lookingCardId,
      })
      .returning();
    return row!;
  }

  async findMatchIdByInvite(inviteId: string) {
    const [row] = await db
      .select({ id: roommateMatches.id })
      .from(roommateMatches)
      .where(eq(roommateMatches.inviteId, inviteId))
      .limit(1);
    return row?.id ?? null;
  }

  async findMatchById(id: string) {
    const [row] = await db
      .select()
      .from(roommateMatches)
      .where(eq(roommateMatches.id, id))
      .limit(1);
    return row ?? null;
  }

  async endMatch(id: string, reason?: string) {
    const [row] = await db
      .update(roommateMatches)
      .set({ endedAt: new Date(), endReason: reason ?? "ended" })
      .where(and(eq(roommateMatches.id, id), sql`${roommateMatches.endedAt} IS NULL`))
      .returning();
    return row ?? null;
  }

  async withdrawPendingForListing(listingId: string) {
    return db
      .update(roommateInvites)
      .set({ status: "withdrawn", updatedAt: new Date() })
      .where(
        and(
          eq(roommateInvites.listingId, listingId),
          eq(roommateInvites.status, "pending"),
        ),
      )
      .returning({ id: roommateInvites.id });
  }

  async block(blockerUserId: string, blockedUserId: string) {
    const [row] = await db
      .insert(roommateBlocks)
      .values({ blockerUserId, blockedUserId })
      .onConflictDoNothing()
      .returning();
    return row;
  }

  async report(input: {
    reporterUserId: string;
    targetType: "card" | "invite" | "match" | "user";
    targetId: string;
    reason: "spam" | "harassment" | "fake" | "other";
  }) {
    const [row] = await db
      .insert(roommateReports)
      .values(input)
      .returning();
    return row!;
  }

  async findListingForHolder(listingId: string, holderUserId: string) {
    const [row] = await db
      .select()
      .from(listings)
      .where(
        and(
          eq(listings.id, listingId),
          eq(listings.posterId, holderUserId),
          eq(listings.status, "active"),
        ),
      )
      .limit(1);
    return row ?? null;
  }
}

export const roommateRepository = new RoommateRepository();

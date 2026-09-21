import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  listingLifecycleEvents,
  listings,
  users,
} from "../../db/schema/index.js";
import {
  ConflictError,
  InsufficientCreditsError,
  NotFoundError,
} from "../../lib/errors.js";
import type { ListingExpiryDecisionInput } from "./listing-expiry.schemas.js";

export type LifecycleEventType =
  | "expired"
  | "renew_intent"
  | "improve_intent"
  | "rented"
  | "renewed"
  | "archived"
  | "admin_contacted";

const FINAL_EVENT_TYPES: LifecycleEventType[] = [
  "rented",
  "renewed",
  "archived",
];

export class ListingExpiryRepository {
  async listEvents(listingId: string, cycleExpiresAt: Date) {
    return db
      .select()
      .from(listingLifecycleEvents)
      .where(
        and(
          eq(listingLifecycleEvents.listingId, listingId),
          eq(listingLifecycleEvents.cycleExpiresAt, cycleExpiresAt),
        ),
      )
      .orderBy(desc(listingLifecycleEvents.createdAt));
  }

  async recordDecision(
    listingId: string,
    ownerId: string,
    input: ListingExpiryDecisionInput,
  ) {
    const cycleExpiresAt = new Date(input.cycleExpiresAt);
    return db.transaction(async (tx) => {
      const [listing] = await tx
        .select({
          id: listings.id,
          status: listings.status,
          expiresAt: listings.expiresAt,
        })
        .from(listings)
        .where(
          and(eq(listings.id, listingId), eq(listings.posterId, ownerId)),
        )
        .limit(1)
        .for("update");

      if (!listing || !listing.expiresAt) {
        throw new NotFoundError("Listing expiry cycle not found");
      }
      if (listing.expiresAt.getTime() !== cycleExpiresAt.getTime()) {
        throw new ConflictError("This listing has already moved to a new expiry cycle");
      }
      if (listing.status === "removed" || listing.status === "draft") {
        throw new ConflictError("This listing cannot accept an expiry decision");
      }

      const mapping = {
        rented: { eventType: "rented", outcome: "rented" },
        still_available: { eventType: "renew_intent", outcome: null },
        improve: { eventType: "improve_intent", outcome: null },
        archive: { eventType: "archived", outcome: "archived" },
      } as const;
      const event = mapping[input.decision];

      await tx
        .insert(listingLifecycleEvents)
        .values({
          listingId,
          cycleExpiresAt,
          eventType: event.eventType,
          outcome: event.outcome,
          source: "host",
        })
        .onConflictDoNothing();

      if (input.decision === "rented" || input.decision === "archive") {
        await tx
          .update(listings)
          .set({ status: "archived", updatedAt: new Date() })
          .where(
            and(
              eq(listings.id, listingId),
              eq(listings.posterId, ownerId),
              inArray(listings.status, ["active", "archived"]),
            ),
          );
      }
    });
  }

  async renew(
    listingId: string,
    ownerId: string,
    expectedCycleExpiresAt: Date,
  ) {
    return db.transaction(async (tx) => {
      const [listing] = await tx
        .select({
          id: listings.id,
          status: listings.status,
          expiresAt: listings.expiresAt,
        })
        .from(listings)
        .where(
          and(eq(listings.id, listingId), eq(listings.posterId, ownerId)),
        )
        .limit(1)
        .for("update");
      if (!listing || !listing.expiresAt) {
        throw new NotFoundError("Listing expiry cycle not found");
      }

      const [alreadyRenewed] = await tx
        .select({ id: listingLifecycleEvents.id })
        .from(listingLifecycleEvents)
        .where(
          and(
            eq(listingLifecycleEvents.listingId, listingId),
            eq(listingLifecycleEvents.cycleExpiresAt, expectedCycleExpiresAt),
            eq(listingLifecycleEvents.eventType, "renewed"),
          ),
        )
        .limit(1);
      if (alreadyRenewed) return { id: listingId, alreadyRenewed: true };

      if (listing.expiresAt.getTime() !== expectedCycleExpiresAt.getTime()) {
        throw new ConflictError("This listing has already moved to a new expiry cycle");
      }
      if (listing.status === "removed" || listing.status === "draft") {
        throw new ConflictError("This listing cannot be renewed");
      }

      const [owner] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, ownerId))
        .limit(1)
        .for("update");
      if (!owner) throw new NotFoundError("User not found");

      const [claimed] = await tx
        .insert(listingLifecycleEvents)
        .values({
          listingId,
          cycleExpiresAt: expectedCycleExpiresAt,
          eventType: "renewed",
          outcome: "renewed",
          source: "host",
        })
        .onConflictDoNothing()
        .returning({ id: listingLifecycleEvents.id });
      if (!claimed) return { id: listingId, alreadyRenewed: true };

      const [debited] = await tx
        .update(users)
        .set({
          postCredits: sql`${users.postCredits} - 1`,
          updatedAt: new Date(),
        })
        .where(and(eq(users.id, ownerId), gt(users.postCredits, 0)))
        .returning({ postCredits: users.postCredits });
      if (!debited) throw new InsufficientCreditsError("One post credit is required to renew");

      const now = new Date();
      const base = expectedCycleExpiresAt > now ? expectedCycleExpiresAt : now;
      const nextExpiry = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
      const [updated] = await tx
        .update(listings)
        .set({
          status: "active",
          expiresAt: nextExpiry,
          updatedAt: now,
        })
        .where(
          and(
            eq(listings.id, listingId),
            eq(listings.posterId, ownerId),
            eq(listings.expiresAt, expectedCycleExpiresAt),
            inArray(listings.status, ["active", "archived"]),
          ),
        )
        .returning({ id: listings.id, expiresAt: listings.expiresAt });
      if (!updated) throw new ConflictError("Listing changed while it was being renewed");

      return { ...updated, alreadyRenewed: false };
    });
  }

  async hasFinalOutcome(listingId: string, cycleExpiresAt: Date) {
    const [row] = await db
      .select({ id: listingLifecycleEvents.id })
      .from(listingLifecycleEvents)
      .where(
        and(
          eq(listingLifecycleEvents.listingId, listingId),
          eq(listingLifecycleEvents.cycleExpiresAt, cycleExpiresAt),
          inArray(listingLifecycleEvents.eventType, FINAL_EVENT_TYPES),
        ),
      )
      .limit(1);
    return Boolean(row);
  }
}

export const listingExpiryRepository = new ListingExpiryRepository();

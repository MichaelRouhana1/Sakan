import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { listings, savedListings } from "../../db/schema/index.js";
import {
  listingPublicColumns,
  listingsRepository,
} from "../listings/listings.repository.js";

function parseCoord(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export class SavedRepository {
  async listByUser(userId: string) {
    const rows = await db
      .select({
        savedId: savedListings.id,
        savedAt: savedListings.createdAt,
        ...listingPublicColumns,
      })
      .from(savedListings)
      .innerJoin(listings, eq(savedListings.listingId, listings.id))
      .where(eq(savedListings.userId, userId))
      .orderBy(desc(savedListings.createdAt));

    const listingRows = rows.map(({ savedId: _s, savedAt: _a, ...listing }) => ({
      ...listing,
      lng: parseCoord(listing.lng),
      lat: parseCoord(listing.lat),
    }));
    const withPhotos = await listingsRepository.withPhotos(listingRows);

    return withPhotos.map((listing, index) => ({
      ...listing,
      savedAt: rows[index]?.savedAt ?? null,
    }));
  }

  async isSaved(userId: string, listingId: string) {
    const [row] = await db
      .select({ id: savedListings.id })
      .from(savedListings)
      .where(
        and(
          eq(savedListings.userId, userId),
          eq(savedListings.listingId, listingId),
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  async save(userId: string, listingId: string) {
    const [row] = await db
      .insert(savedListings)
      .values({ userId, listingId })
      .onConflictDoNothing({
        target: [savedListings.userId, savedListings.listingId],
      })
      .returning();
    return row ?? null;
  }

  async unsave(userId: string, listingId: string) {
    const deleted = await db
      .delete(savedListings)
      .where(
        and(
          eq(savedListings.userId, userId),
          eq(savedListings.listingId, listingId),
        ),
      )
      .returning({ id: savedListings.id });
    return deleted.length > 0;
  }

  async importMany(userId: string, listingIds: string[]) {
    if (listingIds.length === 0) return { imported: 0 };

    const existing = await db
      .select({ id: listings.id })
      .from(listings)
      .where(inArray(listings.id, listingIds));
    const validIds = existing.map((r) => r.id);
    if (validIds.length === 0) return { imported: 0 };

    const inserted = await db
      .insert(savedListings)
      .values(validIds.map((listingId) => ({ userId, listingId })))
      .onConflictDoNothing({
        target: [savedListings.userId, savedListings.listingId],
      })
      .returning({ id: savedListings.id });

    return { imported: inserted.length };
  }
}

export const savedRepository = new SavedRepository();

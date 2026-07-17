import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { listingPhotos, listings } from "../../db/schema/index.js";
import type { CreateListingInput } from "./listings.schemas.js";

export class ListingsRepository {
  async findById(id: string) {
    const [row] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, id))
      .limit(1);
    return row ?? null;
  }

  async listActiveByArea(area?: string) {
    const conditions = [eq(listings.status, "active")];
    if (area) {
      conditions.push(eq(listings.area, area));
    }
    return db
      .select()
      .from(listings)
      .where(and(...conditions));
  }

  /** Distance (meters) from campus gate via PostGIS geography. */
  async listActiveNearUniversity(universitySlug: string) {
    return db.execute(sql`
      SELECT
        l.*,
        ST_Distance(l.location, u.location) AS distance_meters
      FROM listings l
      INNER JOIN universities u ON u.slug = ${universitySlug}
      WHERE l.status = 'active'
        AND l.location IS NOT NULL
      ORDER BY l.boosted_until DESC NULLS LAST, distance_meters ASC
    `);
  }

  async createDraft(posterId: string, input: CreateListingInput) {
    const [row] = await db
      .insert(listings)
      .values({
        posterId,
        listingType: input.listingType,
        targetAudience: input.targetAudience,
        monthlyRentUsd: input.monthlyRentUsd,
        electricity: input.electricity,
        water: input.water,
        wifiIncluded: input.wifiIncluded,
        routerUps: input.routerUps,
        elevator24_7: input.elevator24_7,
        area: input.area,
        landmark: input.landmark,
        location: input.locationWkt
          ? sql`ST_GeogFromText(${input.locationWkt})`
          : null,
        status: "draft",
      })
      .returning();

    if (input.photoUrls.length > 0 && row) {
      await db.insert(listingPhotos).values(
        input.photoUrls.map((url, index) => ({
          listingId: row.id,
          url,
          sortOrder: index,
        })),
      );
    }

    return row;
  }

  async archiveExpired() {
    return db
      .update(listings)
      .set({ status: "archived", updatedAt: new Date() })
      .where(
        and(
          eq(listings.status, "active"),
          sql`${listings.expiresAt} < now()`,
        ),
      )
      .returning({ id: listings.id });
  }
}

export const listingsRepository = new ListingsRepository();

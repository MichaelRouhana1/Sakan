import { and, asc, desc, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";
import { db } from "../../db/index.js";
import { listingPhotos, listings } from "../../db/schema/index.js";
import type {
  CreateListingInput,
  ListingPhotoDto,
  ListingPropertyFilters,
  ListingSort,
} from "./listings.schemas.js";
import { EMPTY_PROPERTY_FILTERS } from "./listings.schemas.js";

export type ListingWithPhotos = Record<string, unknown> & {
  photos: ListingPhotoDto[];
  coverUrl: string | null;
  lng: number | null;
  lat: number | null;
  distanceMeters?: number;
  nearestCampusSlug?: string;
};

/** Explicit listing columns — never select raw geography/location. */
export const listingPublicColumns = {
  id: listings.id,
  posterId: listings.posterId,
  status: listings.status,
  listingType: listings.listingType,
  targetAudience: listings.targetAudience,
  genderRestriction: listings.genderRestriction,
  monthlyRentUsd: listings.monthlyRentUsd,
  electricity: listings.electricity,
  water: listings.water,
  wifiIncluded: listings.wifiIncluded,
  routerUps: listings.routerUps,
  elevator24_7: listings.elevator24_7,
  lookingForRoommate: listings.lookingForRoommate,
  area: listings.area,
  landmark: listings.landmark,
  viewCount: listings.viewCount,
  publishedAt: listings.publishedAt,
  expiresAt: listings.expiresAt,
  boostedUntil: listings.boostedUntil,
  createdAt: listings.createdAt,
  updatedAt: listings.updatedAt,
  lng: sql<number | null>`ST_X(${listings.location}::geometry)`.as("lng"),
  lat: sql<number | null>`ST_Y(${listings.location}::geometry)`.as("lat"),
};

function parseCoord(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Drizzle AND fragments for property browse filters. */
function propertyDrizzleConditions(
  filters: ListingPropertyFilters,
): SQL[] {
  const out: SQL[] = [];
  if (filters.electricity.length > 0) {
    out.push(inArray(listings.electricity, filters.electricity));
  }
  if (filters.water.length > 0) {
    out.push(inArray(listings.water, filters.water));
  }
  if (filters.listingTypes.length > 0) {
    out.push(inArray(listings.listingType, filters.listingTypes));
  }
  if (filters.wifiIncluded) {
    out.push(eq(listings.wifiIncluded, true));
  }
  if (filters.minRentUsd != null) {
    out.push(gte(listings.monthlyRentUsd, filters.minRentUsd));
  }
  if (filters.maxRentUsd != null) {
    out.push(lte(listings.monthlyRentUsd, filters.maxRentUsd));
  }
  if (filters.studentsOnly) {
    out.push(eq(listings.targetAudience, "students_only"));
  }
  if (filters.genderRestrictions.length > 0) {
    out.push(inArray(listings.genderRestriction, filters.genderRestrictions));
  }
  return out;
}

/** Raw-SQL AND fragments for the hub distance query (alias `l`). */
function propertySqlFragments(filters: ListingPropertyFilters): SQL {
  const parts: SQL[] = [];
  if (filters.electricity.length > 0) {
    parts.push(
      sql`AND l.electricity IN (${sql.join(
        filters.electricity.map((e) => sql`${e}`),
        sql`, `,
      )})`,
    );
  }
  if (filters.water.length > 0) {
    parts.push(
      sql`AND l.water IN (${sql.join(
        filters.water.map((w) => sql`${w}`),
        sql`, `,
      )})`,
    );
  }
  if (filters.listingTypes.length > 0) {
    parts.push(
      sql`AND l.listing_type IN (${sql.join(
        filters.listingTypes.map((t) => sql`${t}`),
        sql`, `,
      )})`,
    );
  }
  if (filters.wifiIncluded) {
    parts.push(sql`AND l.wifi_included = true`);
  }
  if (filters.minRentUsd != null) {
    parts.push(sql`AND l.monthly_rent_usd >= ${filters.minRentUsd}`);
  }
  if (filters.maxRentUsd != null) {
    parts.push(sql`AND l.monthly_rent_usd <= ${filters.maxRentUsd}`);
  }
  if (filters.studentsOnly) {
    parts.push(sql`AND l.target_audience = 'students_only'`);
  }
  if (filters.genderRestrictions.length > 0) {
    parts.push(
      sql`AND l.gender_restriction IN (${sql.join(
        filters.genderRestrictions.map((g) => sql`${g}`),
        sql`, `,
      )})`,
    );
  }
  if (parts.length === 0) return sql``;
  return sql.join(parts, sql` `);
}

function attachPhotos<T extends { id: string }>(
  rows: T[],
  photosByListing: Map<string, ListingPhotoDto[]>,
): (T & { photos: ListingPhotoDto[]; coverUrl: string | null })[] {
  return rows.map((row) => {
    const photos = photosByListing.get(row.id) ?? [];
    return {
      ...row,
      photos,
      coverUrl: photos[0]?.url ?? null,
    };
  });
}

export class ListingsRepository {
  async findPhotosByListingIds(
    listingIds: string[],
  ): Promise<Map<string, ListingPhotoDto[]>> {
    const map = new Map<string, ListingPhotoDto[]>();
    if (listingIds.length === 0) return map;

    const rows = await db
      .select({
        id: listingPhotos.id,
        listingId: listingPhotos.listingId,
        url: listingPhotos.url,
        sortOrder: listingPhotos.sortOrder,
      })
      .from(listingPhotos)
      .where(inArray(listingPhotos.listingId, listingIds))
      .orderBy(asc(listingPhotos.sortOrder), asc(listingPhotos.createdAt));

    for (const row of rows) {
      const list = map.get(row.listingId) ?? [];
      list.push({
        id: row.id,
        url: row.url,
        sortOrder: row.sortOrder,
      });
      map.set(row.listingId, list);
    }
    return map;
  }

  async withPhotos<T extends { id: string }>(
    rows: T[],
  ): Promise<(T & { photos: ListingPhotoDto[]; coverUrl: string | null })[]> {
    const photosByListing = await this.findPhotosByListingIds(
      rows.map((r) => r.id),
    );
    return attachPhotos(rows, photosByListing);
  }

  async findById(id: string) {
    const [row] = await db
      .select(listingPublicColumns)
      .from(listings)
      .where(eq(listings.id, id))
      .limit(1);
    if (!row) return null;
    const normalized = {
      ...row,
      lng: parseCoord(row.lng),
      lat: parseCoord(row.lat),
    };
    const [withPhotos] = await this.withPhotos([normalized]);
    return withPhotos ?? null;
  }

  async listActiveByArea(area?: string, sort: ListingSort = "newest") {
    return this.listActiveByAreas(area ? [area] : [], sort);
  }

  async listActiveByAreas(
    areas: string[] = [],
    sort: ListingSort = "newest",
    property: ListingPropertyFilters = EMPTY_PROPERTY_FILTERS,
  ) {
    const conditions = [
      eq(listings.status, "active"),
      ...propertyDrizzleConditions(property),
    ];
    if (areas.length > 0) {
      conditions.push(inArray(listings.area, areas));
    }

    const boostFirst = sql`${listings.boostedUntil} DESC NULLS LAST`;
    const secondary =
      sort === "price_asc"
        ? asc(listings.monthlyRentUsd)
        : sql`COALESCE(${listings.publishedAt}, ${listings.createdAt}) DESC`;

    const rows = await db
      .select(listingPublicColumns)
      .from(listings)
      .where(and(...conditions))
      .orderBy(boostFirst, secondary, desc(listings.createdAt));

    const normalized = rows.map((row) => ({
      ...row,
      lng: parseCoord(row.lng),
      lat: parseCoord(row.lat),
    }));

    return this.withPhotos(normalized);
  }

  /**
   * Hub distance = nearest of selected campuses; `nearest_campus_slug` is the campus that won.
   * Optional `areas` further filters listing.area IN (...).
   */
  async listActiveNearUniversities(
    universitySlugs: string[],
    areas: string[] = [],
    property: ListingPropertyFilters = EMPTY_PROPERTY_FILTERS,
  ) {
    if (universitySlugs.length === 0) return [];

    const slugList = sql.join(
      universitySlugs.map((s) => sql`${s}`),
      sql`, `,
    );
    const areaFilter =
      areas.length > 0
        ? sql`AND l.area IN (${sql.join(
            areas.map((a) => sql`${a}`),
            sql`, `,
          )})`
        : sql``;
    const propertyFilter = propertySqlFragments(property);

    const result = await db.execute(sql`
      WITH campus_set AS (
        SELECT id, slug, name, location
        FROM universities
        WHERE slug IN (${slugList})
      ),
      nearest AS (
        SELECT
          l.id AS listing_id,
          d.distance_meters,
          d.campus_slug AS nearest_campus_slug
        FROM listings l
        CROSS JOIN LATERAL (
          SELECT
            ST_Distance(l.location, c.location) AS distance_meters,
            c.slug AS campus_slug
          FROM campus_set c
          ORDER BY ST_Distance(l.location, c.location) ASC
          LIMIT 1
        ) d
        WHERE l.status = 'active'
          AND l.location IS NOT NULL
          ${areaFilter}
          ${propertyFilter}
      )
      SELECT
        l.id,
        l.poster_id,
        l.status,
        l.listing_type,
        l.target_audience,
        l.gender_restriction,
        l.monthly_rent_usd,
        l.electricity,
        l.water,
        l.wifi_included,
        l.router_ups,
        l.elevator_24_7,
        l.looking_for_roommate,
        l.area,
        l.landmark,
        l.view_count,
        l.published_at,
        l.expires_at,
        l.boosted_until,
        l.created_at,
        l.updated_at,
        n.distance_meters,
        n.nearest_campus_slug,
        ST_X(l.location::geometry) AS lng,
        ST_Y(l.location::geometry) AS lat
      FROM listings l
      INNER JOIN nearest n ON n.listing_id = l.id
      ORDER BY l.boosted_until DESC NULLS LAST, n.distance_meters ASC
    `);

    const rows = Array.isArray(result)
      ? result
      : ((result as { rows?: Record<string, unknown>[] }).rows ?? []);

    const mapped = rows.map((row) => ({
      id: String(row.id),
      posterId: String(row.poster_id),
      status: row.status as "active",
      listingType: row.listing_type,
      targetAudience: row.target_audience,
      genderRestriction: row.gender_restriction,
      monthlyRentUsd: Number(row.monthly_rent_usd),
      electricity: row.electricity,
      water: row.water,
      wifiIncluded: Boolean(row.wifi_included),
      routerUps: Boolean(row.router_ups),
      elevator24_7: Boolean(row.elevator_24_7),
      lookingForRoommate: Boolean(row.looking_for_roommate),
      area: String(row.area),
      landmark: (row.landmark as string | null) ?? null,
      viewCount: Number(row.view_count ?? 0),
      publishedAt: row.published_at ?? null,
      expiresAt: row.expires_at ?? null,
      boostedUntil: row.boosted_until ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      distanceMeters: Number(row.distance_meters),
      nearestCampusSlug: String(row.nearest_campus_slug),
      lng: parseCoord(row.lng),
      lat: parseCoord(row.lat),
    }));

    return this.withPhotos(mapped);
  }

  /** @deprecated Prefer listActiveNearUniversities — kept for one-slug callers. */
  async listActiveNearUniversity(universitySlug: string) {
    return this.listActiveNearUniversities([universitySlug]);
  }

  async listByPoster(posterId: string) {
    const rows = await db
      .select(listingPublicColumns)
      .from(listings)
      .where(eq(listings.posterId, posterId));

    const normalized = rows.map((row) => ({
      ...row,
      lng: parseCoord(row.lng),
      lat: parseCoord(row.lat),
    }));

    return this.withPhotos(normalized);
  }

  async create(posterId: string, input: CreateListingInput) {
    const publishNow = input.publishNow !== false;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [row] = await db
      .insert(listings)
      .values({
        posterId,
        listingType: input.listingType,
        targetAudience: input.targetAudience,
        genderRestriction: input.genderRestriction,
        monthlyRentUsd: input.monthlyRentUsd,
        electricity: input.electricity,
        water: input.water,
        wifiIncluded: input.wifiIncluded,
        routerUps: input.routerUps,
        elevator24_7: input.elevator24_7,
        lookingForRoommate: input.lookingForRoommate ?? false,
        area: input.area,
        landmark: input.landmark,
        location: sql`ST_GeogFromText(${input.locationWkt})`,
        status: publishNow ? "active" : "draft",
        publishedAt: publishNow ? now : null,
        expiresAt: publishNow ? expiresAt : null,
      })
      .returning({ id: listings.id });

    if (!row) {
      return null;
    }

    await db.insert(listingPhotos).values(
      input.photoUrls.map((url, index) => ({
        listingId: row.id,
        url,
        sortOrder: index,
      })),
    );

    return this.findById(row.id);
  }

  async incrementViewCount(id: string) {
    const [row] = await db
      .update(listings)
      .set({
        viewCount: sql`${listings.viewCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(listings.id, id))
      .returning({
        id: listings.id,
        viewCount: listings.viewCount,
        posterId: listings.posterId,
      });
    return row ?? null;
  }

  async countActiveByPoster(posterId: string) {
    const rows = await db
      .select({ id: listings.id })
      .from(listings)
      .where(
        and(eq(listings.posterId, posterId), eq(listings.status, "active")),
      );
    return rows.length;
  }

  async archiveById(id: string, posterId: string) {
    const [row] = await db
      .update(listings)
      .set({ status: "archived", updatedAt: new Date() })
      .where(
        and(
          eq(listings.id, id),
          eq(listings.posterId, posterId),
          eq(listings.status, "active"),
        ),
      )
      .returning({ id: listings.id });
    return row ?? null;
  }

  async updateLookingForRoommate(
    id: string,
    posterId: string,
    lookingForRoommate: boolean,
  ) {
    const [row] = await db
      .update(listings)
      .set({ lookingForRoommate, updatedAt: new Date() })
      .where(and(eq(listings.id, id), eq(listings.posterId, posterId)))
      .returning({ id: listings.id });
    return row ?? null;
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

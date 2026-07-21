import type { CampusMeta, Listing, ListingPhoto } from "@/types/listing";

function normalizePhotos(row: Record<string, unknown>): ListingPhoto[] {
  const raw = row.photos;
  if (!Array.isArray(raw)) return [];

  const photos: ListingPhoto[] = [];
  for (const [index, item] of raw.entries()) {
    if (!item || typeof item !== "object") continue;
    const photo = item as Record<string, unknown>;
    const url = String(photo.url ?? "");
    if (!url) continue;
    const listingIdRaw = photo.listingId ?? photo.listing_id;
    photos.push({
      id: String(photo.id ?? `photo-${index}`),
      url,
      sortOrder: Number(photo.sortOrder ?? photo.sort_order ?? index),
      ...(listingIdRaw != null ? { listingId: String(listingIdRaw) } : {}),
    });
  }
  return photos.sort((a, b) => a.sortOrder - b.sortOrder);
}

function parseCoord(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Maps API rows (camelCase or snake_case / PostGIS) into Listing. */
export function normalizeListing(row: Record<string, unknown>): Listing {
  const distance =
    row.distanceMeters ?? row.distance_meters ?? row.distanceMeters;
  const nearestRaw =
    row.nearestCampusSlug ?? row.nearest_campus_slug ?? undefined;
  const photos = normalizePhotos(row);
  const coverUrl =
    (typeof row.coverUrl === "string" && row.coverUrl) ||
    (typeof row.cover_url === "string" && row.cover_url) ||
    photos[0]?.url ||
    null;

  const nearestCampusSlug =
    nearestRaw == null || nearestRaw === ""
      ? undefined
      : String(nearestRaw);

  return {
    id: String(row.id),
    posterId: String(row.posterId ?? row.poster_id),
    status: (row.status as Listing["status"]) ?? "active",
    listingType: (row.listingType ??
      row.listing_type) as Listing["listingType"],
    targetAudience: (row.targetAudience ??
      row.target_audience) as Listing["targetAudience"],
    genderRestriction: ((row.genderRestriction ??
      row.gender_restriction) as Listing["genderRestriction"]) ?? "anyone",
    monthlyRentUsd: Number(row.monthlyRentUsd ?? row.monthly_rent_usd),
    electricity: row.electricity as Listing["electricity"],
    water: row.water as Listing["water"],
    wifiIncluded: Boolean(row.wifiIncluded ?? row.wifi_included),
    routerUps: Boolean(row.routerUps ?? row.router_ups),
    elevator24_7: Boolean(row.elevator24_7 ?? row.elevator_24_7),
    lookingForRoommate: Boolean(
      row.lookingForRoommate ?? row.looking_for_roommate,
    ),
    area: String(row.area ?? ""),
    landmark: (row.landmark as string | null) ?? null,
    lng: parseCoord(row.lng),
    lat: parseCoord(row.lat),
    viewCount: Number(row.viewCount ?? row.view_count ?? 0),
    publishedAt: (row.publishedAt ?? row.published_at ?? null) as string | null,
    expiresAt: (row.expiresAt ?? row.expires_at ?? null) as string | null,
    boostedUntil: (row.boostedUntil ??
      row.boosted_until ??
      null) as string | null,
    createdAt: String(row.createdAt ?? row.created_at ?? ""),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? ""),
    distanceMeters:
      distance == null || distance === ""
        ? undefined
        : Number(distance),
    nearestCampusSlug,
    photos,
    coverUrl,
  };
}

export function normalizeListingsPayload(data: unknown): Listing[] {
  if (Array.isArray(data)) {
    return data.map((row) =>
      normalizeListing(row as Record<string, unknown>),
    );
  }
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { rows?: unknown }).rows)
  ) {
    return ((data as { rows: Record<string, unknown>[] }).rows).map(
      normalizeListing,
    );
  }
  return [];
}

export function normalizeCampusMeta(raw: unknown): CampusMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const lng = parseCoord(row.lng);
  const lat = parseCoord(row.lat);
  const slug = String(row.slug ?? "");
  const name = String(row.name ?? "");
  if (!slug || lng == null || lat == null) return null;
  return { slug, name, lng, lat };
}

function normalizeCampuses(raw: unknown): CampusMeta[] {
  if (!Array.isArray(raw)) return [];
  const out: CampusMeta[] = [];
  for (const item of raw) {
    const meta = normalizeCampusMeta(item);
    if (meta) out.push(meta);
  }
  return out;
}

/**
 * Parse list envelope. Prefers `campuses`; dual-reads legacy `campus`
 * until the client is fully cut over.
 */
export function normalizeListingsEnvelope(payload: unknown): {
  listings: Listing[];
  campuses: CampusMeta[];
} {
  if (!payload || typeof payload !== "object") {
    return { listings: [], campuses: [] };
  }
  const body = payload as {
    data?: unknown;
    campuses?: unknown;
    campus?: unknown;
  };

  let campuses = normalizeCampuses(body.campuses);
  if (campuses.length === 0 && body.campus != null) {
    const legacy = normalizeCampusMeta(body.campus);
    if (legacy) campuses = [legacy];
  }

  const nameBySlug = new Map(campuses.map((c) => [c.slug, c.name]));
  const listings = normalizeListingsPayload(body.data).map((listing) => {
    if (!listing.nearestCampusSlug) return listing;
    const name = nameBySlug.get(listing.nearestCampusSlug);
    return name ? { ...listing, nearestCampusName: name } : listing;
  });

  return { listings, campuses };
}

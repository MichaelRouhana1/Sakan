/**
 * Live-listing edit field lists + pin materiality.
 *
 * Source of truth: live listing edit plan + `createListingSchema` — not PRD.md
 * (PRD HARD/SOFT lists are stale). Host PATCH must import these same exports
 * so audit classification and structural lock never diverge.
 *
 * Distinct from map grouping `COINCIDENT_METERS` (10m) in mapCoincident.ts.
 */

export const STRUCTURAL_PIN_MAX_METERS = 25;
export const STRUCTURAL_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export const HARD_LISTING_KEYS = [
  "spaceType",
  "propertyType",
  "listingType",
  "targetAudience",
  "genderRestriction",
  "bedrooms",
  "beds",
  "bathrooms",
  "maxOccupancy",
  "floorNumber",
  "areaSqm",
  "area",
  "locationWkt",
  "landmark",
  "addressLine",
  "buildingName",
  "primaryCampusId",
] as const;

export const SOFT_LISTING_KEYS = [
  "monthlyRentUsd",
  "securityDepositUsd",
  "leaseTerm",
  "availableFrom",
  "paymentModality",
  "priceBasis",
  "electricity",
  "electricityCutsStart",
  "electricityCutsEnd",
  "electricityHoursOn",
  "electricityCutWindows",
  "water",
  "wifiIncluded",
  "routerUps",
  "hasElevator",
  "elevator24_7",
  "hasSolar",
  "generatorIncluded",
  "generatorAmperes",
  "conciergeIncluded",
  "cookingGasIncluded",
  "amenities",
  "furnishingType",
  "smokingPolicy",
  "petsPolicy",
  "guestsPolicy",
  "quietHours",
  "title",
  "description",
  "highlightTags",
  "cardBadges",
  "photos",
  "listingPosterRole",
  "contactName",
  "contactPhone",
  "whatsappNumber",
  "contactNumbers",
] as const;

export type HardListingKey = (typeof HARD_LISTING_KEYS)[number];
export type SoftListingKey = (typeof SOFT_LISTING_KEYS)[number];
export type ListingEditKey = HardListingKey | SoftListingKey;
export type ListingEditClass = "soft" | "hard" | "mixed";

export const HARD_LISTING_KEY_SET = new Set<string>(HARD_LISTING_KEYS);
export const SOFT_LISTING_KEY_SET = new Set<string>(SOFT_LISTING_KEYS);
export const LISTING_EDIT_KEYS: readonly ListingEditKey[] = [
  ...HARD_LISTING_KEYS,
  ...SOFT_LISTING_KEYS,
];

export type ListingPhotoSnapshot = {
  url: string;
  caption: string | null;
};

export type LatLng = { lat: number; lng: number };

export type ListingUpdateSnapshot = {
  [key: string]: unknown;
  locationWkt?: string | null;
  lat?: number | null;
  lng?: number | null;
  photos?: ListingPhotoSnapshot[] | null;
};

const EARTH_RADIUS_M = 6_371_000;
const POINT_WKT_RE =
  /POINT\s*\(\s*([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)\s*\)/i;

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Haversine distance in meters. Equivalent to geography ST_Distance for tests. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function parseLocationWkt(wkt: string | null | undefined): LatLng | null {
  if (!wkt) return null;
  const match = POINT_WKT_RE.exec(wkt);
  if (!match) return null;
  const lng = Number(match[1]);
  const lat = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function readSnapshotLocation(snapshot: ListingUpdateSnapshot): LatLng | null {
  const lat = snapshot.lat;
  const lng = snapshot.lng;
  if (typeof lat === "number" && typeof lng === "number") {
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return parseLocationWkt(
    typeof snapshot.locationWkt === "string" ? snapshot.locationWkt : null,
  );
}

/**
 * Material pin move: geography distance > 25m.
 * ≤ 25m is jitter / map snap — not a hard locationWkt change.
 */
export function isMaterialPinMove(
  before: LatLng | null,
  after: LatLng | null,
): boolean {
  if (!before && !after) return false;
  if (!before || !after) return true;
  return haversineMeters(before, after) > STRUCTURAL_PIN_MAX_METERS;
}

export function isWithinStructuralWindow(
  publishedAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (publishedAt == null || publishedAt === "") return true;
  const published = new Date(publishedAt);
  if (Number.isNaN(published.getTime())) return true;
  return now.getTime() < published.getTime() + STRUCTURAL_EDIT_WINDOW_MS;
}

/**
 * Hard keys that must be rejected for this diff.
 * Null/empty publishedAt is not a live window (caller should 404 drafts).
 * Soft-only diffs and ≤25m pin jitter return [].
 */
export function lockedHardKeys(
  diff: ListingUpdateDiff | null,
  publishedAt: Date | string | null | undefined,
  now: Date = new Date(),
): string[] {
  if (!diff) return [];
  const hard = diff.changedKeys.filter((key) => HARD_LISTING_KEY_SET.has(key));
  if (hard.length === 0) return [];
  if (publishedAt == null || publishedAt === "") return hard;
  if (isWithinStructuralWindow(publishedAt, now)) return [];
  return hard;
}

export function classifyListingEdit(changedKeys: string[]): ListingEditClass {
  let hard = false;
  let soft = false;
  for (const key of changedKeys) {
    if (HARD_LISTING_KEY_SET.has(key)) hard = true;
    else if (SOFT_LISTING_KEY_SET.has(key)) soft = true;
  }
  if (hard && soft) return "mixed";
  if (hard) return "hard";
  return "soft";
}

function normalizeCaption(caption: unknown): string | null {
  if (typeof caption !== "string") return null;
  const trimmed = caption.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function normalizePhotos(
  photos: unknown,
): ListingPhotoSnapshot[] | undefined {
  if (!Array.isArray(photos)) return undefined;
  return photos.map((photo) => {
    if (photo && typeof photo === "object") {
      const row = photo as Record<string, unknown>;
      return {
        url: typeof row.url === "string" ? row.url : String(row.url ?? ""),
        caption: normalizeCaption(row.caption),
      };
    }
    return { url: String(photo ?? ""), caption: null };
  });
}

function stableJson(value: unknown): string {
  if (value == null) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([a], [b]) => a.localeCompare(b),
  );
  return `{${entries
    .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`)
    .join(",")}}`;
}

export function valuesEqual(before: unknown, after: unknown): boolean {
  if (Object.is(before, after)) return true;
  if (before == null && after == null) return true;
  if (before == null || after == null) return false;
  if (before instanceof Date || after instanceof Date) {
    const a = before instanceof Date ? before.toISOString() : before;
    const b = after instanceof Date ? after.toISOString() : after;
    return String(a) === String(b);
  }
  if (typeof before !== "object" || typeof after !== "object") {
    return before === after;
  }
  return stableJson(before) === stableJson(after);
}

export type ListingUpdateDiff = {
  changedKeys: string[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  editClass: ListingEditClass;
};

export function diffListingUpdate(
  before: ListingUpdateSnapshot,
  after: ListingUpdateSnapshot,
): ListingUpdateDiff | null {
  const changedKeys: string[] = [];
  const beforeOut: Record<string, unknown> = {};
  const afterOut: Record<string, unknown> = {};

  for (const key of LISTING_EDIT_KEYS) {
    if (key === "locationWkt") {
      const from = readSnapshotLocation(before);
      const to = readSnapshotLocation(after);
      if (!isMaterialPinMove(from, to)) continue;
      changedKeys.push("locationWkt");
      beforeOut.locationWkt = from ?? before.locationWkt ?? null;
      afterOut.locationWkt = to ?? after.locationWkt ?? null;
      continue;
    }

    if (key === "photos") {
      const from = normalizePhotos(before.photos) ?? [];
      const to = normalizePhotos(after.photos) ?? [];
      if (before.photos == null && after.photos == null) continue;
      if (valuesEqual(from, to)) continue;
      changedKeys.push("photos");
      beforeOut.photos = from;
      afterOut.photos = to;
      continue;
    }

    if (!(key in before) && !(key in after)) continue;
    const from = before[key];
    const to = after[key];
    if (valuesEqual(from, to)) continue;
    changedKeys.push(key);
    beforeOut[key] = from ?? null;
    afterOut[key] = to ?? null;
  }

  if (changedKeys.length === 0) return null;
  return {
    changedKeys,
    before: beforeOut,
    after: afterOut,
    editClass: classifyListingEdit(changedKeys),
  };
}

import { z } from "zod";
import {
  LEBANON_AREA_SET,
  MAX_LISTING_AREAS,
  MAX_UNIVERSITY_SLUGS,
} from "../../constants/lebanonAreas.js";

const photoUrlSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("/uploads/"),
    "photoUrls must be absolute http(s) URLs or /uploads/ paths",
  );

/** Rough Lebanon bbox — rejects junk / overseas coordinates. */
const LEBANON_BBOX = {
  minLng: 35.05,
  maxLng: 36.65,
  minLat: 33.05,
  maxLat: 34.7,
};

function parsePointWkt(
  wkt: string,
): { lng: number; lat: number } | null {
  const match = wkt
    .trim()
    .match(/^POINT\((-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\)$/i);
  if (!match) return null;
  const lng = Number(match[1]);
  const lat = Number(match[2]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lng, lat };
}

const locationWktSchema = z
  .string()
  .regex(/^POINT\(-?\d+(\.\d+)?\s+-?\d+(\.\d+)?\)$/i, "Invalid WKT POINT")
  .refine((wkt) => {
    const point = parsePointWkt(wkt);
    if (!point) return false;
    return (
      point.lng >= LEBANON_BBOX.minLng &&
      point.lng <= LEBANON_BBOX.maxLng &&
      point.lat >= LEBANON_BBOX.minLat &&
      point.lat <= LEBANON_BBOX.maxLat
    );
  }, "locationWkt must be within Lebanon");

export const createListingSchema = z.object({
  listingType: z.enum([
    "entire_apartment",
    "studio",
    "private_room",
    "shared_dorm_bed",
  ]),
  targetAudience: z.enum(["anyone", "students_only"]).default("anyone"),
  genderRestriction: z
    .enum(["anyone", "boys_only", "girls_only"])
    .default("anyone"),
  monthlyRentUsd: z.coerce.number().int().positive(),
  electricity: z.enum(["solar", "generator_24_7", "scheduled_cuts"]),
  water: z.enum(["state_well_24_7", "tank_delivery"]),
  wifiIncluded: z.boolean().default(false),
  routerUps: z.boolean().default(false),
  elevator24_7: z.boolean().default(false),
  lookingForRoommate: z.boolean().default(false),
  area: z.string().min(1).max(128),
  landmark: z.string().max(256).optional(),
  /** WKT POINT(lng lat) — required; must be a real pin inside Lebanon */
  locationWkt: locationWktSchema,
  /** PRD: minimum 1, maximum 8 compressed images */
  photoUrls: z.array(photoUrlSchema).min(1).max(8),
  /**
   * Temporary: publishing is free (no credit spend).
   * When true (default), listing goes active for 30 days immediately.
   */
  publishNow: z.boolean().default(true),
});

export const listingSortSchema = z.enum(["newest", "price_asc"]).default("newest");

export type ListingSort = z.infer<typeof listingSortSchema>;

export const ELECTRICITY_VALUES = [
  "solar",
  "generator_24_7",
  "scheduled_cuts",
] as const;
export const WATER_VALUES = ["state_well_24_7", "tank_delivery"] as const;
export const LISTING_TYPE_VALUES = [
  "entire_apartment",
  "studio",
  "private_room",
  "shared_dorm_bed",
] as const;
/** Browse filter values only — `anyone` means no gender filter (omit param). */
export const GENDER_FILTER_VALUES = ["boys_only", "girls_only"] as const;

export type ElectricityFilter = (typeof ELECTRICITY_VALUES)[number];
export type WaterFilter = (typeof WATER_VALUES)[number];
export type ListingTypeFilter = (typeof LISTING_TYPE_VALUES)[number];
export type GenderFilter = (typeof GENDER_FILTER_VALUES)[number];

const ELECTRICITY_SET = new Set<string>(ELECTRICITY_VALUES);
const WATER_SET = new Set<string>(WATER_VALUES);
const LISTING_TYPE_SET = new Set<string>(LISTING_TYPE_VALUES);
const GENDER_FILTER_SET = new Set<string>(GENDER_FILTER_VALUES);

/** Property filters ANDed with area / campus browse queries. */
export type ListingPropertyFilters = {
  electricity: ElectricityFilter[];
  water: WaterFilter[];
  /** When true, require wifi_included; when false, no wifi filter. */
  wifiIncluded: boolean;
  listingTypes: ListingTypeFilter[];
  minRentUsd: number | null;
  maxRentUsd: number | null;
  /** When true, require target_audience = students_only. */
  studentsOnly: boolean;
  /** Empty = any gender; otherwise gender_restriction IN (...). */
  genderRestrictions: GenderFilter[];
};

export const EMPTY_PROPERTY_FILTERS: ListingPropertyFilters = {
  electricity: [],
  water: [],
  wifiIncluded: false,
  listingTypes: [],
  minRentUsd: null,
  maxRentUsd: null,
  studentsOnly: false,
  genderRestrictions: [],
};

/**
 * Wire format (locked): comma-separated strings only from the client, e.g.
 *   ?areas=Hamra,Verdun&universitySlugs=aub,lau
 * Also accepts legacy singular `area` / `universitySlug` as one-item aliases.
 * Do not pass JS arrays to Axios — that produces areas[]= and fights this contract.
 */
export function parseCsvQueryParam(value: unknown): string[] {
  if (value == null || value === "") return [];
  const raw = Array.isArray(value) ? value.join(",") : String(value);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function parseEnumCsv<T extends string>(
  raw: string | undefined,
  allowed: Set<string>,
  field: string,
  ctx: z.RefinementCtx,
): T[] | typeof z.NEVER {
  const parts = parseCsvQueryParam(raw);
  if (parts.length === 0) return [] as T[];
  const unknown = parts.filter((p) => !allowed.has(p));
  if (unknown.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Unknown ${field}: ${unknown.join(", ")}`,
    });
    return z.NEVER;
  }
  return parts as T[];
}

function parseOptionalPositiveInt(
  raw: string | undefined,
  field: string,
  ctx: z.RefinementCtx,
): number | null | typeof z.NEVER {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${field} must be a positive integer`,
    });
    return z.NEVER;
  }
  return n;
}

function parseOptionalTrueFlag(raw: string | undefined): boolean {
  if (raw == null || raw === "") return false;
  return raw === "true" || raw === "1";
}

export const listListingsQuerySchema = z
  .object({
    /** Comma-separated areas, e.g. "Hamra,Verdun". Prefer over legacy `area`. */
    areas: z.string().optional(),
    /** Legacy singular alias → one-item areas. */
    area: z.string().optional(),
    /** Comma-separated campus slugs. Prefer over legacy `universitySlug`. */
    universitySlugs: z.string().optional(),
    /** Legacy singular alias → one-item universitySlugs. */
    universitySlug: z.string().optional(),
    /** Cities mode only — ignored when any universitySlugs are set. */
    sort: listingSortSchema,
    status: z.enum(["draft", "active", "archived", "removed"]).optional(),
    /** Comma-separated electricity enums. */
    electricity: z.string().optional(),
    /** Comma-separated water enums. */
    water: z.string().optional(),
    /** Comma-separated listing type enums. */
    listingTypes: z.string().optional(),
    /** When "true" / "1", require wifi_included. */
    wifiIncluded: z.string().optional(),
    minRentUsd: z.string().optional(),
    maxRentUsd: z.string().optional(),
    /** When "true" / "1", require target_audience = students_only. */
    studentsOnly: z.string().optional(),
    /** Comma-separated gender_restriction filter values (boys_only, girls_only). */
    genderRestrictions: z.string().optional(),
  })
  .transform((raw, ctx) => {
    const areas = parseCsvQueryParam(raw.areas ?? raw.area);
    const universitySlugs = parseCsvQueryParam(
      raw.universitySlugs ?? raw.universitySlug,
    );

    if (areas.length > MAX_LISTING_AREAS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `areas: max ${MAX_LISTING_AREAS} allowed`,
      });
      return z.NEVER;
    }
    if (universitySlugs.length > MAX_UNIVERSITY_SLUGS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `universitySlugs: max ${MAX_UNIVERSITY_SLUGS} allowed`,
      });
      return z.NEVER;
    }

    const unknown = areas.filter((a) => !LEBANON_AREA_SET.has(a));
    if (unknown.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unknown area(s): ${unknown.join(", ")}`,
      });
      return z.NEVER;
    }

    const electricity = parseEnumCsv<ElectricityFilter>(
      raw.electricity,
      ELECTRICITY_SET,
      "electricity",
      ctx,
    );
    if (electricity === z.NEVER) return z.NEVER;

    const water = parseEnumCsv<WaterFilter>(
      raw.water,
      WATER_SET,
      "water",
      ctx,
    );
    if (water === z.NEVER) return z.NEVER;

    const listingTypes = parseEnumCsv<ListingTypeFilter>(
      raw.listingTypes,
      LISTING_TYPE_SET,
      "listingTypes",
      ctx,
    );
    if (listingTypes === z.NEVER) return z.NEVER;

    const genderRestrictions = parseEnumCsv<GenderFilter>(
      raw.genderRestrictions,
      GENDER_FILTER_SET,
      "genderRestrictions",
      ctx,
    );
    if (genderRestrictions === z.NEVER) return z.NEVER;

    if (
      raw.wifiIncluded != null &&
      raw.wifiIncluded !== "" &&
      raw.wifiIncluded !== "true" &&
      raw.wifiIncluded !== "1" &&
      raw.wifiIncluded !== "false" &&
      raw.wifiIncluded !== "0"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "wifiIncluded must be true or false",
      });
      return z.NEVER;
    }
    if (
      raw.studentsOnly != null &&
      raw.studentsOnly !== "" &&
      raw.studentsOnly !== "true" &&
      raw.studentsOnly !== "1" &&
      raw.studentsOnly !== "false" &&
      raw.studentsOnly !== "0"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "studentsOnly must be true or false",
      });
      return z.NEVER;
    }

    const minRentUsd = parseOptionalPositiveInt(
      raw.minRentUsd,
      "minRentUsd",
      ctx,
    );
    if (minRentUsd === z.NEVER) return z.NEVER;
    const maxRentUsd = parseOptionalPositiveInt(
      raw.maxRentUsd,
      "maxRentUsd",
      ctx,
    );
    if (maxRentUsd === z.NEVER) return z.NEVER;

    if (
      minRentUsd != null &&
      maxRentUsd != null &&
      minRentUsd > maxRentUsd
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minRentUsd must be ≤ maxRentUsd",
      });
      return z.NEVER;
    }

    return {
      areas,
      universitySlugs,
      sort: raw.sort,
      status: raw.status,
      electricity,
      water,
      listingTypes,
      wifiIncluded: parseOptionalTrueFlag(raw.wifiIncluded),
      minRentUsd,
      maxRentUsd,
      studentsOnly: parseOptionalTrueFlag(raw.studentsOnly),
      genderRestrictions,
    };
  });

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type ListListingsQuery = z.infer<typeof listListingsQuerySchema>;

export type ListingPhotoDto = {
  id: string;
  url: string;
  sortOrder: number;
};

import { and, eq, ilike, or, sql } from "drizzle-orm";
import { AREA_COORDINATES } from "../../constants/areaCoordinates.js";
import { LEBANON_AREAS } from "../../constants/lebanonAreas.js";
import { db } from "../../db/index.js";
import { institutions, listings, universities } from "../../db/schema/index.js";
import type {
  AreaSuggestion,
  ListingSuggestion,
  SearchSuggestionsResult,
  UniversitySuggestion,
} from "./search.schemas.js";

const AREA_LIMIT = 6;
const UNI_LIMIT = 6;
const LISTING_LIMIT = 6;
const UUID_PREFIX_RE = /^[0-9a-f-]{2,36}$/i;

function parseCoord(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function matchAreas(q: string): AreaSuggestion[] {
  const lower = q.toLowerCase();
  const out: AreaSuggestion[] = [];
  for (const label of LEBANON_AREAS) {
    if (!label.toLowerCase().includes(lower)) continue;
    const center = AREA_COORDINATES[label];
    out.push({
      type: "area",
      label,
      boundingBox: null,
      center: { lat: center.lat, lng: center.lng },
    });
    if (out.length >= AREA_LIMIT) break;
  }
  return out;
}

async function matchUniversities(q: string): Promise<UniversitySuggestion[]> {
  const like = `%${q}%`;
  const rows = await db
    .select({
      id: universities.id,
      name: universities.name,
      slug: universities.slug,
      shortName: institutions.shortName,
      institutionName: institutions.name,
      lng: sql<number | null>`ST_X(${universities.location}::geometry)`.as("lng"),
      lat: sql<number | null>`ST_Y(${universities.location}::geometry)`.as("lat"),
    })
    .from(universities)
    .leftJoin(institutions, eq(universities.institutionId, institutions.id))
    .where(
      and(
        eq(universities.active, true),
        or(
          ilike(universities.name, like),
          ilike(universities.slug, like),
          ilike(institutions.name, like),
          ilike(institutions.shortName, like),
          ilike(institutions.slug, like),
        ),
      ),
    )
    .limit(UNI_LIMIT);

  const out: UniversitySuggestion[] = [];
  for (const row of rows) {
    const lat = parseCoord(row.lat);
    const lng = parseCoord(row.lng);
    if (lat == null || lng == null) continue;
    const shortName = row.shortName;
    const label = shortName ? `${shortName} — ${row.name}` : row.name;
    out.push({
      type: "university",
      label,
      campusId: row.id,
      slug: row.slug,
      center: { lat, lng },
    });
  }
  return out;
}

async function matchListings(q: string): Promise<ListingSuggestion[]> {
  if (q.length < 2) return [];

  const like = `%${q}%`;
  const looksLikeUuid = UUID_PREFIX_RE.test(q);
  const idCond = looksLikeUuid
    ? sql`${listings.id}::text ILIKE ${`${q}%`}`
    : undefined;

  const titleCond = ilike(listings.title, like);
  const where = and(
    eq(listings.status, "active"),
    idCond ? or(idCond, titleCond) : titleCond,
  );

  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      lng: sql<number | null>`ST_X(${listings.location}::geometry)`.as("lng"),
      lat: sql<number | null>`ST_Y(${listings.location}::geometry)`.as("lat"),
    })
    .from(listings)
    .where(where)
    .limit(LISTING_LIMIT);

  return rows.map((row) => {
    const lat = parseCoord(row.lat);
    const lng = parseCoord(row.lng);
    return {
      type: "listing" as const,
      id: row.id,
      label: row.title || row.id.slice(0, 8),
      center: lat != null && lng != null ? { lat, lng } : null,
    };
  });
}

export class SearchService {
  async suggestions(q: string): Promise<SearchSuggestionsResult> {
    const trimmed = q.trim();
    const [universitiesResult, listingsResult] = await Promise.all([
      matchUniversities(trimmed),
      matchListings(trimmed),
    ]);
    return {
      areas: matchAreas(trimmed),
      universities: universitiesResult,
      listings: listingsResult,
    };
  }
}

export const searchService = new SearchService();

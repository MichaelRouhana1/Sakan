import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { AREA_ALIASES } from "../../constants/areaAliases.js";
import { AREA_COORDINATES } from "../../constants/areaCoordinates.js";
import { LEBANON_AREAS, type LebanonArea } from "../../constants/lebanonAreas.js";
import { db } from "../../db/index.js";
import { institutions, listings, universities } from "../../db/schema/index.js";
import {
  diceCoefficient,
  levenshtein,
} from "../../lib/string-similarity.js";
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
/** pg_trgm: 1–2 char typos on short names; skip for 1–2 letter queries (ILIKE covers those). */
const TRGM_MIN = 0.22;
const FUZZY_MIN_Q = 3;
const DICE_MIN = 0.45;

function parseCoord(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function fold(s: string): string {
  return s.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

function areaNames(label: LebanonArea): string[] {
  return [label, ...(AREA_ALIASES[label] ?? [])];
}

function areaMatchScore(label: LebanonArea, q: string): number | null {
  const needle = fold(q);
  if (!needle) return null;
  let substring = false;
  let bestDice = 0;
  let bestLev = Number.POSITIVE_INFINITY;
  let longest = needle.length;
  for (const name of areaNames(label)) {
    const n = fold(name);
    longest = Math.max(longest, n.length);
    if (n.includes(needle)) substring = true;
    bestDice = Math.max(bestDice, diceCoefficient(n, needle));
    bestLev = Math.min(bestLev, levenshtein(n, needle));
  }
  if (substring) return 2 + bestDice;
  if (needle.length < FUZZY_MIN_Q) return null;
  const levOk = bestLev <= 2 && bestLev / longest <= 0.4;
  if (bestDice >= DICE_MIN || levOk) return bestDice;
  return null;
}

function matchAreas(q: string): AreaSuggestion[] {
  const scored: Array<{ label: LebanonArea; score: number; index: number }> =
    [];
  for (let index = 0; index < LEBANON_AREAS.length; index += 1) {
    const label = LEBANON_AREAS[index]!;
    const score = areaMatchScore(label, q);
    if (score == null) continue;
    scored.push({ label, score, index });
  }
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.slice(0, AREA_LIMIT).map(({ label }) => {
    const center = AREA_COORDINATES[label];
    return {
      type: "area" as const,
      label,
      boundingBox: null,
      center: { lat: center.lat, lng: center.lng },
    };
  });
}

function useTrigram(q: string): boolean {
  return q.length >= FUZZY_MIN_Q;
}

async function matchUniversities(q: string): Promise<UniversitySuggestion[]> {
  const like = `%${q}%`;
  const fuzzy = useTrigram(q);
  const sim = sql<number>`GREATEST(
    similarity(${universities.name}::text, ${q}),
    similarity(${universities.slug}::text, ${q}),
    COALESCE(similarity(${institutions.name}::text, ${q}), 0),
    COALESCE(similarity(${institutions.shortName}::text, ${q}), 0),
    COALESCE(similarity(${institutions.slug}::text, ${q}), 0)
  )`;
  const fuzzyConds = fuzzy
    ? [
        sql`similarity(${universities.name}::text, ${q}) >= ${TRGM_MIN}`,
        sql`similarity(${universities.slug}::text, ${q}) >= ${TRGM_MIN}`,
        sql`similarity(COALESCE(${institutions.name}::text, ''), ${q}) >= ${TRGM_MIN}`,
        sql`similarity(COALESCE(${institutions.shortName}::text, ''), ${q}) >= ${TRGM_MIN}`,
        sql`similarity(COALESCE(${institutions.slug}::text, ''), ${q}) >= ${TRGM_MIN}`,
      ]
    : [];

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
          ...fuzzyConds,
        ),
      ),
    )
    .orderBy(desc(sim))
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
  const titleSim = sql<number>`similarity(${listings.title}::text, ${q})`;
  const titleFuzzy = useTrigram(q)
    ? sql`similarity(${listings.title}::text, ${q}) >= ${TRGM_MIN}`
    : undefined;
  const titleCond = ilike(listings.title, like);
  const matchCond =
    idCond || titleFuzzy
      ? or(titleCond, ...(idCond ? [idCond] : []), ...(titleFuzzy ? [titleFuzzy] : []))
      : titleCond;

  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      lng: sql<number | null>`ST_X(${listings.location}::geometry)`.as("lng"),
      lat: sql<number | null>`ST_Y(${listings.location}::geometry)`.as("lat"),
    })
    .from(listings)
    .where(and(eq(listings.status, "active"), matchCond))
    .orderBy(desc(titleSim))
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

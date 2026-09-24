import {
  EMPTY_BROWSE_FILTERS,
  type BrowseFiltersValue,
} from "@/lib/browseFiltersValue";
import { parsePreferences, hasAnswers } from "./preferences";
import type { MatcherPreferences } from "./types";

export type BrowseSort =
  | "newest"
  | "rent_asc"
  | "rent_desc"
  | "distance"
  | "match";
export type BrowseState = {
  filters: BrowseFiltersValue;
  mode: "standard" | "university";
  sort: BrowseSort;
  prefs: MatcherPreferences | null;
};
export type BrowseParams = Record<string, string | string[] | undefined>;
export const BROWSE_URL_KEYS = [
  "q",
  "campusId",
  "areas",
  "universitySlugs",
  "electricity",
  "water",
  "listingTypes",
  "genderRestrictions",
  "wifiIncluded",
  "studentsOnly",
  "minRentUsd",
  "maxRentUsd",
  "radiusKm",
  "sort",
  "match",
] as const;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const csv = (v: string | string[] | undefined) =>
  (one(v) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
function positive(v: string | string[] | undefined) {
  const n = Number(one(v));
  return Number.isFinite(n) && n > 0 ? n : null;
}
export function parseBrowseState(params: BrowseParams): BrowseState {
  const f: BrowseFiltersValue = {
    ...EMPTY_BROWSE_FILTERS,
    q: one(params.q)?.trim() || null,
    campusId: one(params.campusId) || null,
    areas: csv(params.areas).slice(0, 15),
    universitySlugs: csv(params.universitySlugs).slice(0, 1),
    electricity: csv(params.electricity).filter(
      (v): v is BrowseFiltersValue["electricity"][number] =>
        ["solar", "generator_24_7", "scheduled_cuts"].includes(v),
    ),
    water: csv(params.water).filter(
      (v): v is BrowseFiltersValue["water"][number] =>
        ["state_well_24_7", "tank_delivery"].includes(v),
    ),
    listingTypes: csv(params.listingTypes).filter(
      (v): v is BrowseFiltersValue["listingTypes"][number] =>
        [
          "studio",
          "entire_apartment",
          "private_room",
          "shared_dorm_bed",
          "pbsa_building",
        ].includes(v),
    ),
    genderRestrictions: csv(params.genderRestrictions).filter(
      (v): v is "boys_only" | "girls_only" =>
        ["boys_only", "girls_only"].includes(v),
    ),
    wifiIncluded: one(params.wifiIncluded) === "true",
    studentsOnly: one(params.studentsOnly) === "true",
    minRentUsd: positive(params.minRentUsd),
    maxRentUsd: positive(params.maxRentUsd),
    radiusKm: positive(params.radiusKm),
  };
  if (f.radiusKm && f.radiusKm > 100) f.radiusKm = null;
  if (f.minRentUsd && !Number.isInteger(f.minRentUsd)) f.minRentUsd = null;
  if (f.maxRentUsd && !Number.isInteger(f.maxRentUsd)) f.maxRentUsd = null;
  if (f.minRentUsd && f.maxRentUsd && f.minRentUsd > f.maxRentUsd) {
    f.minRentUsd = null;
    f.maxRentUsd = null;
  }
  const parsed = parsePreferences(one(params.match));
  const prefs = hasAnswers(parsed) ? parsed : null;
  const raw = one(params.sort);
  const sort: BrowseSort =
    raw &&
    ["newest", "rent_asc", "rent_desc", "distance", "match"].includes(raw)
      ? (raw as BrowseSort)
      : f.campusId || f.universitySlugs.length
        ? "distance"
        : "newest";
  return {
    filters: f,
    prefs,
    sort: sort === "match" && !prefs ? "newest" : sort,
    mode: f.campusId || f.universitySlugs.length ? "university" : "standard",
  };
}
export function serializeBrowseState(
  state: BrowseState,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = Object.fromEntries(
    BROWSE_URL_KEYS.map((k) => [k, undefined]),
  );
  const f = state.filters;
  for (const key of [
    "areas",
    "universitySlugs",
    "electricity",
    "water",
    "listingTypes",
    "genderRestrictions",
  ] as const)
    out[key] = f[key].length ? f[key].join(",") : undefined;
  for (const key of ["q", "campusId"] as const) out[key] = f[key] || undefined;
  for (const key of ["minRentUsd", "maxRentUsd", "radiusKm"] as const)
    out[key] = f[key] != null ? String(f[key]) : undefined;
  for (const key of ["wifiIncluded", "studentsOnly"] as const)
    out[key] = f[key] ? "true" : undefined;
  out.sort = state.sort === "newest" ? undefined : state.sort;
  out.match = state.prefs ? JSON.stringify(state.prefs) : undefined;
  return out;
}
export function browseParamsKey(params: BrowseParams) {
  return JSON.stringify(BROWSE_URL_KEYS.map((k) => [k, one(params[k]) ?? ""]));
}

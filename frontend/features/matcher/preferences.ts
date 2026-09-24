import {
  EMPTY_BROWSE_FILTERS,
  type BrowseFiltersValue,
} from "@/lib/browseFiltersValue";
import type { University } from "@/features/universities/useUniversities";
import { enumFact, numberFact } from "./facts";
import {
  DIMENSIONS,
  type Dimension,
  type MatcherPreferences,
  type MatchLocation,
} from "./types";

export function hasAnswers(
  p: MatcherPreferences | null,
): p is MatcherPreferences {
  return !!p && DIMENSIONS.some((d) => p[d]);
}
export function campusLocation(u: University): MatchLocation {
  return {
    kind: "campus",
    label: u.displayName ?? u.name,
    campusId: u.id,
    slug: u.slug,
    ...(u.lat != null && u.lng != null
      ? { center: { lat: u.lat, lng: u.lng } }
      : {}),
  };
}
export function prefillPreferences(
  filters: BrowseFiltersValue,
  universities: University[],
  saved?: MatcherPreferences | null,
): MatcherPreferences {
  const p: MatcherPreferences = { ...saved, version: 1 };
  const required = "required" as const;
  if (filters.listingTypes.length)
    p.type = { value: filters.listingTypes, importance: required };
  if (filters.minRentUsd != null || filters.maxRentUsd != null)
    p.budget = {
      value: { min: filters.minRentUsd, max: filters.maxRentUsd },
      importance: required,
    };
  if (filters.genderRestrictions.length)
    p.gender = { value: filters.genderRestrictions, importance: required };
  if (filters.electricity.length)
    p.power = { value: filters.electricity, importance: required };
  if (filters.wifiIncluded) p.wifi = { value: true, importance: required };
  const u = universities.find(
    (u) =>
      u.id === filters.campusId || filters.universitySlugs.includes(u.slug),
  );
  if (filters.areas.length)
    p.location = {
      value: {
        kind: "area",
        label: filters.areas.join(", "),
        areas: filters.areas,
        ...(p.location?.value.kind === "area" &&
        p.location.value.label === filters.areas.join(", ")
          ? { center: p.location.value.center }
          : {}),
      },
      importance: required,
    };
  else if (u)
    p.location = {
      value: { ...campusLocation(u), radiusKm: filters.radiusKm ?? undefined },
      importance: filters.radiusKm ? required : "prefer",
    };
  else if (filters.campusId || filters.universitySlugs.length)
    p.location = {
      value: {
        kind: "campus",
        label: filters.universitySlugs[0] ?? "Selected campus",
        campusId: filters.campusId ?? undefined,
        slug: filters.universitySlugs[0],
        radiusKm: filters.radiusKm ?? undefined,
      },
      importance: filters.radiusKm ? required : "prefer",
    };
  return p;
}

/** Preserve unrelated requirements; only the six guided dimensions are replaced. */
export function compilePreferences(
  base: BrowseFiltersValue,
  p: MatcherPreferences,
): BrowseFiltersValue {
  const f = {
    ...base,
    listingTypes: [],
    minRentUsd: null,
    maxRentUsd: null,
    electricity: [],
    wifiIncluded: false,
    genderRestrictions: [],
    areas: [],
    universitySlugs: [],
    campusId: null,
    institutionSlug: null,
    radiusKm: null,
  } as BrowseFiltersValue;
  if (p.type?.importance === "required") f.listingTypes = p.type.value;
  if (p.budget?.importance === "required") {
    f.minRentUsd = p.budget.value.min;
    f.maxRentUsd = p.budget.value.max;
  }
  if (p.gender) f.genderRestrictions = p.gender.value;
  if (p.power?.importance === "required") f.electricity = p.power.value;
  if (p.wifi?.importance === "required") f.wifiIncluded = true;
  if (p.location?.importance === "required") {
    const l = p.location.value;
    if (l.kind === "area") f.areas = l.areas ?? [];
    else {
      f.campusId = l.campusId ?? null;
      f.universitySlugs = l.slug ? [l.slug] : [];
      f.radiusKm = l.radiusKm ?? 2;
    }
  }
  return f;
}
const fields: Record<Dimension, (keyof BrowseFiltersValue)[]> = {
  type: ["listingTypes"],
  budget: ["minRentUsd", "maxRentUsd"],
  location: ["areas", "campusId", "universitySlugs", "radiusKm"],
  gender: ["genderRestrictions"],
  power: ["electricity"],
  wifi: ["wifiIncluded"],
};
export function reconcilePreferences(
  p: MatcherPreferences | null,
  before: BrowseFiltersValue,
  after: BrowseFiltersValue,
  universities: University[],
): MatcherPreferences | null {
  if (!p) return null;
  const next = { ...p };
  const fresh = prefillPreferences(after, universities);
  for (const d of DIMENSIONS)
    if (
      fields[d].some(
        (k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]),
      )
    ) {
      delete next[d];
      if (fresh[d]) Object.assign(next, { [d]: fresh[d] });
    }
  return hasAnswers(next) ? next : null;
}

/** Treat storage and URL state as untrusted; reject invalid answers without throwing. */
export function parsePreferences(input: unknown): MatcherPreferences | null {
  try {
    const raw = typeof input === "string" ? JSON.parse(input) : input;
    if (!raw || raw.version !== 1) return null;
    const p: MatcherPreferences = { version: 1 };
    for (const d of DIMENSIONS) {
      const a = raw[d];
      if (!a || !["prefer", "required"].includes(a.importance)) continue;
      const importance = d === "gender" ? "required" : a.importance;
      if (d === "type" || d === "gender" || d === "power") {
        const allowed =
          d === "type"
            ? [
                "studio",
                "entire_apartment",
                "private_room",
                "shared_dorm_bed",
                "pbsa_building",
              ]
            : d === "gender"
              ? ["boys_only", "girls_only"]
              : ["solar", "generator_24_7", "scheduled_cuts"];
        const value = Array.isArray(a.value)
          ? [...new Set(a.value.filter((v: unknown) => enumFact(v, allowed)))]
          : [];
        if (value.length) Object.assign(p, { [d]: { value, importance } });
      } else if (d === "wifi" && a.value === true)
        p.wifi = { value: true, importance };
      else if (d === "budget" && a.value) {
        const min = numberFact(a.value.min),
          max = numberFact(a.value.max);
        if (
          (min != null || max != null) &&
          (min == null || (Number.isInteger(min) && min > 0)) &&
          (max == null || (Number.isInteger(max) && max > 0)) &&
          !(min != null && max != null && min > max)
        )
          p.budget = { value: { min, max }, importance };
      } else if (
        d === "location" &&
        a.value &&
        typeof a.value.label === "string"
      ) {
        const l = a.value;
        const lat = numberFact(l.center?.lat),
          lng = numberFact(l.center?.lng);
        const center =
          lat != null &&
          lng != null &&
          Math.abs(lat) <= 90 &&
          Math.abs(lng) <= 180
            ? { lat, lng }
            : undefined;
        if (
          l.kind === "area" &&
          Array.isArray(l.areas) &&
          l.areas.some((s: unknown) => typeof s === "string" && s.length > 0)
        )
          p.location = {
            value: {
              kind: "area",
              label: l.label.slice(0, 200),
              areas: l.areas
                .filter((s: unknown) => typeof s === "string" && s.length > 0)
                .slice(0, 15),
              center,
            },
            importance,
          };
        if (
          l.kind === "campus" &&
          (typeof l.campusId === "string" || typeof l.slug === "string")
        )
          p.location = {
            value: {
              kind: "campus",
              label: l.label.slice(0, 200),
              campusId: typeof l.campusId === "string" ? l.campusId : undefined,
              slug: typeof l.slug === "string" ? l.slug : undefined,
              center,
              radiusKm:
                typeof l.radiusKm === "number" &&
                l.radiusKm > 0 &&
                l.radiusKm <= 100
                  ? l.radiusKm
                  : undefined,
            },
            importance,
          };
      }
    }
    return p;
  } catch {
    return null;
  }
}
export function existingFilterLabels(f: BrowseFiltersValue) {
  return [
    f.q ? `Search: ${f.q}` : null,
    f.studentsOnly ? "Students only" : null,
    ...f.water.map((w) =>
      w === "state_well_24_7" ? "24/7 state/well water" : "Tank delivery water",
    ),
  ].filter((s): s is string => !!s);
}
export { EMPTY_BROWSE_FILTERS };

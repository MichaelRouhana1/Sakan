import type { SearchUniversitySuggestion } from "@/features/search/types";
import { campusFilterLabel } from "@/features/universities/useInstitutions";
import type { University } from "@/features/universities/useUniversities";

function norm(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function campusExactMatches(q: string, campus: University): boolean {
  const needle = norm(q);
  if (!needle) return false;
  return (
    needle === norm(campus.institutionShortName) ||
    needle === norm(campus.institutionSlug) ||
    needle === norm(campus.slug) ||
    needle === norm(campus.institutionName) ||
    needle === norm(campus.name) ||
    needle === norm(campus.displayName) ||
    needle === norm(campus.mapLabel)
  );
}

/** Exact catalog hit for typed Enter. Multi-campus institutions prefer isMain. */
export function resolveCampusFromTypedQuery(
  q: string,
  campuses: University[],
): University | null {
  if (campuses.length === 0) return null;
  const matches = campuses.filter((c) => campusExactMatches(q, c));
  if (matches.length === 0) return null;
  return matches.find((c) => c.isMain) ?? matches[0] ?? null;
}

export function universityToSuggestion(
  campus: University,
): SearchUniversitySuggestion | null {
  if (campus.lat == null || campus.lng == null) return null;
  return {
    type: "university",
    label: campusFilterLabel(campus),
    campusId: campus.id,
    slug: campus.slug,
    center: { lat: campus.lat, lng: campus.lng },
  };
}

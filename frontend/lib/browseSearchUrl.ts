import type { Href } from "expo-router";

/** Browse URL query keys for search hydrate / sync. */
export type BrowseSearchUrlParams = {
  q?: string | null;
  campusId?: string | null;
  areas?: string | null;
  universitySlugs?: string | null;
};

/** Build params object omitting empty keys (for router.setParams / push). */
export function browseSearchParams(input: {
  q?: string | null;
  campusId?: string | null;
  areas?: string[];
  universitySlugs?: string[];
}): Record<string, string> {
  const out: Record<string, string> = {};
  if (input.q?.trim()) out.q = input.q.trim();
  if (input.campusId?.trim()) out.campusId = input.campusId.trim();
  if (input.areas && input.areas.length > 0) {
    out.areas = input.areas.join(",");
  }
  if (input.universitySlugs && input.universitySlugs.length > 0) {
    out.universitySlugs = input.universitySlugs.join(",");
  }
  return out;
}

/** Expo Router needs undefined to clear — pass empty string cleared keys as undefined. */
export function browseSearchSetParams(input: {
  q?: string | null;
  campusId?: string | null;
  areas?: string[];
  universitySlugs?: string[];
}): Record<string, string | undefined> {
  return {
    q: input.q?.trim() || undefined,
    campusId: input.campusId?.trim() || undefined,
    areas:
      input.areas && input.areas.length > 0
        ? input.areas.join(",")
        : undefined,
    universitySlugs:
      input.universitySlugs && input.universitySlugs.length > 0
        ? input.universitySlugs.join(",")
        : undefined,
  };
}

export function homeBrowseHref(input: {
  q?: string;
  campusId?: string;
  areas?: string[];
  universitySlugs?: string[];
}): Href {
  const params = browseSearchParams(input);
  if (Object.keys(params).length === 0) {
    return "/search" as Href;
  }
  return { pathname: "/search", params } as Href;
}

export function parseCsvParam(value: string | string[] | undefined): string[] {
  if (value == null) return [];
  const raw = Array.isArray(value) ? value.join(",") : value;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

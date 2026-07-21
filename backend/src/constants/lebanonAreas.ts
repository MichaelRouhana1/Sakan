/**
 * Lebanese districts / cities — keep in sync with frontend/constants/areas.ts.
 * Used to allowlist `areas` query params on GET /api/listings.
 */
export const LEBANON_AREAS = [
  "Achrafieh",
  "Mar Mikhael",
  "Gemmayzeh",
  "Hamra",
  "Ras Beirut",
  "Verdun",
  "Jnah",
  "Jounieh",
  "Byblos",
  "Tripoli",
  "Saida",
  "Zahle",
  "Broummana",
  "Dbayeh",
  "Antelias",
] as const;

export type LebanonArea = (typeof LEBANON_AREAS)[number];

export const LEBANON_AREA_SET = new Set<string>(LEBANON_AREAS);

export const MAX_LISTING_AREAS = 15;
/** Hub distance sort: one campus at a time. */
export const MAX_UNIVERSITY_SLUGS = 1;

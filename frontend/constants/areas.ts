/** Soft caps — keep in sync with backend/src/constants/lebanonAreas.ts */
export const MAX_LISTING_AREAS = 15;
/** Hub: one campus at a time for distance sort. */
export const MAX_UNIVERSITY_SLUGS = 1;

/** Lebanese districts / cities for Standard search mode. */
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

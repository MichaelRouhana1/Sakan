/**
 * Lebanese neighborhood catalog — keep in sync with
 * frontend/constants/lebanonZones.ts flatten.
 * Used to allowlist `areas` query params and listing.area writes.
 */
export const LEBANON_AREAS = [
  "Achrafieh",
  "Mar Mikhael",
  "Gemmayzeh",
  "Hamra",
  "Ras Beirut",
  "Verdun",
  "Jnah",
  "Badaro",
  "Furn El Chebbak",
  "Tariq El Jdide",
  "Broummana",
  "Dbayeh",
  "Antelias",
  "Fanar",
  "Dekwaneh",
  "Jounieh",
  "Kaslik",
  "Zouk Mosbeh",
  "Byblos",
  "Aley",
  "Bhamdoun",
  "Tripoli",
  "Saida",
  "Tyre",
  "Nabatieh",
  "Zahle",
  "Baalbek",
] as const;

export type LebanonArea = (typeof LEBANON_AREAS)[number];

export const LEBANON_AREA_SET = new Set<string>(LEBANON_AREAS);

/** Max Cities filter chips — not catalog length. */
export const MAX_LISTING_AREAS = 15;
/** Hub distance sort: one campus at a time. */
export const MAX_UNIVERSITY_SLUGS = 1;

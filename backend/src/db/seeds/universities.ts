/**
 * Static campus-gate pins for University Hub mode.
 * Coordinates are approximate gate locations (WGS84); refine before production.
 * WKT format: POINT(longitude latitude)
 */
export const universitySeeds = [
  {
    name: "American University of Beirut (AUB)",
    slug: "aub",
    location: "POINT(35.4823 33.8998)",
  },
  {
    name: "Lebanese American University — Byblos (LAU Jbeil)",
    slug: "lau-jbeil",
    location: "POINT(35.6481 34.1217)",
  },
  {
    name: "Université Saint-Joseph — Huvelin (USJ)",
    slug: "usj-huvelin",
    location: "POINT(35.5186 33.8912)",
  },
  {
    name: "Lebanese University — Fanar (LU)",
    slug: "lu-fanar",
    location: "POINT(35.5689 33.8795)",
  },
  {
    name: "Notre Dame University — Louaize (NDU)",
    slug: "ndu-louaize",
    location: "POINT(35.6167 33.9833)",
  },
  {
    name: "University of Balamand",
    slug: "balamand",
    location: "POINT(35.7833 34.3667)",
  },
] as const;

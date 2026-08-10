/**
 * Demo rental seeds for Skoun browse/map — 10 student-oriented Lebanon pins.
 * Coords sit near university gates so PostGIS hub distance is realistic.
 * Photo sources: Unsplash (downloaded at seed time into uploads/).
 */

export type ListingSeed = {
  listingType:
    | "entire_apartment"
    | "studio"
    | "private_room"
    | "shared_dorm_bed";
  targetAudience: "anyone" | "students_only";
  genderRestriction?: "anyone" | "boys_only" | "girls_only";
  monthlyRentUsd: number;
  electricity: "solar" | "generator_24_7" | "scheduled_cuts";
  water: "state_well_24_7" | "tank_delivery";
  wifiIncluded: boolean;
  routerUps: boolean;
  elevator24_7: boolean;
  area: string;
  /** Shown as the Amber-style card title. */
  landmark: string;
  /** WKT POINT(lng lat) */
  location: string;
  /** Unsplash source URLs (downloaded into /uploads/listings). */
  photoSources: string[];
};

function unsplash(id: string): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;
}

/**
 * Gate pins (from universitySeeds) for reference:
 * AUB          POINT(35.4823 33.8998)
 * LAU Jbeil    POINT(35.6481 34.1217)
 * USJ Huvelin  POINT(35.5186 33.8912)
 * LU Fanar     POINT(35.5689 33.8795)
 */
export const listingSeeds: ListingSeed[] = [
  // ── Hamra / Bliss · AUB ──────────────────────────────────────────
  {
    listingType: "studio",
    targetAudience: "students_only",
    genderRestriction: "anyone",
    monthlyRentUsd: 650,
    electricity: "generator_24_7",
    water: "state_well_24_7",
    wifiIncluded: true,
    routerUps: true,
    elevator24_7: false,
    area: "Hamra",
    landmark: "Bliss Studio near Main Gate",
    location: "POINT(35.4816 33.8989)",
    photoSources: [
      unsplash("photo-1522708323590-d24dbb6b0267"),
      unsplash("photo-1502672260266-1c1ef2d93688"),
      unsplash("photo-1484154218962-a197022b5858"),
    ],
  },
  {
    listingType: "private_room",
    targetAudience: "students_only",
    genderRestriction: "girls_only",
    monthlyRentUsd: 420,
    electricity: "generator_24_7",
    water: "state_well_24_7",
    wifiIncluded: true,
    routerUps: true,
    elevator24_7: true,
    area: "Hamra",
    landmark: "Quiet private room off Bliss",
    location: "POINT(35.4808 33.8978)",
    photoSources: [
      unsplash("photo-1493809842364-78817add7ffb"),
      unsplash("photo-1612320648993-61c1cd604b71"),
      unsplash("photo-1586023492125-27b2c045efd7"),
    ],
  },
  {
    listingType: "shared_dorm_bed",
    targetAudience: "students_only",
    genderRestriction: "girls_only",
    monthlyRentUsd: 280,
    electricity: "scheduled_cuts",
    water: "tank_delivery",
    wifiIncluded: true,
    routerUps: false,
    elevator24_7: false,
    area: "Hamra",
    landmark: "Girls foyer bed near AUB",
    location: "POINT(35.4831 33.9004)",
    photoSources: [
      unsplash("photo-1689043528099-2ba014dd7c64"),
      unsplash("photo-1555854877-bab0e564b8d5"),
      unsplash("photo-1631049307264-da0ec9d70304"),
    ],
  },
  {
    listingType: "entire_apartment",
    targetAudience: "anyone",
    genderRestriction: "anyone",
    monthlyRentUsd: 1100,
    electricity: "solar",
    water: "state_well_24_7",
    wifiIncluded: true,
    routerUps: true,
    elevator24_7: true,
    area: "Hamra",
    landmark: "Sunny 1BR steps from Hamra Street",
    location: "POINT(35.4828 33.8965)",
    photoSources: [
      unsplash("photo-1560448204-e02f11c3d0e2"),
      unsplash("photo-1583847268964-b28dc8f51f92"),
      unsplash("photo-1560185127-6ed189bf02f4"),
    ],
  },

  // ── Byblos · LAU Jbeil ───────────────────────────────────────────
  {
    listingType: "studio",
    targetAudience: "students_only",
    genderRestriction: "anyone",
    monthlyRentUsd: 550,
    electricity: "generator_24_7",
    water: "state_well_24_7",
    wifiIncluded: true,
    routerUps: true,
    elevator24_7: false,
    area: "Byblos",
    landmark: "LAU-ready studio in Old Souk area",
    location: "POINT(35.6474 34.1206)",
    photoSources: [
      unsplash("photo-1606074280798-2dabb75ce10c"),
      unsplash("photo-1675279200694-8529c73b1fd0"),
      unsplash("photo-1522771739844-6a9f6d5f14af"),
    ],
  },
  {
    listingType: "shared_dorm_bed",
    targetAudience: "students_only",
    genderRestriction: "boys_only",
    monthlyRentUsd: 250,
    electricity: "scheduled_cuts",
    water: "tank_delivery",
    wifiIncluded: true,
    routerUps: true,
    elevator24_7: false,
    area: "Byblos",
    landmark: "Boys foyer near LAU Byblos",
    location: "POINT(35.6490 34.1224)",
    photoSources: [
      unsplash("photo-1555854877-bab0e564b8d5"),
      unsplash("photo-1738168279272-c08d6dd22002"),
      unsplash("photo-1595526114035-0d45ed16cfbf"),
    ],
  },

  // ── Achrafieh / Huvelin · USJ ────────────────────────────────────
  {
    listingType: "entire_apartment",
    targetAudience: "students_only",
    genderRestriction: "anyone",
    monthlyRentUsd: 950,
    electricity: "generator_24_7",
    water: "state_well_24_7",
    wifiIncluded: true,
    routerUps: true,
    elevator24_7: true,
    area: "Achrafieh",
    landmark: "Huvelin flat near USJ campus",
    location: "POINT(35.5192 33.8906)",
    photoSources: [
      unsplash("photo-1613575831056-0acd5da8f085"),
      unsplash("photo-1665249934445-1de680641f50"),
      unsplash("photo-1616486338812-3dadae4b4ace"),
    ],
  },
  {
    listingType: "private_room",
    targetAudience: "students_only",
    genderRestriction: "girls_only",
    monthlyRentUsd: 380,
    electricity: "solar",
    water: "state_well_24_7",
    wifiIncluded: true,
    routerUps: false,
    elevator24_7: true,
    area: "Achrafieh",
    landmark: "Private room by Sassine & Huvelin",
    location: "POINT(35.5178 33.8919)",
    photoSources: [
      unsplash("photo-1564078516393-cf04bd966897"),
      unsplash("photo-1614607242094-b1b2cf769ff3"),
      unsplash("photo-1505693416388-ac5ce068fe85"),
    ],
  },

  // ── Fanar & Dekwaneh · LU ────────────────────────────────────────
  {
    listingType: "studio",
    targetAudience: "students_only",
    genderRestriction: "anyone",
    monthlyRentUsd: 480,
    electricity: "generator_24_7",
    water: "tank_delivery",
    wifiIncluded: true,
    routerUps: true,
    elevator24_7: false,
    area: "Fanar",
    landmark: "Compact studio near LU Fanar",
    location: "POINT(35.5676 33.8789)",
    photoSources: [
      unsplash("photo-1631049307264-da0ec9d70304"),
      unsplash("photo-1522708323590-d24dbb6b0267"),
      unsplash("photo-1493809842364-78817add7ffb"),
    ],
  },
  {
    listingType: "private_room",
    targetAudience: "students_only",
    genderRestriction: "boys_only",
    monthlyRentUsd: 320,
    electricity: "scheduled_cuts",
    water: "tank_delivery",
    wifiIncluded: true,
    routerUps: false,
    elevator24_7: false,
    area: "Dekwaneh",
    landmark: "Affordable room in Dekwaneh",
    location: "POINT(35.5448 33.8752)",
    photoSources: [
      unsplash("photo-1595526114035-0d45ed16cfbf"),
      unsplash("photo-1484154218962-a197022b5858"),
      unsplash("photo-1586023492125-27b2c045efd7"),
    ],
  },
];

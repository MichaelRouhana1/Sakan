/**
 * Demo rental seeds for Skoun browse/map.
 * Photo sources: Unsplash (free license) — downloaded at seed time into uploads/.
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
  landmark: string;
  /** WKT POINT(lng lat) */
  location: string;
  /** Unsplash source URLs (downloaded into /uploads/listings). */
  photoSources: string[];
};

function unsplash(id: string): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;
}

export const listingSeeds: ListingSeed[] = [
  {
    listingType: "studio",
    targetAudience: "students_only",
    genderRestriction: "girls_only",
    monthlyRentUsd: 750,
    electricity: "generator_24_7",
    water: "state_well_24_7",
    wifiIncluded: true,
    routerUps: true,
    elevator24_7: false,
    area: "Hamra",
    landmark: "Near Hamra Street",
    location: "POINT(35.4818 33.8969)",
    photoSources: [
      unsplash("photo-1522708323590-d24dbb6b0267"),
      unsplash("photo-1484154218962-a197022b5858"),
    ],
  },
  {
    listingType: "entire_apartment",
    targetAudience: "anyone",
    monthlyRentUsd: 1200,
    electricity: "solar",
    water: "state_well_24_7",
    wifiIncluded: true,
    routerUps: true,
    elevator24_7: true,
    area: "Hamra",
    landmark: "Near Bliss Street",
    // Same building cluster as above (~same spot) for map group UX.
    location: "POINT(35.48185 33.89695)",
    photoSources: [
      unsplash("photo-1560448204-e02f11c3d0e2"),
      unsplash("photo-1583847268964-b28dc8f51f92"),
    ],
  },
  {
    listingType: "private_room",
    targetAudience: "students_only",
    genderRestriction: "boys_only",
    monthlyRentUsd: 450,
    electricity: "scheduled_cuts",
    water: "tank_delivery",
    wifiIncluded: true,
    routerUps: false,
    elevator24_7: false,
    area: "Ras Beirut",
    landmark: "Near AUB Main Gate",
    location: "POINT(35.4805 33.9002)",
    photoSources: [
      unsplash("photo-1493809842364-78817add7ffb"),
      unsplash("photo-1612320648993-61c1cd604b71"),
    ],
  },
  {
    listingType: "entire_apartment",
    targetAudience: "anyone",
    monthlyRentUsd: 1600,
    electricity: "generator_24_7",
    water: "state_well_24_7",
    wifiIncluded: true,
    routerUps: true,
    elevator24_7: true,
    area: "Achrafieh",
    landmark: "Near Sassine Square",
    location: "POINT(35.5195 33.8878)",
    photoSources: [
      unsplash("photo-1613575831056-0acd5da8f085"),
      unsplash("photo-1665249934445-1de680641f50"),
    ],
  },
  {
    listingType: "studio",
    targetAudience: "anyone",
    monthlyRentUsd: 800,
    electricity: "solar",
    water: "tank_delivery",
    wifiIncluded: true,
    routerUps: false,
    elevator24_7: true,
    area: "Mar Mikhael",
    landmark: "Near Mar Mikhael train tracks",
    location: "POINT(35.5282 33.8975)",
    photoSources: [
      unsplash("photo-1606074280798-2dabb75ce10c"),
      unsplash("photo-1675279200694-8529c73b1fd0"),
    ],
  },
  {
    listingType: "entire_apartment",
    targetAudience: "anyone",
    monthlyRentUsd: 1400,
    electricity: "generator_24_7",
    water: "state_well_24_7",
    wifiIncluded: true,
    routerUps: true,
    elevator24_7: true,
    area: "Gemmayzeh",
    landmark: "Near Gouraud Street",
    location: "POINT(35.5142 33.8968)",
    photoSources: [
      unsplash("photo-1564078516393-cf04bd966897"),
      unsplash("photo-1614607242094-b1b2cf769ff3"),
    ],
  },
  {
    listingType: "shared_dorm_bed",
    targetAudience: "students_only",
    monthlyRentUsd: 280,
    electricity: "scheduled_cuts",
    water: "tank_delivery",
    wifiIncluded: true,
    routerUps: false,
    elevator24_7: false,
    area: "Verdun",
    landmark: "Near Verdun Mall",
    location: "POINT(35.4840 33.8845)",
    photoSources: [
      unsplash("photo-1689043528099-2ba014dd7c64"),
      unsplash("photo-1738168279272-c08d6dd22002"),
    ],
  },
  {
    listingType: "entire_apartment",
    targetAudience: "anyone",
    monthlyRentUsd: 1100,
    electricity: "solar",
    water: "state_well_24_7",
    wifiIncluded: true,
    routerUps: true,
    elevator24_7: false,
    area: "Jounieh",
    landmark: "Near Kaslik",
    location: "POINT(35.6475 33.9820)",
    photoSources: [
      unsplash("photo-1616486338812-3dadae4b4ace"),
      unsplash("photo-1522708323590-d24dbb6b0267"),
    ],
  },
  {
    listingType: "studio",
    targetAudience: "students_only",
    monthlyRentUsd: 650,
    electricity: "generator_24_7",
    water: "state_well_24_7",
    wifiIncluded: true,
    routerUps: true,
    elevator24_7: true,
    area: "Dbayeh",
    landmark: "Near Waterfront City",
    location: "POINT(35.5975 33.9355)",
    photoSources: [
      unsplash("photo-1583847268964-b28dc8f51f92"),
      unsplash("photo-1484154218962-a197022b5858"),
    ],
  },
  {
    listingType: "private_room",
    targetAudience: "anyone",
    monthlyRentUsd: 500,
    electricity: "scheduled_cuts",
    water: "tank_delivery",
    wifiIncluded: false,
    routerUps: false,
    elevator24_7: false,
    area: "Broummana",
    landmark: "Near Broummana Main Road",
    location: "POINT(35.6205 33.8825)",
    photoSources: [
      unsplash("photo-1493809842364-78817add7ffb"),
      unsplash("photo-1560448204-e02f11c3d0e2"),
    ],
  },
];

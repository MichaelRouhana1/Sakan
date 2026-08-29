/**
 * Cities browse catalog — governorate → district → neighborhood.
 * Flattened names are LEBANON_AREAS (keep backend lebanonAreas.ts in sync).
 */
export type LebanonZoneDistrict = {
  slug: string;
  name: string;
  neighborhoods: readonly string[];
};

export type LebanonZoneGovernorate = {
  slug: string;
  name: string;
  arabicName: string;
  districts: readonly LebanonZoneDistrict[];
};

export type LebanonAreaGroup = {
  governorate: string;
  areas: string[];
};

export const LEBANON_ZONE_TREE: readonly LebanonZoneGovernorate[] = [
  {
    slug: "beirut",
    name: "Beirut",
    arabicName: "بيروت",
    districts: [
      {
        slug: "beirut",
        name: "Beirut",
        neighborhoods: [
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
        ],
      },
    ],
  },
  {
    slug: "mount-lebanon",
    name: "Mount Lebanon",
    arabicName: "جبل لبنان",
    districts: [
      {
        slug: "matn",
        name: "Matn",
        neighborhoods: [
          "Broummana",
          "Dbayeh",
          "Antelias",
          "Fanar",
          "Dekwaneh",
        ],
      },
      {
        slug: "keserwan",
        name: "Keserwan",
        neighborhoods: ["Jounieh", "Kaslik", "Zouk Mosbeh"],
      },
      {
        slug: "jbeil",
        name: "Jbeil",
        neighborhoods: ["Byblos"],
      },
      {
        slug: "aley",
        name: "Aley",
        neighborhoods: ["Aley", "Bhamdoun"],
      },
    ],
  },
  {
    slug: "north",
    name: "North",
    arabicName: "الشمال",
    districts: [
      {
        slug: "tripoli",
        name: "Tripoli",
        neighborhoods: ["Tripoli"],
      },
    ],
  },
  {
    slug: "south",
    name: "South",
    arabicName: "الجنوب",
    districts: [
      {
        slug: "sidon",
        name: "Sidon",
        neighborhoods: ["Saida"],
      },
      {
        slug: "tyre",
        name: "Tyre",
        neighborhoods: ["Tyre"],
      },
    ],
  },
  {
    slug: "nabatieh",
    name: "Nabatieh",
    arabicName: "النبطية",
    districts: [
      {
        slug: "nabatieh",
        name: "Nabatieh",
        neighborhoods: ["Nabatieh"],
      },
    ],
  },
  {
    slug: "beqaa",
    name: "Beqaa",
    arabicName: "البقاع",
    districts: [
      {
        slug: "zahle",
        name: "Zahle",
        neighborhoods: ["Zahle"],
      },
    ],
  },
  {
    slug: "baalbek-hermel",
    name: "Baalbek-Hermel",
    arabicName: "بعلبك الهرمل",
    districts: [
      {
        slug: "baalbek",
        name: "Baalbek",
        neighborhoods: ["Baalbek"],
      },
    ],
  },
] as const;

export function flattenLebanonAreas(): string[] {
  return LEBANON_ZONE_TREE.flatMap((gov) =>
    gov.districts.flatMap((district) => [...district.neighborhoods]),
  );
}

export function lebanonAreaGroups(query = ""): LebanonAreaGroup[] {
  const needle = query.trim().toLowerCase();
  return LEBANON_ZONE_TREE.map((gov) => ({
    governorate: gov.name,
    areas: gov.districts
      .flatMap((district) => [...district.neighborhoods])
      .filter((name) => !needle || name.toLowerCase().includes(needle)),
  })).filter((group) => group.areas.length > 0);
}

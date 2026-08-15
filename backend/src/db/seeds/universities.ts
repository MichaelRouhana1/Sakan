/**
 * MEHE-accredited private universities in Lebanon + official campuses.
 * Coordinates are gate-approximate WGS84 (same as existing Hub seeds).
 * WKT: POINT(longitude latitude)
 * Inactive / foreign / public (LU) / institutes are omitted.
 */

export type CampusSeed = {
  name: string;
  slug: string;
  city: string;
  location: string;
  isMain?: boolean;
};

export type InstitutionSeed = {
  name: string;
  shortName: string;
  slug: string;
  website: string;
  popular?: boolean;
  campuses: CampusSeed[];
};

export const institutionSeeds: InstitutionSeed[] = [
  {
    name: "American University of Beirut",
    shortName: "AUB",
    slug: "aub",
    website: "https://www.aub.edu.lb",
    popular: true,
    campuses: [
      {
        name: "Ras Beirut Campus",
        slug: "aub",
        city: "Beirut",
        location: "POINT(35.4823 33.8998)",
        isMain: true,
      },
    ],
  },
  {
    name: "Lebanese American University",
    shortName: "LAU",
    slug: "lau",
    website: "https://www.lau.edu.lb",
    popular: true,
    campuses: [
      {
        name: "Beirut Campus",
        slug: "lau-beirut",
        city: "Beirut",
        location: "POINT(35.4782 33.8931)",
        isMain: true,
      },
      {
        name: "Byblos Campus",
        slug: "lau-jbeil",
        city: "Byblos",
        location: "POINT(35.6481 34.1217)",
      },
    ],
  },
  {
    name: "Université Saint-Joseph de Beyrouth",
    shortName: "USJ",
    slug: "usj",
    website: "https://www.usj.edu.lb",
    popular: true,
    campuses: [
      {
        name: "Medical Sciences Campus",
        slug: "usj-csm",
        city: "Beirut",
        location: "POINT(35.5152 33.8784)",
      },
      {
        name: "François Debbané Social Sciences Campus",
        slug: "usj-huvelin",
        city: "Beirut",
        location: "POINT(35.5186 33.8912)",
        isMain: true,
      },
      {
        name: "Science and Technology Campus",
        slug: "usj-cst",
        city: "Mkalles",
        location: "POINT(35.5601 33.8692)",
      },
      {
        name: "Humanities Campus",
        slug: "usj-csh",
        city: "Beirut",
        location: "POINT(35.5141 33.8801)",
      },
      {
        name: "Innovation and Sports Campus",
        slug: "usj-cis",
        city: "Beirut",
        location: "POINT(35.5164 33.8818)",
      },
      {
        name: "Charles Corm Campus",
        slug: "usj-corm",
        city: "Beirut",
        location: "POINT(35.5082 33.8954)",
      },
      {
        name: "North Lebanon Campus",
        slug: "usj-cln",
        city: "Ras Maska",
        location: "POINT(35.8502 34.3981)",
      },
      {
        name: "South Lebanon Campus",
        slug: "usj-cls",
        city: "Saida",
        location: "POINT(35.3724 33.5608)",
      },
      {
        name: "Zahle and Beqaa Campus",
        slug: "usj-czb",
        city: "Zahle",
        location: "POINT(35.9072 33.8461)",
      },
    ],
  },
  {
    name: "Notre Dame University–Louaize",
    shortName: "NDU",
    slug: "ndu",
    website: "https://www.ndu.edu.lb",
    popular: true,
    campuses: [
      {
        name: "Zouk Mosbeh Main Campus",
        slug: "ndu-louaize",
        city: "Zouk Mosbeh",
        location: "POINT(35.6167 33.9833)",
        isMain: true,
      },
      {
        name: "North Lebanon Campus",
        slug: "ndu-nlc",
        city: "Barsa",
        location: "POINT(35.7962 34.3164)",
      },
      {
        name: "Shouf Campus",
        slug: "ndu-shouf",
        city: "Deir El Qamar",
        location: "POINT(35.5631 33.6972)",
      },
    ],
  },
  {
    name: "Antonine University",
    shortName: "UA",
    slug: "ua",
    website: "https://www.ua.edu.lb",
    popular: true,
    campuses: [
      {
        name: "Hadat–Baabda Main Campus",
        slug: "ua-hadat-baabda",
        city: "Baabda",
        location: "POINT(35.5442 33.8346)",
        isMain: true,
      },
      {
        name: "Nabi Ayla–Zahle Campus",
        slug: "ua-nabi-ayla",
        city: "Zahle",
        location: "POINT(35.9214 33.8468)",
      },
      {
        name: "Mejdlaya–Zgharta Campus",
        slug: "ua-mejdlaya",
        city: "Zgharta",
        location: "POINT(35.8941 34.3976)",
      },
    ],
  },
  {
    name: "Holy Spirit University of Kaslik",
    shortName: "USEK",
    slug: "usek",
    website: "https://www.usek.edu.lb",
    popular: true,
    campuses: [
      {
        name: "Kaslik Main Campus",
        slug: "usek-kaslik",
        city: "Jounieh",
        location: "POINT(35.6184 33.9806)",
        isMain: true,
      },
      {
        name: "Zahle Regional University Center",
        slug: "usek-zahle",
        city: "Zahle",
        location: "POINT(35.8988 33.8492)",
      },
    ],
  },
  {
    name: "Beirut Arab University",
    shortName: "BAU",
    slug: "bau",
    website: "https://www.bau.edu.lb",
    popular: true,
    campuses: [
      {
        name: "Beirut Campus",
        slug: "bau-beirut",
        city: "Beirut",
        location: "POINT(35.4956 33.8732)",
        isMain: true,
      },
      {
        name: "Debbieh Campus",
        slug: "bau-debbieh",
        city: "Debbieh",
        location: "POINT(35.4668 33.6954)",
      },
      {
        name: "Tripoli Campus",
        slug: "bau-tripoli",
        city: "Tripoli",
        location: "POINT(35.8348 34.4512)",
      },
      {
        name: "Bekaa Campus",
        slug: "bau-bekaa",
        city: "Jdeideh El Fekiha",
        location: "POINT(36.0214 34.0218)",
      },
    ],
  },
  {
    name: "University of Balamand",
    shortName: "UOB",
    slug: "uob",
    website: "https://www.balamand.edu.lb",
    popular: true,
    campuses: [
      {
        name: "Al Koura Campus",
        slug: "balamand",
        city: "Koura",
        location: "POINT(35.7833 34.3667)",
        isMain: true,
      },
      {
        name: "Dekouaneh Campus",
        slug: "uob-dekouaneh",
        city: "Dekouaneh",
        location: "POINT(35.5668 33.8784)",
      },
      {
        name: "Beino–Akkar Campus",
        slug: "uob-beino",
        city: "Beino",
        location: "POINT(36.1542 34.5216)",
      },
      {
        name: "Souk El Gharb Campus",
        slug: "uob-souk-el-gharb",
        city: "Souk El Gharb",
        location: "POINT(35.5618 33.7936)",
      },
    ],
  },
  {
    name: "Lebanese International University",
    shortName: "LIU",
    slug: "liu",
    website: "https://www.liu.edu.lb",
    campuses: [
      {
        name: "Beirut Campus",
        slug: "liu-beirut",
        city: "Beirut",
        location: "POINT(35.4952 33.8788)",
        isMain: true,
      },
      {
        name: "Bekaa Campus",
        slug: "liu-bekaa",
        city: "Al Khyara",
        location: "POINT(35.8214 33.6148)",
      },
      {
        name: "Saida Campus",
        slug: "liu-saida",
        city: "Saida",
        location: "POINT(35.3718 33.5572)",
      },
      {
        name: "Nabatieh Campus",
        slug: "liu-nabatieh",
        city: "Nabatieh",
        location: "POINT(35.4836 33.3784)",
      },
      {
        name: "Tripoli Campus",
        slug: "liu-tripoli",
        city: "Tripoli",
        location: "POINT(35.8442 34.4168)",
      },
      {
        name: "Mount Lebanon Campus",
        slug: "liu-mount-lebanon",
        city: "Sin El Fil",
        location: "POINT(35.5426 33.8782)",
      },
      {
        name: "Tyre Campus",
        slug: "liu-tyre",
        city: "Tyre",
        location: "POINT(35.2204 33.2736)",
      },
      {
        name: "Rayak Campus",
        slug: "liu-rayak",
        city: "Rayak",
        location: "POINT(36.0218 33.8514)",
      },
      {
        name: "Halba–Akkar Campus",
        slug: "liu-halba",
        city: "Halba",
        location: "POINT(36.0784 34.5422)",
      },
    ],
  },
  {
    name: "Université La Sagesse",
    shortName: "ULS",
    slug: "uls",
    website: "https://www.uls.edu.lb",
    campuses: [
      {
        name: "Furn El Chebbak Campus",
        slug: "uls-furn",
        city: "Beirut",
        location: "POINT(35.5218 33.8684)",
        isMain: true,
      },
    ],
  },
  {
    name: "Middle East University",
    shortName: "MEU",
    slug: "meu",
    website: "https://www.meu.edu.lb",
    campuses: [
      {
        name: "Sabtieh Campus",
        slug: "meu-sabtieh",
        city: "Beirut",
        location: "POINT(35.5482 33.8716)",
        isMain: true,
      },
    ],
  },
  {
    name: "Haigazian University",
    shortName: "HU",
    slug: "haigazian",
    website: "https://www.haigazian.edu.lb",
    campuses: [
      {
        name: "Kantari Campus",
        slug: "haigazian-kantari",
        city: "Beirut",
        location: "POINT(35.5018 33.8956)",
        isMain: true,
      },
    ],
  },
  {
    name: "Islamic University of Lebanon",
    shortName: "IUL",
    slug: "iul",
    website: "https://www.iul.edu.lb",
    campuses: [
      {
        name: "Khalde Campus",
        slug: "iul-khalde",
        city: "Khalde",
        location: "POINT(35.4762 33.7774)",
        isMain: true,
      },
      {
        name: "Wardanieh Campus",
        slug: "iul-wardanieh",
        city: "Wardanieh",
        location: "POINT(35.4218 33.6124)",
      },
      {
        name: "Tyre Campus",
        slug: "iul-tyre",
        city: "Tyre",
        location: "POINT(35.2036 33.2708)",
      },
    ],
  },
  {
    name: "Beirut Islamic University",
    shortName: "BIU",
    slug: "biu",
    website: "https://www.biu.edu.lb",
    campuses: [
      {
        name: "Beirut Campus",
        slug: "biu-beirut",
        city: "Beirut",
        location: "POINT(35.5012 33.8824)",
        isMain: true,
      },
    ],
  },
  {
    name: "Makassed University of Beirut",
    shortName: "MU",
    slug: "makassed",
    website: "https://www.makassed.edu.lb",
    campuses: [
      {
        name: "Beirut Campus",
        slug: "makassed-beirut",
        city: "Beirut",
        location: "POINT(35.5084 33.8742)",
        isMain: true,
      },
    ],
  },
  {
    name: "Jinan University",
    shortName: "JU",
    slug: "jinan",
    website: "https://www.jinan.edu.lb",
    campuses: [
      {
        name: "Tripoli Campus",
        slug: "jinan-tripoli",
        city: "Tripoli",
        location: "POINT(35.8448 34.4362)",
        isMain: true,
      },
      {
        name: "Saida Campus",
        slug: "jinan-saida",
        city: "Saida",
        location: "POINT(35.3722 33.5614)",
      },
    ],
  },
  {
    name: "Global University",
    shortName: "GU",
    slug: "global",
    website: "https://www.gu.edu.lb",
    campuses: [
      {
        name: "Beirut Campus",
        slug: "global-beirut",
        city: "Beirut",
        location: "POINT(35.5126 33.8768)",
        isMain: true,
      },
    ],
  },
  {
    name: "Arab Open University",
    shortName: "AOU",
    slug: "aou",
    website: "https://www.aou.edu.lb",
    campuses: [
      {
        name: "Beirut Campus",
        slug: "aou-beirut",
        city: "Beirut",
        location: "POINT(35.5284 33.8692)",
        isMain: true,
      },
    ],
  },
  {
    name: "City University",
    shortName: "MUT",
    slug: "city-university",
    website: "https://www.cityu.edu.lb",
    campuses: [
      {
        name: "Beirut Campus",
        slug: "cityu-beirut",
        city: "Beirut",
        location: "POINT(35.5188 33.8724)",
        isMain: true,
      },
    ],
  },
  {
    name: "Rafik Hariri University",
    shortName: "RHU",
    slug: "rhu",
    website: "https://www.rhu.edu.lb",
    campuses: [
      {
        name: "Mechref Campus",
        slug: "rhu-mechref",
        city: "Damour",
        location: "POINT(35.4582 33.7048)",
        isMain: true,
      },
    ],
  },
  {
    name: "American University of Science and Technology",
    shortName: "AUST",
    slug: "aust",
    website: "https://www.aust.edu.lb",
    campuses: [
      {
        name: "Ashrafieh Campus",
        slug: "aust-ashrafieh",
        city: "Beirut",
        location: "POINT(35.5196 33.8864)",
        isMain: true,
      },
      {
        name: "Sidon Campus",
        slug: "aust-sidon",
        city: "Saida",
        location: "POINT(35.3714 33.5602)",
      },
    ],
  },
  {
    name: "American University of Technology",
    shortName: "AUT",
    slug: "aut",
    website: "https://www.aut.edu",
    campuses: [
      {
        name: "Halat Campus",
        slug: "aut-halat",
        city: "Halat",
        location: "POINT(35.6548 34.0786)",
        isMain: true,
      },
    ],
  },
  {
    name: "Arts, Sciences and Technology University in Lebanon",
    shortName: "AUL",
    slug: "aul",
    website: "https://www.aul.edu.lb",
    campuses: [
      {
        name: "Beirut Campus",
        slug: "aul-beirut",
        city: "Beirut",
        location: "POINT(35.5242 33.8756)",
        isMain: true,
      },
    ],
  },
  {
    name: "Modern University for Business and Science",
    shortName: "MUBS",
    slug: "mubs",
    website: "https://www.mubs.edu.lb",
    campuses: [
      {
        name: "Damour Campus",
        slug: "mubs-damour",
        city: "Damour",
        location: "POINT(35.4472 33.7328)",
        isMain: true,
      },
      {
        name: "Beirut Campus",
        slug: "mubs-beirut",
        city: "Beirut",
        location: "POINT(35.5128 33.8884)",
      },
      {
        name: "Aley Campus",
        slug: "mubs-aley",
        city: "Aley",
        location: "POINT(35.6002 33.8054)",
      },
    ],
  },
  {
    name: "Lebanese Canadian University",
    shortName: "LCU",
    slug: "lcu",
    website: "https://www.lcu.edu.lb",
    campuses: [
      {
        name: "Aintoura Campus",
        slug: "lcu-aintoura",
        city: "Aintoura",
        location: "POINT(35.6448 33.9632)",
        isMain: true,
      },
    ],
  },
  {
    name: "Lebanese German University",
    shortName: "LGU",
    slug: "lgu",
    website: "https://www.lgu.edu.lb",
    campuses: [
      {
        name: "Sahel Alma Campus",
        slug: "lgu-sahel-alma",
        city: "Jounieh",
        location: "POINT(35.6268 33.9924)",
        isMain: true,
      },
    ],
  },
  {
    name: "Université Libano-Française",
    shortName: "ULF",
    slug: "ulf",
    website: "https://www.ulf.edu.lb",
    campuses: [
      {
        name: "Tripoli Campus",
        slug: "ulf-tripoli",
        city: "Tripoli",
        location: "POINT(35.8384 34.4336)",
        isMain: true,
      },
    ],
  },
  {
    name: "Al Kafaat University",
    shortName: "AKU",
    slug: "aku",
    website: "https://www.aku.edu.lb",
    campuses: [
      {
        name: "Ain Saadeh Campus",
        slug: "aku-ain-saadeh",
        city: "Ain Saadeh",
        location: "POINT(35.5884 33.8662)",
        isMain: true,
      },
    ],
  },
  {
    name: "Holy Family University",
    shortName: "HFU",
    slug: "hfu",
    website: "https://www.hfu.edu.lb",
    campuses: [
      {
        name: "Batroun Campus",
        slug: "hfu-batroun",
        city: "Batroun",
        location: "POINT(35.6584 34.2552)",
        isMain: true,
      },
    ],
  },
  {
    name: "University of Tripoli",
    shortName: "UT",
    slug: "ut",
    website: "https://www.ut.edu.lb",
    campuses: [
      {
        name: "Tripoli Campus",
        slug: "ut-tripoli",
        city: "Tripoli",
        location: "POINT(35.8462 34.4388)",
        isMain: true,
      },
    ],
  },
  {
    name: "American University of Culture and Education",
    shortName: "AUCE",
    slug: "auce",
    website: "https://www.auce.edu.lb",
    campuses: [
      {
        name: "Beirut Campus",
        slug: "auce-beirut",
        city: "Beirut",
        location: "POINT(35.5088 33.8794)",
        isMain: true,
      },
    ],
  },
  {
    name: "University of Sciences and Arts in Lebanon",
    shortName: "USAL",
    slug: "usal",
    website: "https://www.usal.edu.lb",
    campuses: [
      {
        name: "Beirut Campus",
        slug: "usal-beirut",
        city: "Beirut",
        location: "POINT(35.5144 33.8738)",
        isMain: true,
      },
    ],
  },
  {
    name: "Phoenicia University",
    shortName: "PU",
    slug: "phoenicia",
    website: "https://www.pu.edu.lb",
    campuses: [
      {
        name: "Dist Campus",
        slug: "pu-dist",
        city: "Dist",
        location: "POINT(35.3482 33.4586)",
        isMain: true,
      },
    ],
  },
  {
    name: "Al Maaref University",
    shortName: "MAAREF",
    slug: "maaref",
    website: "https://www.mu.edu.lb",
    campuses: [
      {
        name: "Beirut Campus",
        slug: "maaref-beirut",
        city: "Beirut",
        location: "POINT(35.4896 33.8688)",
        isMain: true,
      },
    ],
  },
  {
    name: "Al Azm University",
    shortName: "AZM",
    slug: "azm",
    website: "https://www.azmuniversity.edu.lb",
    campuses: [
      {
        name: "Tripoli Campus",
        slug: "azm-tripoli",
        city: "Tripoli",
        location: "POINT(35.8304 34.4286)",
        isMain: true,
      },
    ],
  },
  {
    name: "International University of Beirut",
    shortName: "IUB",
    slug: "iub",
    website: "https://www.iu.edu.lb",
    campuses: [
      {
        name: "Beirut Campus",
        slug: "iub-beirut",
        city: "Beirut",
        location: "POINT(35.5024 33.8812)",
        isMain: true,
      },
    ],
  },
];

/** @deprecated Prefer institutionSeeds. Kept so old imports still typecheck. */
export const universitySeeds = institutionSeeds.flatMap((inst) =>
  inst.campuses.map((c) => ({
    name: `${inst.shortName} — ${c.name}`,
    slug: c.slug,
    location: c.location,
  })),
);

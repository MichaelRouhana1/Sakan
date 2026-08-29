/**
 * MEHE-accredited private universities in Lebanon + official campuses.
 * Coordinates are OSM amenity=university centroids (campus grounds) when a named match exists; otherwise town-gate approximate WGS84.
 * WKT: POINT(longitude latitude)
 * Inactive / foreign / public (LU) / institutes are omitted.
 */

export type CampusSeed = {
  name: string;
  slug: string;
  city: string;
  location: string;
  isMain?: boolean;
  /** Compact map pin, e.g. CSM → "USJ - CSM". List still uses `name`. */
  mapCode?: string;
};

export type InstitutionSeed = {
  name: string;
  shortName: string;
  slug: string;
  website: string;
  popular?: boolean;
  campuses: CampusSeed[];
};

/** High-res site icon (better than Google favicon upscaling). */
export function logoUrlFromWebsite(website: string): string | null {
  try {
    const host = new URL(website).hostname.replace(/^www\./i, "");
    return `https://icon.horse/icon/${host}`;
  } catch {
    return null;
  }
}

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
        location: "POINT(35.48212 33.89999)",
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
        location: "POINT(35.47750 33.89279)",
        isMain: true,
      },
      {
        name: "Jbeil Campus",
        slug: "lau-jbeil",
        city: "Jbeil",
        location: "POINT(35.67443 34.11560)",
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
        name: "Campus des Sciences Médicales",
        slug: "usj-csm",
        mapCode: "CSM",
        city: "Beirut",
        location: "POINT(35.51209 33.88233)",
      },
      {
        name: "Campus François Debbané des Sciences Sociales",
        slug: "usj-huvelin",
        mapCode: "CFDSS",
        city: "Beirut",
        location: "POINT(35.50933 33.88984)",
        isMain: true,
      },
      {
        name: "Campus des Sciences et Technologies",
        slug: "usj-cst",
        mapCode: "CST",
        city: "Mkalles",
        location: "POINT(35.56415 33.86542)",
      },
      {
        name: "Campus des Sciences Humaines",
        slug: "usj-csh",
        mapCode: "CSH",
        city: "Beirut",
        location: "POINT(35.51162 33.88109)",
      },
      {
        name: "Campus de l'Innovation et du Sport",
        slug: "usj-cis",
        mapCode: "CIS",
        city: "Beirut",
        location: "POINT(35.51449 33.88019)",
      },
      {
        name: "Campus Charles Corm",
        slug: "usj-corm",
        mapCode: "CCC",
        city: "Beirut",
        location: "POINT(35.51399 33.88001)",
      },
      {
        name: "Campus du Liban Nord",
        slug: "usj-cln",
        mapCode: "CLN",
        city: "Ras Maska",
        location: "POINT(35.80690 34.40035)",
      },
      {
        name: "Campus du Liban Sud",
        slug: "usj-cls",
        mapCode: "CLS",
        city: "Saida",
        location: "POINT(35.39665 33.57075)",
      },
      {
        name: "Campus de Zahlé et de la Bekaa",
        slug: "usj-czb",
        mapCode: "CZB",
        city: "Zahlé",
        location: "POINT(35.88385 33.85773)",
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
        location: "POINT(35.61371 33.95078)",
        isMain: true,
      },
      {
        name: "North Lebanon Campus",
        slug: "ndu-nlc",
        city: "Barsa",
        location: "POINT(35.82664 34.38274)",
      },
      {
        name: "Shouf Campus",
        slug: "ndu-shouf",
        city: "Deir El Qamar",
        location: "POINT(35.56980 33.70329)",
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
        location: "POINT(35.53617 33.83794)",
        isMain: true,
      },
      {
        name: "Nabi Ayla–Zahle Campus",
        slug: "ua-nabi-ayla",
        city: "Zahle",
        location: "POINT(35.98529 33.86502)",
      },
      {
        name: "Mejdlaya–Zgharta Campus",
        slug: "ua-mejdlaya",
        city: "Zgharta",
        location: "POINT(35.87175 34.41150)",
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
        name: "Kaslik Campus",
        slug: "usek-kaslik",
        city: "Jounieh",
        location: "POINT(35.61866 33.98194)",
        isMain: true,
      },
      {
        name: "Zahle Campus",
        slug: "usek-zahle",
        city: "Zahle",
        location: "POINT(35.92602 33.84119)",
      },
      {
        name: "Chekka Campus",
        slug: "usek-chekka",
        city: "Chekka",
        location: "POINT(35.73237 34.32429)",
      },
      {
        name: "Rmeich Campus",
        slug: "usek-rmeich",
        city: "Rmeich",
        location: "POINT(35.37867 33.08929)",
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
        location: "POINT(35.49713 33.87292)",
        isMain: true,
      },
      {
        name: "Debbieh Campus",
        slug: "bau-debbieh",
        city: "Debbieh",
        location: "POINT(35.46223 33.67516)",
      },
      {
        name: "Tripoli Campus",
        slug: "bau-tripoli",
        city: "Tripoli",
        location: "POINT(35.81437 34.43218)",
      },
      {
        name: "Bekaa Campus",
        slug: "bau-bekaa",
        city: "Jdeita / Taalabaya",
        location: "POINT(35.86288 33.80311)",
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
        location: "POINT(35.78244 34.36479)",
        isMain: true,
      },
      {
        name: "Dekouaneh Campus",
        slug: "uob-dekouaneh",
        city: "Dekouaneh",
        location: "POINT(35.54018 33.87975)",
      },
      {
        name: "Beino–Akkar Campus",
        slug: "uob-beino",
        city: "Beino",
        location: "POINT(36.15118 34.54475)",
      },
      {
        name: "Souk El Gharb Campus",
        slug: "uob-souk-el-gharb",
        city: "Souk El Gharb",
        location: "POINT(35.56355 33.78557)",
      },
      {
        name: "Achrafieh Campus",
        slug: "uob-achrafieh",
        city: "Achrafieh",
        location: "POINT(35.52366 33.89378)",
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
        location: "POINT(35.49536 33.88462)",
        isMain: true,
      },
      {
        name: "Bekaa Campus",
        slug: "liu-bekaa",
        city: "Al Khyara",
        location: "POINT(35.85129 33.69292)",
      },
      {
        name: "Saida Campus",
        slug: "liu-saida",
        city: "Saida",
        location: "POINT(35.37379 33.55366)",
      },
      {
        name: "Nabatieh Campus",
        slug: "liu-nabatieh",
        city: "Nabatieh",
        location: "POINT(35.49706 33.37691)",
      },
      {
        name: "Tripoli Campus",
        slug: "liu-tripoli",
        city: "Tripoli",
        location: "POINT(35.84273 34.39669)",
      },
      {
        name: "Mount Lebanon Campus",
        slug: "liu-mount-lebanon",
        city: "Sin El Fil",
        location: "POINT(35.54036 33.88283)",
      },
      {
        name: "Tyre Campus",
        slug: "liu-tyre",
        city: "Tyre",
        location: "POINT(35.22923 33.28343)",
      },
      {
        name: "Rayak Campus",
        slug: "liu-rayak",
        city: "Rayak",
        location: "POINT(36.00732 33.86811)",
      },
      {
        name: "Halba–Akkar Campus",
        slug: "liu-halba",
        city: "Halba",
        location: "POINT(36.08662 34.56677)",
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
        city: "Furn El Chebbak",
        location: "POINT(35.52876 33.86747)",
        isMain: true,
      },
      {
        name: "Achrafieh Campus",
        slug: "uls-achrafieh",
        city: "Achrafieh",
        location: "POINT(35.52216 33.89321)",
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
        location: "POINT(35.56691 33.87327)",
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
        location: "POINT(35.49215 33.89592)",
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
        location: "POINT(35.47481 33.78200)",
        isMain: true,
      },
      {
        name: "Wardanieh Campus",
        slug: "iul-wardanieh",
        city: "Wardanieh",
        location: "POINT(35.41061 33.61593)",
      },
      {
        name: "Tyre Campus",
        slug: "iul-tyre",
        city: "Tyre",
        location: "POINT(35.19836 33.26806)",
      },
      {
        name: "Baalbek Campus",
        slug: "iul-baalbek",
        city: "Baalbek",
        location: "POINT(36.18033 34.01432)",
      },
      {
        name: "Bourj El Barajneh Campus",
        slug: "iul-bourj",
        city: "Bourj El Barajneh",
        location: "POINT(35.51074 33.83585)",
      },
      {
        name: "Sohmor Campus",
        slug: "iul-sohmor",
        city: "Sohmor",
        location: "POINT(35.69400 33.53411)",
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
        location: "POINT(35.48856 33.88752)",
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
        location: "POINT(35.50341 33.87531)",
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
        location: "POINT(35.84722 34.40985)",
        isMain: true,
      },
      {
        name: "Saida Campus",
        slug: "jinan-saida",
        city: "Saida",
        location: "POINT(35.37696 33.55223)",
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
        name: "Batrakiyeh Campus",
        slug: "global-beirut",
        city: "Beirut",
        location: "POINT(35.49699 33.89042)",
        isMain: true,
      },
      {
        name: "Doha Campus",
        slug: "global-doha",
        city: "Doha",
        location: "POINT(35.48816 33.76081)",
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
        location: "POINT(35.51375 33.87131)",
        isMain: true,
      },
      {
        name: "Antelias Campus",
        slug: "aou-antelias",
        city: "Antelias",
        location: "POINT(35.58866 33.92050)",
      },
      {
        name: "Tripoli Campus",
        slug: "aou-tripoli",
        city: "Tripoli",
        location: "POINT(35.82171 34.42466)",
      },
    ],
  },
  {
    name: "City University",
    shortName: "CITYU",
    slug: "city-university",
    website: "https://www.cityu.edu.lb",
    campuses: [
      {
        name: "Tripoli Campus",
        slug: "cityu-tripoli",
        city: "Tripoli",
        location: "POINT(35.83647 34.41809)",
        isMain: true,
      },
      {
        name: "Tyre Campus",
        slug: "cityu-tyre",
        city: "Tyre",
        location: "POINT(35.23174 33.25840)",
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
        location: "POINT(35.48411 33.71356)",
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
        name: "Beirut Campus",
        slug: "aust-ashrafieh",
        city: "Beirut",
        location: "POINT(35.52306 33.88457)",
        isMain: true,
      },
      {
        name: "Zahle Campus",
        slug: "aust-zahle",
        city: "Zahle",
        location: "POINT(35.93195 33.84976)",
      },
      {
        name: "Sidon Campus",
        slug: "aust-sidon",
        city: "Saida",
        location: "POINT(35.38560 33.58038)",
      },
      {
        name: "Bhamdoun Campus",
        slug: "aust-bhamdoun",
        city: "Bhamdoun",
        location: "POINT(35.66188 33.80709)",
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
        location: "POINT(35.65382 34.09659)",
        isMain: true,
      },
      {
        name: "North Campus",
        slug: "aut-north",
        city: "Ras Masqa",
        location: "POINT(35.84905 34.38149)",
      },
      {
        name: "Akkar Campus",
        slug: "aut-akkar",
        city: "Halba",
        location: "POINT(36.07344 34.54280)",
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
        location: "POINT(35.49611 33.87736)",
        isMain: true,
      },
      {
        name: "Jounieh Campus",
        slug: "aul-jounieh",
        city: "Jounieh",
        location: "POINT(35.63384 33.98165)",
      },
      {
        name: "Dekwaneh Campus",
        slug: "aul-dekwaneh",
        city: "Dekwaneh",
        location: "POINT(35.55110 33.87390)",
      },
      {
        name: "Chtaura Campus",
        slug: "aul-chtaura",
        city: "Chtaura",
        location: "POINT(35.85113 33.81896)",
      },
      {
        name: "Tripoli Campus",
        slug: "aul-tripoli",
        city: "Tripoli",
        location: "POINT(35.83262 34.42381)",
      },
      {
        name: "Jadra Campus",
        slug: "aul-jadra",
        city: "Jadra",
        location: "POINT(35.40033 33.62892)",
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
        location: "POINT(35.45341 33.71635)",
        isMain: true,
      },
      {
        name: "Beirut Campus",
        slug: "mubs-beirut",
        city: "Beirut",
        location: "POINT(35.51799 33.87430)",
      },
      {
        name: "Aley Campus",
        slug: "mubs-aley",
        city: "Aley",
        location: "POINT(35.61158 33.81177)",
      },
      {
        name: "Semqanieh Campus",
        slug: "mubs-semqanieh",
        city: "Semqanieh",
        location: "POINT(35.59837 33.67442)",
      },
      {
        name: "Rashaya Campus",
        slug: "mubs-rashaya",
        city: "Rashaya",
        location: "POINT(35.81326 33.52224)",
      },
      {
        name: "Jal El Dib Campus",
        slug: "mubs-jal-el-dib",
        city: "Jal El Dib",
        location: "POINT(35.58495 33.90713)",
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
        location: "POINT(35.63516 33.96129)",
        isMain: true,
      },
      {
        name: "Hadat Campus",
        slug: "lcu-hadat",
        city: "Hadat",
        location: "POINT(35.52651 33.82571)",
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
        location: "POINT(35.64928 34.00334)",
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
        name: "Deddeh Campus",
        slug: "ulf-deddeh",
        city: "Deddeh",
        location: "POINT(35.81769 34.39084)",
        isMain: true,
      },
      {
        name: "Tripoli Campus",
        slug: "ulf-tripoli",
        city: "Tripoli",
        location: "POINT(35.83302 34.42854)",
      },
      {
        name: "Beirut Campus",
        slug: "ulf-beirut",
        city: "Beirut",
        location: "POINT(35.48830 33.89768)",
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
        location: "POINT(35.57974 33.86725)",
        isMain: true,
      },
    ],
  },
  {
    name: "Holy Family University",
    shortName: "USF",
    slug: "hfu",
    website: "https://www.hfu.edu.lb",
    campuses: [
      {
        name: "Batroun Campus",
        slug: "hfu-batroun",
        city: "Batroun",
        location: "POINT(35.66166 34.25030)",
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
        location: "POINT(35.83505 34.41857)",
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
        location: "POINT(35.51397 33.87198)",
        isMain: true,
      },
      {
        name: "Koura Campus",
        slug: "auce-koura",
        city: "Koura",
        location: "POINT(35.84153 34.29457)",
      },
      {
        name: "Baouchrieh Campus",
        slug: "auce-baouchrieh",
        city: "Baouchrieh",
        location: "POINT(35.55520 33.88294)",
      },
      {
        name: "Tyre Campus",
        slug: "auce-tyre",
        city: "Tyre",
        location: "POINT(35.22047 33.26331)",
      },
      {
        name: "Nabatiyeh Campus",
        slug: "auce-nabatiyeh",
        city: "Nabatiyeh",
        location: "POINT(35.49804 33.37780)",
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
        location: "POINT(35.50274 33.85627)",
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
        name: "Daoudiyeh Campus",
        slug: "pu-dist",
        city: "Daoudiyeh",
        location: "POINT(35.30448 33.42194)",
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
        location: "POINT(35.50025 33.85634)",
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
        location: "POINT(35.84409 34.44531)",
        isMain: true,
      },
    ],
  },
  {
    name: "International University",
    shortName: "IU",
    slug: "iub",
    website: "https://www.iu.edu.lb",
    campuses: [
      {
        name: "Sin El Fil Campus",
        slug: "iub-beirut",
        city: "Sin El Fil",
        location: "POINT(35.54036 33.88281)",
        isMain: true,
      },
      {
        name: "Akkar Campus",
        slug: "iub-akkar",
        city: "Halba",
        location: "POINT(36.08662 34.56677)",
      },
    ],
  },
];

export const campusMapCodes: Record<string, string> = Object.fromEntries(
  institutionSeeds.flatMap((inst) =>
    inst.campuses
      .filter((c): c is CampusSeed & { mapCode: string } => Boolean(c.mapCode))
      .map((c) => [c.slug, c.mapCode]),
  ),
);

/** Map pin label. List UIs keep `name` (full campus title). */
export function formatCampusMapLabel(
  institutionShortName: string | null | undefined,
  slug: string,
  name: string,
): string {
  const code = campusMapCodes[slug];
  if (institutionShortName && code) return `${institutionShortName} - ${code}`;
  if (institutionShortName) return `${institutionShortName} — ${name}`;
  return name;
}

function foldCampusCity(city: string): string {
  return city
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace("nabatiyeh", "nabatieh")
    .replace("ras masqa", "ras maska")
    .replace("dekouaneh", "dekwaneh");
}

/** Private MEHE catalog counts (homepage / marketing). */
export const campusCatalogStats = {
  universities: institutionSeeds.length,
  campuses: institutionSeeds.reduce((n, inst) => n + inst.campuses.length, 0),
  areas: new Set(
    institutionSeeds.flatMap((inst) =>
      inst.campuses.map((c) => foldCampusCity(c.city)),
    ),
  ).size,
} as const;

/** @deprecated Prefer institutionSeeds. Kept so old imports still typecheck. */
export const universitySeeds = institutionSeeds.flatMap((inst) =>
  inst.campuses.map((c) => ({
    name: `${inst.shortName} — ${c.name}`,
    slug: c.slug,
    location: c.location,
  })),
);

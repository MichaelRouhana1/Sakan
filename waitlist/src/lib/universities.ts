/**
 * Private MEHE university catalog for the waitlist.
 * Copied from backend/src/db/seeds/universities.ts (`institutionSeeds`).
 * Do not add universities or campuses here. Change the seed, then copy again.
 */

export type WaitlistCampus = {
  name: string;
  slug: string;
  city: string;
};

export type WaitlistInstitution = {
  name: string;
  shortName: string;
  slug: string;
  campuses: WaitlistCampus[];
};

export const OTHER_UNIVERSITY = "Other";

export const INSTITUTIONS: WaitlistInstitution[] = [
  {
    "name": "American University of Beirut",
    "shortName": "AUB",
    "slug": "aub",
    "campuses": [
      {
        "name": "Ras Beirut Campus",
        "slug": "aub",
        "city": "Beirut"
      }
    ]
  },
  {
    "name": "Lebanese American University",
    "shortName": "LAU",
    "slug": "lau",
    "campuses": [
      {
        "name": "Beirut Campus",
        "slug": "lau-beirut",
        "city": "Beirut"
      },
      {
        "name": "Jbeil Campus",
        "slug": "lau-jbeil",
        "city": "Jbeil"
      }
    ]
  },
  {
    "name": "Université Saint-Joseph de Beyrouth",
    "shortName": "USJ",
    "slug": "usj",
    "campuses": [
      {
        "name": "Campus des Sciences Médicales",
        "slug": "usj-csm",
        "city": "Beirut"
      },
      {
        "name": "Campus François Debbané des Sciences Sociales",
        "slug": "usj-huvelin",
        "city": "Beirut"
      },
      {
        "name": "Campus des Sciences et Technologies",
        "slug": "usj-cst",
        "city": "Mkalles"
      },
      {
        "name": "Campus des Sciences Humaines",
        "slug": "usj-csh",
        "city": "Beirut"
      },
      {
        "name": "Campus de l'Innovation et du Sport",
        "slug": "usj-cis",
        "city": "Beirut"
      },
      {
        "name": "Campus Charles Corm",
        "slug": "usj-corm",
        "city": "Beirut"
      },
      {
        "name": "Campus du Liban Nord",
        "slug": "usj-cln",
        "city": "Ras Maska"
      },
      {
        "name": "Campus du Liban Sud",
        "slug": "usj-cls",
        "city": "Saida"
      },
      {
        "name": "Campus de Zahlé et de la Bekaa",
        "slug": "usj-czb",
        "city": "Zahlé"
      }
    ]
  },
  {
    "name": "Notre Dame University–Louaize",
    "shortName": "NDU",
    "slug": "ndu",
    "campuses": [
      {
        "name": "Zouk Mosbeh Main Campus",
        "slug": "ndu-louaize",
        "city": "Zouk Mosbeh"
      },
      {
        "name": "North Lebanon Campus",
        "slug": "ndu-nlc",
        "city": "Barsa"
      },
      {
        "name": "Shouf Campus",
        "slug": "ndu-shouf",
        "city": "Deir El Qamar"
      }
    ]
  },
  {
    "name": "Antonine University",
    "shortName": "UA",
    "slug": "ua",
    "campuses": [
      {
        "name": "Hadat–Baabda Main Campus",
        "slug": "ua-hadat-baabda",
        "city": "Baabda"
      },
      {
        "name": "Nabi Ayla–Zahle Campus",
        "slug": "ua-nabi-ayla",
        "city": "Zahle"
      },
      {
        "name": "Mejdlaya–Zgharta Campus",
        "slug": "ua-mejdlaya",
        "city": "Zgharta"
      }
    ]
  },
  {
    "name": "Holy Spirit University of Kaslik",
    "shortName": "USEK",
    "slug": "usek",
    "campuses": [
      {
        "name": "Kaslik Campus",
        "slug": "usek-kaslik",
        "city": "Jounieh"
      },
      {
        "name": "Zahle Campus",
        "slug": "usek-zahle",
        "city": "Zahle"
      },
      {
        "name": "Chekka Campus",
        "slug": "usek-chekka",
        "city": "Chekka"
      },
      {
        "name": "Rmeich Campus",
        "slug": "usek-rmeich",
        "city": "Rmeich"
      }
    ]
  },
  {
    "name": "Beirut Arab University",
    "shortName": "BAU",
    "slug": "bau",
    "campuses": [
      {
        "name": "Beirut Campus",
        "slug": "bau-beirut",
        "city": "Beirut"
      },
      {
        "name": "Debbieh Campus",
        "slug": "bau-debbieh",
        "city": "Debbieh"
      },
      {
        "name": "Tripoli Campus",
        "slug": "bau-tripoli",
        "city": "Tripoli"
      },
      {
        "name": "Bekaa Campus",
        "slug": "bau-bekaa",
        "city": "Jdeita / Taalabaya"
      }
    ]
  },
  {
    "name": "University of Balamand",
    "shortName": "UOB",
    "slug": "uob",
    "campuses": [
      {
        "name": "Al Koura Campus",
        "slug": "balamand",
        "city": "Koura"
      },
      {
        "name": "Dekouaneh Campus",
        "slug": "uob-dekouaneh",
        "city": "Dekouaneh"
      },
      {
        "name": "Beino–Akkar Campus",
        "slug": "uob-beino",
        "city": "Beino"
      },
      {
        "name": "Souk El Gharb Campus",
        "slug": "uob-souk-el-gharb",
        "city": "Souk El Gharb"
      },
      {
        "name": "Achrafieh Campus",
        "slug": "uob-achrafieh",
        "city": "Achrafieh"
      }
    ]
  },
  {
    "name": "Lebanese International University",
    "shortName": "LIU",
    "slug": "liu",
    "campuses": [
      {
        "name": "Beirut Campus",
        "slug": "liu-beirut",
        "city": "Beirut"
      },
      {
        "name": "Bekaa Campus",
        "slug": "liu-bekaa",
        "city": "Al Khyara"
      },
      {
        "name": "Saida Campus",
        "slug": "liu-saida",
        "city": "Saida"
      },
      {
        "name": "Nabatieh Campus",
        "slug": "liu-nabatieh",
        "city": "Nabatieh"
      },
      {
        "name": "Tripoli Campus",
        "slug": "liu-tripoli",
        "city": "Tripoli"
      },
      {
        "name": "Mount Lebanon Campus",
        "slug": "liu-mount-lebanon",
        "city": "Sin El Fil"
      },
      {
        "name": "Tyre Campus",
        "slug": "liu-tyre",
        "city": "Tyre"
      },
      {
        "name": "Rayak Campus",
        "slug": "liu-rayak",
        "city": "Rayak"
      },
      {
        "name": "Halba–Akkar Campus",
        "slug": "liu-halba",
        "city": "Halba"
      }
    ]
  },
  {
    "name": "Université La Sagesse",
    "shortName": "ULS",
    "slug": "uls",
    "campuses": [
      {
        "name": "Furn El Chebbak Campus",
        "slug": "uls-furn",
        "city": "Furn El Chebbak"
      },
      {
        "name": "Achrafieh Campus",
        "slug": "uls-achrafieh",
        "city": "Achrafieh"
      }
    ]
  },
  {
    "name": "Middle East University",
    "shortName": "MEU",
    "slug": "meu",
    "campuses": [
      {
        "name": "Sabtieh Campus",
        "slug": "meu-sabtieh",
        "city": "Beirut"
      }
    ]
  },
  {
    "name": "Haigazian University",
    "shortName": "HU",
    "slug": "haigazian",
    "campuses": [
      {
        "name": "Kantari Campus",
        "slug": "haigazian-kantari",
        "city": "Beirut"
      }
    ]
  },
  {
    "name": "Islamic University of Lebanon",
    "shortName": "IUL",
    "slug": "iul",
    "campuses": [
      {
        "name": "Khalde Campus",
        "slug": "iul-khalde",
        "city": "Khalde"
      },
      {
        "name": "Wardanieh Campus",
        "slug": "iul-wardanieh",
        "city": "Wardanieh"
      },
      {
        "name": "Tyre Campus",
        "slug": "iul-tyre",
        "city": "Tyre"
      },
      {
        "name": "Baalbek Campus",
        "slug": "iul-baalbek",
        "city": "Baalbek"
      },
      {
        "name": "Bourj El Barajneh Campus",
        "slug": "iul-bourj",
        "city": "Bourj El Barajneh"
      },
      {
        "name": "Sohmor Campus",
        "slug": "iul-sohmor",
        "city": "Sohmor"
      }
    ]
  },
  {
    "name": "Beirut Islamic University",
    "shortName": "BIU",
    "slug": "biu",
    "campuses": [
      {
        "name": "Beirut Campus",
        "slug": "biu-beirut",
        "city": "Beirut"
      }
    ]
  },
  {
    "name": "Makassed University of Beirut",
    "shortName": "MU",
    "slug": "makassed",
    "campuses": [
      {
        "name": "Beirut Campus",
        "slug": "makassed-beirut",
        "city": "Beirut"
      }
    ]
  },
  {
    "name": "Jinan University",
    "shortName": "JU",
    "slug": "jinan",
    "campuses": [
      {
        "name": "Tripoli Campus",
        "slug": "jinan-tripoli",
        "city": "Tripoli"
      },
      {
        "name": "Saida Campus",
        "slug": "jinan-saida",
        "city": "Saida"
      }
    ]
  },
  {
    "name": "Global University",
    "shortName": "GU",
    "slug": "global",
    "campuses": [
      {
        "name": "Batrakiyeh Campus",
        "slug": "global-beirut",
        "city": "Beirut"
      },
      {
        "name": "Doha Campus",
        "slug": "global-doha",
        "city": "Doha"
      }
    ]
  },
  {
    "name": "Arab Open University",
    "shortName": "AOU",
    "slug": "aou",
    "campuses": [
      {
        "name": "Beirut Campus",
        "slug": "aou-beirut",
        "city": "Beirut"
      },
      {
        "name": "Antelias Campus",
        "slug": "aou-antelias",
        "city": "Antelias"
      },
      {
        "name": "Tripoli Campus",
        "slug": "aou-tripoli",
        "city": "Tripoli"
      }
    ]
  },
  {
    "name": "City University",
    "shortName": "CITYU",
    "slug": "city-university",
    "campuses": [
      {
        "name": "Tripoli Campus",
        "slug": "cityu-tripoli",
        "city": "Tripoli"
      },
      {
        "name": "Tyre Campus",
        "slug": "cityu-tyre",
        "city": "Tyre"
      }
    ]
  },
  {
    "name": "Rafik Hariri University",
    "shortName": "RHU",
    "slug": "rhu",
    "campuses": [
      {
        "name": "Mechref Campus",
        "slug": "rhu-mechref",
        "city": "Damour"
      }
    ]
  },
  {
    "name": "American University of Science and Technology",
    "shortName": "AUST",
    "slug": "aust",
    "campuses": [
      {
        "name": "Beirut Campus",
        "slug": "aust-ashrafieh",
        "city": "Beirut"
      },
      {
        "name": "Zahle Campus",
        "slug": "aust-zahle",
        "city": "Zahle"
      },
      {
        "name": "Sidon Campus",
        "slug": "aust-sidon",
        "city": "Saida"
      },
      {
        "name": "Bhamdoun Campus",
        "slug": "aust-bhamdoun",
        "city": "Bhamdoun"
      }
    ]
  },
  {
    "name": "American University of Technology",
    "shortName": "AUT",
    "slug": "aut",
    "campuses": [
      {
        "name": "Halat Campus",
        "slug": "aut-halat",
        "city": "Halat"
      },
      {
        "name": "North Campus",
        "slug": "aut-north",
        "city": "Ras Masqa"
      },
      {
        "name": "Akkar Campus",
        "slug": "aut-akkar",
        "city": "Halba"
      }
    ]
  },
  {
    "name": "Arts, Sciences and Technology University in Lebanon",
    "shortName": "AUL",
    "slug": "aul",
    "campuses": [
      {
        "name": "Beirut Campus",
        "slug": "aul-beirut",
        "city": "Beirut"
      },
      {
        "name": "Jounieh Campus",
        "slug": "aul-jounieh",
        "city": "Jounieh"
      },
      {
        "name": "Dekwaneh Campus",
        "slug": "aul-dekwaneh",
        "city": "Dekwaneh"
      },
      {
        "name": "Chtaura Campus",
        "slug": "aul-chtaura",
        "city": "Chtaura"
      },
      {
        "name": "Tripoli Campus",
        "slug": "aul-tripoli",
        "city": "Tripoli"
      },
      {
        "name": "Jadra Campus",
        "slug": "aul-jadra",
        "city": "Jadra"
      }
    ]
  },
  {
    "name": "Modern University for Business and Science",
    "shortName": "MUBS",
    "slug": "mubs",
    "campuses": [
      {
        "name": "Damour Campus",
        "slug": "mubs-damour",
        "city": "Damour"
      },
      {
        "name": "Beirut Campus",
        "slug": "mubs-beirut",
        "city": "Beirut"
      },
      {
        "name": "Aley Campus",
        "slug": "mubs-aley",
        "city": "Aley"
      },
      {
        "name": "Semqanieh Campus",
        "slug": "mubs-semqanieh",
        "city": "Semqanieh"
      },
      {
        "name": "Rashaya Campus",
        "slug": "mubs-rashaya",
        "city": "Rashaya"
      },
      {
        "name": "Jal El Dib Campus",
        "slug": "mubs-jal-el-dib",
        "city": "Jal El Dib"
      }
    ]
  },
  {
    "name": "Lebanese Canadian University",
    "shortName": "LCU",
    "slug": "lcu",
    "campuses": [
      {
        "name": "Aintoura Campus",
        "slug": "lcu-aintoura",
        "city": "Aintoura"
      },
      {
        "name": "Hadat Campus",
        "slug": "lcu-hadat",
        "city": "Hadat"
      }
    ]
  },
  {
    "name": "Lebanese German University",
    "shortName": "LGU",
    "slug": "lgu",
    "campuses": [
      {
        "name": "Sahel Alma Campus",
        "slug": "lgu-sahel-alma",
        "city": "Jounieh"
      }
    ]
  },
  {
    "name": "Université Libano-Française",
    "shortName": "ULF",
    "slug": "ulf",
    "campuses": [
      {
        "name": "Deddeh Campus",
        "slug": "ulf-deddeh",
        "city": "Deddeh"
      },
      {
        "name": "Tripoli Campus",
        "slug": "ulf-tripoli",
        "city": "Tripoli"
      },
      {
        "name": "Beirut Campus",
        "slug": "ulf-beirut",
        "city": "Beirut"
      }
    ]
  },
  {
    "name": "Al Kafaat University",
    "shortName": "AKU",
    "slug": "aku",
    "campuses": [
      {
        "name": "Ain Saadeh Campus",
        "slug": "aku-ain-saadeh",
        "city": "Ain Saadeh"
      }
    ]
  },
  {
    "name": "Holy Family University",
    "shortName": "USF",
    "slug": "hfu",
    "campuses": [
      {
        "name": "Batroun Campus",
        "slug": "hfu-batroun",
        "city": "Batroun"
      }
    ]
  },
  {
    "name": "University of Tripoli",
    "shortName": "UT",
    "slug": "ut",
    "campuses": [
      {
        "name": "Tripoli Campus",
        "slug": "ut-tripoli",
        "city": "Tripoli"
      }
    ]
  },
  {
    "name": "American University of Culture and Education",
    "shortName": "AUCE",
    "slug": "auce",
    "campuses": [
      {
        "name": "Beirut Campus",
        "slug": "auce-beirut",
        "city": "Beirut"
      },
      {
        "name": "Koura Campus",
        "slug": "auce-koura",
        "city": "Koura"
      },
      {
        "name": "Baouchrieh Campus",
        "slug": "auce-baouchrieh",
        "city": "Baouchrieh"
      },
      {
        "name": "Tyre Campus",
        "slug": "auce-tyre",
        "city": "Tyre"
      },
      {
        "name": "Nabatiyeh Campus",
        "slug": "auce-nabatiyeh",
        "city": "Nabatiyeh"
      }
    ]
  },
  {
    "name": "University of Sciences and Arts in Lebanon",
    "shortName": "USAL",
    "slug": "usal",
    "campuses": [
      {
        "name": "Beirut Campus",
        "slug": "usal-beirut",
        "city": "Beirut"
      }
    ]
  },
  {
    "name": "Phoenicia University",
    "shortName": "PU",
    "slug": "phoenicia",
    "campuses": [
      {
        "name": "Daoudiyeh Campus",
        "slug": "pu-dist",
        "city": "Daoudiyeh"
      }
    ]
  },
  {
    "name": "Al Maaref University",
    "shortName": "MAAREF",
    "slug": "maaref",
    "campuses": [
      {
        "name": "Beirut Campus",
        "slug": "maaref-beirut",
        "city": "Beirut"
      }
    ]
  },
  {
    "name": "Al Azm University",
    "shortName": "AZM",
    "slug": "azm",
    "campuses": [
      {
        "name": "Tripoli Campus",
        "slug": "azm-tripoli",
        "city": "Tripoli"
      }
    ]
  },
  {
    "name": "International University",
    "shortName": "IU",
    "slug": "iub",
    "campuses": [
      {
        "name": "Sin El Fil Campus",
        "slug": "iub-beirut",
        "city": "Sin El Fil"
      },
      {
        "name": "Akkar Campus",
        "slug": "iub-akkar",
        "city": "Halba"
      }
    ]
  }
];

export const INSTITUTIONS_BY_SHORT_NAME: WaitlistInstitution[] = [...INSTITUTIONS].sort(
  (a, b) => a.shortName.localeCompare(b.shortName, "en"),
);

export function institutionByShortName(
  shortName: string,
): WaitlistInstitution | undefined {
  return INSTITUTIONS.find((institution) => institution.shortName === shortName);
}

export type StoredPlace = {
  university: string | null;
  campus: string | null;
};

export function resolveStoredPlace(input: {
  university?: string;
  universityOther?: string;
  campus?: string;
  universityRequired?: boolean;
}): { ok: true; place: StoredPlace } | { ok: false; message: string } {
  const choice = (input.university ?? "").trim();
  const other = (input.universityOther ?? "").trim();
  const campus = (input.campus ?? "").trim();

  if (!choice) {
    if (input.universityRequired) {
      return { ok: false, message: "Select your university" };
    }
    if (campus) {
      return { ok: false, message: "Select a university before a campus" };
    }
    return { ok: true, place: { university: null, campus: null } };
  }

  if (choice === OTHER_UNIVERSITY) {
    if (other.length < 2) {
      return { ok: false, message: "Enter your university" };
    }
    if (campus) {
      return {
        ok: false,
        message: "That campus is not part of this university",
      };
    }
    return { ok: true, place: { university: other, campus: null } };
  }

  const institution = institutionByShortName(choice);
  if (!institution) {
    return { ok: false, message: "Select your university" };
  }

  if (institution.campuses.length === 1) {
    const only = institution.campuses[0]?.name;
    if (!only) return { ok: false, message: "Select your campus" };
    if (campus && campus !== only) {
      return {
        ok: false,
        message: "That campus is not part of this university",
      };
    }
    return {
      ok: true,
      place: { university: institution.shortName, campus: only },
    };
  }

  if (!campus) return { ok: false, message: "Select your campus" };
  if (!institution.campuses.some((item) => item.name === campus)) {
    return {
      ok: false,
      message: "That campus is not part of this university",
    };
  }
  return { ok: true, place: { university: institution.shortName, campus } };
}

export const CAMPUS_FILTER_OPTIONS: { value: string; label: string }[] =
  INSTITUTIONS_BY_SHORT_NAME.flatMap((institution) =>
    institution.campuses.map((campus) => ({
      value: `${institution.shortName}:::${campus.name}`,
      label: `${institution.shortName} — ${campus.name}`,
    })),
  );

export function parseCampusFilter(
  value: string,
): { university: string; campus: string } | null {
  const splitAt = value.indexOf(":::");
  if (splitAt <= 0) return null;
  const university = value.slice(0, splitAt);
  const campus = value.slice(splitAt + 3);
  if (!university || !campus) return null;
  if (!institutionByShortName(university)?.campuses.some((item) => item.name === campus)) {
    return null;
  }
  return { university, campus };
}

/** Academic catalog for the Campus tuition calculator. Amounts are official published USD. */

export type ProgramSeed = {
  name: string;
  slug: string;
  perCreditUsd: number;
  academicYear: string;
  sourceUrl: string;
  defaultCredits?: number;
  /** Full major credit requirement (US or ECTS). */
  totalCredits?: number;
  maxBilledCredits?: number;
  creditSystem?: "us" | "ects";
  degreeLevel?: "bachelor" | "master";
};

export type FacultySeed = {
  name: string;
  slug: string;
  programs?: ProgramSeed[];
};

export type InstitutionAcademicSeed = {
  institutionSlug: string;
  faculties: FacultySeed[];
  fees?: {
    name: string;
    amountUsd: number;
    period: "term" | "year";
    academicYear: string;
    sourceUrl: string;
  }[];
};

const LAU_SRC = "https://www.lau.edu.lb/fees/2025-2026/";
const AUB_TUITION_SRC =
  "https://aub.edu.lb/comptroller/Documents/Students/Tuition%20Fees.pdf";
const AUB_COA_SRC = "https://www.aub.edu.lb/faid/Pages/Cost-of-Attendance.aspx";
const USJ_SRC = "https://usj.edu.lb/catalogues/2025/1/05.1-Coutducredit1ercycle.pdf";
const UA_SRC = "https://ua.edu.lb/en/undergraduate/tuition-fees";
const NDU_SRC = "https://www.ndu.edu.lb/office-of-finance/tuition-fees";
const USEK_SRC =
  "https://www.usek.edu.lb/en/university-fees/undergraduate-studies-1";
const BAU_SRC =
  "https://websitedev.bau.edu.lb/BAUUpload/BAU-Library/files/Admission/Undergraduate-Tuition-Fees-26-27.pdf";
const UOB_SRC =
  "https://www.balamand.edu.lb/Style%20Library/PDFs/CurrentStudents/FeesExpenses.pdf";
const LIU_SRC = "https://liu.edu.lb/cms26/public/page.php?slug=tuition";
const ULS_SRC = "https://www.uls.edu.lb/admissions/tuition-fees/";
const MEU_SRC =
  "https://meu.edu.lb/wp-content/uploads/2026/07/Tuition-Master-2026-2027-.pdf";
const HAIGAZIAN_SRC =
  "https://www.haigazian.edu.lb/admissions/tuition-fees/undergraduate-tuition-and-fees/";
const MAKASSED_SRC = "https://mub.edu.lb/tuition-fees/";
const JINAN_SRC = "https://www.jinan.edu.lb/pages/en/lebanese-students";
const GLOBAL_SRC = "https://www.gu.edu.lb/financial-policies";
const AOU_SRC =
  "https://web.aou.edu.lb/admission/pages/undergraduate-programs.aspx";
const RHU_SRC =
  "https://www.rhu.edu.lb/Library/Assets/Gallery/Files/tuitionandfees2627.pdf";
const AUST_SRC =
  "https://www.aust.edu.lb/section/the-admission/tuition-fees-and-expenses/undergraduate-tuition-fees/224";
const AUT_SRC =
  "https://www.aut.edu/wp-content/uploads/2025/10/Updated-Catalogue-2025-2026-.pdf";
const MUBS_SRC = "https://www.mubs.edu.lb/en/admission/tuition.aspx";
const LCU_SRC = "https://www.lcu.edu.lb/lcu-tuition-fees/";
const ULF_SRC = "https://ulf.edu.lb/pages/tuition_fees.php?lang=en";
const HFU_SRC =
  "https://usf.edu.lb/article/admission-et-inscription/les-frais-universitaires";
const UT_SRC = "https://new.ut.edu.lb/pre-registration/license-se/";
const USAL_SRC = "https://usal.edu.lb/tuition-fees/";
const PHOENICIA_SRC = "https://www.pu.edu.lb/undergraduate-tuition-and-fees";
const MAAREF_SRC = "https://www.mu.edu.lb/en/study-at-mu/mu-tuition-fees/";
const AZM_SRC =
  "https://web.eiu.edu.lb/EIU/view_page_content.php?page_name=VHVpdGlvbiBGZWVz&template_id=NQ%3D%3D";

function ua(
  name: string,
  slug: string,
  perCreditUsd: number,
  defaultCredits = 15,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2026-2027",
    sourceUrl: UA_SRC,
    defaultCredits,
    creditSystem: "us",
  };
}

function ndu(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2026-2027",
    sourceUrl: NDU_SRC,
    defaultCredits: 15,
    creditSystem: "us",
  };
}

function usek(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2026-2027",
    sourceUrl: USEK_SRC,
    defaultCredits: 15,
    creditSystem: "us",
  };
}

function bau(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2026-2027",
    sourceUrl: BAU_SRC,
    defaultCredits: 15,
    creditSystem: "us",
  };
}

function uob(
  name: string,
  slug: string,
  perCreditUsd: number,
  creditSystem: "us" | "ects" = "us",
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2026-2027",
    sourceUrl: UOB_SRC,
    defaultCredits: creditSystem === "ects" ? 30 : 15,
    creditSystem,
  };
}

function liu(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2026-2027",
    sourceUrl: LIU_SRC,
    defaultCredits: 15,
    creditSystem: "us",
  };
}

function uls(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2025-2026",
    sourceUrl: ULS_SRC,
    defaultCredits: 15,
    creditSystem: "us",
  };
}

function meu(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2026-2027",
    sourceUrl: MEU_SRC,
    defaultCredits: 15,
    creditSystem: "us",
  };
}

function haigazian(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2026-2027",
    sourceUrl: HAIGAZIAN_SRC,
    defaultCredits: 15,
    creditSystem: "us",
  };
}

function makassed(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2025-2026",
    sourceUrl: MAKASSED_SRC,
    defaultCredits: 15,
    creditSystem: "us",
  };
}

function jinan(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2026-2027",
    sourceUrl: JINAN_SRC,
    defaultCredits: 15,
    creditSystem: "us",
  };
}

function globalUni(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2025-2026",
    sourceUrl: GLOBAL_SRC,
    defaultCredits: 15,
    creditSystem: "us",
  };
}

function aou(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2026-2027",
    sourceUrl: AOU_SRC,
    defaultCredits: 15,
    creditSystem: "us",
  };
}

function rhu(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2026-2027",
    sourceUrl: RHU_SRC,
    defaultCredits: 15,
    creditSystem: "us",
  };
}

function aust(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2026-2027",
    sourceUrl: AUST_SRC,
    defaultCredits: 15,
    creditSystem: "us",
  };
}

function aut(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2025-2026",
    sourceUrl: AUT_SRC,
    defaultCredits: 15,
    creditSystem: "us",
  };
}

function mubs(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2026-2027",
    sourceUrl: MUBS_SRC,
    defaultCredits: 15,
    creditSystem: "us",
  };
}

function lcu(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2025-2026",
    sourceUrl: LCU_SRC,
    defaultCredits: 15,
    creditSystem: "us",
  };
}

function ulf(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2026-2027",
    sourceUrl: ULF_SRC,
    defaultCredits: 30,
    creditSystem: "ects",
  };
}

function hfu(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2026-2027",
    sourceUrl: HFU_SRC,
    defaultCredits: 15,
    creditSystem: "us",
  };
}

function ut(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2025-2026",
    sourceUrl: UT_SRC,
    defaultCredits: 15,
    creditSystem: "us",
  };
}

function usal(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2025-2026",
    sourceUrl: USAL_SRC,
    defaultCredits: 15,
    creditSystem: "us",
  };
}

function phoenicia(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2026-2027",
    sourceUrl: PHOENICIA_SRC,
    defaultCredits: 15,
    creditSystem: "us",
  };
}

function maaref(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2024-2025",
    sourceUrl: MAAREF_SRC,
    defaultCredits: 15,
    creditSystem: "us",
  };
}

function azm(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2026-2027",
    sourceUrl: AZM_SRC,
    defaultCredits: 15,
    creditSystem: "us",
  };
}

function lau(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2025-2026",
    sourceUrl: LAU_SRC,
    defaultCredits: 15,
    creditSystem: "us",
  };
}

function aub(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2023-2024",
    sourceUrl: AUB_TUITION_SRC,
    defaultCredits: 15,
    maxBilledCredits: 15,
    creditSystem: "us",
  };
}

function usj(
  name: string,
  slug: string,
  perCreditUsd: number,
): ProgramSeed {
  return {
    name,
    slug,
    perCreditUsd,
    academicYear: "2024-2025",
    sourceUrl: USJ_SRC,
    defaultCredits: 30,
    creditSystem: "ects",
  };
}

export const academicSeeds: InstitutionAcademicSeed[] = [
  {
    institutionSlug: "lau",
    faculties: [
      {
        name: "School of Architecture & Design",
        slug: "architecture-design",
        programs: [
          lau("Architecture (B.Arch.)", "architecture", 942),
          lau("Fashion Design (B.F.A.)", "fashion-design", 942),
          lau("Graphic Design (B.F.A.)", "graphic-design", 942),
          lau("Interior Design (B.F.A.)", "interior-design", 942),
          lau("Studio Art (B.F.A.)", "studio-art", 942),
        ],
      },
      {
        name: "School of Arts & Sciences",
        slug: "arts-sciences",
        programs: [
          lau("Applied Physics (B.S.)", "applied-physics", 859),
          lau("Bioinformatics (B.S.)", "bioinformatics", 859),
          lau("Biology (B.S.)", "biology", 859),
          lau("Chemistry (B.S.)", "chemistry", 859),
          lau("Communication (B.A.)", "communication", 859),
          lau("Computer Science (B.S.)", "computer-science", 859),
          lau("Education (B.S.)", "education", 770),
          lau("English (B.A.)", "english", 770),
          lau("Mathematics (B.S.)", "mathematics", 855),
          lau("Multimedia Journalism (B.A.)", "multimedia-journalism", 859),
          lau("Nutrition and Dietetics (B.S.)", "nutrition", 859),
          lau("Performing Arts (B.A.)", "performing-arts", 859),
          lau("Political Science / International Affairs (B.A.)", "political-science", 770),
          lau("Psychology (B.A.)", "psychology", 770),
          lau("Translation (B.A.)", "translation", 770),
          lau("TV & Film (B.A.)", "tv-film", 859),
        ],
      },
      {
        name: "Adnan Kassar School of Business",
        slug: "business",
        programs: [
          lau("Business (B.S.)", "business", 911),
          lau("Hospitality & Tourism Management (B.S.)", "hospitality", 911),
          lau("Economics (B.S.)", "economics", 911),
        ],
      },
      {
        name: "School of Engineering",
        slug: "engineering",
        programs: [
          lau("Chemical Engineering (B.E.)", "chemical-engineering", 935),
          lau("Civil Engineering (B.E.)", "civil-engineering", 935),
          lau("Computer Engineering (B.E.)", "computer-engineering", 935),
          lau("Electrical Engineering (B.E.)", "electrical-engineering", 935),
          lau("Industrial Engineering (B.E.)", "industrial-engineering", 935),
          lau("Mechanical Engineering (B.E.)", "mechanical-engineering", 935),
          lau("Mechatronics Engineering (B.E.)", "mechatronics-engineering", 935),
          lau("Petroleum Engineering (B.E.)", "petroleum-engineering", 935),
        ],
      },
      {
        name: "School of Pharmacy",
        slug: "pharmacy",
        programs: [lau("Pharmacy (B.S.)", "pharmacy", 999)],
      },
    ],
  },
  {
    institutionSlug: "aub",
    fees: [
      {
        name: "AUB fees (activity, internet, health insurance)",
        amountUsd: 848,
        period: "year",
        academicYear: "2025-2026",
        sourceUrl: AUB_COA_SRC,
      },
    ],
    faculties: [
      {
        name: "Faculty of Arts and Sciences",
        slug: "fas",
        programs: [
          aub("Freshman", "freshman", 783),
          aub("Humanities and Social Sciences", "humanities-social-sciences", 760),
          aub("Sciences", "sciences", 806),
          aub("Financial Economics", "financial-economics", 928),
        ],
      },
      {
        name: "Faculty of Agricultural and Food Sciences",
        slug: "fafs",
        programs: [aub("Undergraduate (FAFS)", "undergraduate", 821)],
      },
      {
        name: "Maroun Semaan Faculty of Engineering and Architecture",
        slug: "msfea",
        programs: [aub("Undergraduate (MSFEA)", "undergraduate", 909)],
      },
      {
        name: "Faculty of Health Sciences",
        slug: "fhs",
        programs: [aub("Undergraduate (FHS)", "undergraduate", 847)],
      },
      {
        name: "Suliman S. Olayan School of Business",
        slug: "osb",
        programs: [aub("Undergraduate (OSB)", "undergraduate", 880)],
      },
      {
        name: "Rafic Hariri School of Nursing",
        slug: "hson",
        programs: [aub("Undergraduate (HSON)", "undergraduate", 651)],
      },
    ],
  },
  {
    institutionSlug: "usj",
    faculties: [
      {
        name: "Faculty of Medicine",
        slug: "fm",
        programs: [usj("First cycle (FM)", "licence", 237)],
      },
      {
        name: "Faculty of Dental Medicine",
        slug: "fmd",
        programs: [usj("First cycle (FMD)", "licence", 220)],
      },
      {
        name: "Faculty of Pharmacy",
        slug: "fp",
        programs: [usj("First cycle (Pharmacy)", "licence", 164)],
      },
      {
        name: "Faculty of Engineering and Architecture (ESIB)",
        slug: "esib",
        programs: [usj("First cycle (ESIB)", "licence", 161)],
      },
      {
        name: "Faculty of Sciences",
        slug: "fs",
        programs: [usj("First cycle (Sciences)", "licence", 115)],
      },
      {
        name: "Faculty of Humanities Ramez G. Chagoury",
        slug: "flsh",
        programs: [usj("First cycle (FLSH)", "licence", 107)],
      },
      {
        name: "Faculty of Education",
        slug: "fsedu",
        programs: [usj("First cycle (Education)", "licence", 110)],
      },
      {
        name: "IESAV — Audiovisual",
        slug: "iesav",
        programs: [usj("First cycle (IESAV)", "licence", 133)],
      },
    ],
  },
  {
    institutionSlug: "ua",
    fees: [
      {
        name: "Registration fee",
        amountUsd: 270,
        period: "term",
        academicYear: "2026-2027",
        sourceUrl: UA_SRC,
      },
    ],
    faculties: [
      {
        name: "Antonine School of Business",
        slug: "business",
        programs: [ua("Business Administration (B.B.A.)", "bba", 200)],
      },
      {
        name: "Faculty of Engineering and Technology",
        slug: "engineering",
        programs: [
          ua(
            "Computer and Communications Engineering (B.E., ≤96 credits)",
            "cce",
            245,
          ),
          ua(
            "Computer and Communications Engineering (B.E., after 96 credits)",
            "cce-upper",
            275,
          ),
          ua("Computer Science (B.Tech.)", "computer-science", 245),
        ],
      },
      {
        name: "Faculty of Information and Communication",
        slug: "info-comm",
        programs: [
          ua(
            "Advertising — Audiovisual, Journalism and Radio/TV (B.A.)",
            "advertising",
            170,
          ),
          ua("Advertising — Graphic Design (B.A.)", "graphic-design", 190),
        ],
      },
      {
        name: "Faculty of Music and Musicology",
        slug: "music",
        programs: [
          ua("Music and Musicology — collective courses (B.A.)", "music-collective", 160),
          ua("Music and Musicology — individual courses (B.A.)", "music-individual", 200),
        ],
      },
      {
        name: "Faculty of Public Health",
        slug: "public-health",
        programs: [
          ua("Nursing Sciences (B.S.)", "nursing", 165),
          ua("Dental Laboratory Technology (B.S.)", "dental-lab", 190),
          ua("Physical Therapy (B.S.)", "physical-therapy", 230),
        ],
      },
      {
        name: "Faculty of Sport Sciences",
        slug: "sport",
        programs: [
          ua("Physical Education and Sport (B.A.)", "physical-education", 200),
        ],
      },
      {
        name: "Faculty of Theology",
        slug: "theology",
        programs: [
          ua(
            "Theological Sciences and Pastoral Studies (B.A.)",
            "theology",
            75,
          ),
        ],
      },
    ],
  },
  {
    institutionSlug: "ndu",
    fees: [
      {
        name: "Technology and student services fee",
        amountUsd: 500,
        period: "term",
        academicYear: "2026-2027",
        sourceUrl: NDU_SRC,
      },
    ],
    faculties: [
      {
        name: "Ramez G. Chagoury Faculty of Architecture, Arts and Design",
        slug: "architecture-arts-design",
        programs: [
          ndu("Architecture (B.Arch.)", "architecture", 440),
          ndu("Fashion Design (B.A.)", "fashion-design", 380),
          ndu("Graphic Design (B.A.)", "graphic-design", 380),
          ndu("Interior Design (B.A.)", "interior-design", 380),
          ndu("Music and Musicology — Musicology (B.A.)", "musicology", 380),
          ndu("Music and Musicology — Musimedialogy (B.A.)", "musimedialogy", 380),
          ndu("Photography (B.A.)", "photography", 380),
        ],
      },
      {
        name: "Faculty of Business Administration and Economics",
        slug: "business",
        programs: [
          ndu("Accounting (B.B.A.)", "accounting", 395),
          ndu("Banking and Finance (B.B.A.)", "banking-finance", 395),
          ndu("Distribution and Logistics Management (B.B.A.)", "logistics", 395),
          ndu("Entrepreneurship (B.B.A.)", "entrepreneurship", 395),
          ndu("Financial Engineering (B.B.A.)", "financial-engineering", 395),
          ndu("Human Resource Management (B.B.A.)", "hr", 395),
          ndu("International Business Management (B.B.A.)", "ibm", 395),
          ndu("Management (B.B.A.)", "management", 395),
          ndu("Marketing (B.B.A.)", "marketing", 395),
          ndu("Economics (B.S.)", "economics", 395),
          ndu("Hospitality — Events Management", "hospitality-events", 395),
          ndu("Hospitality — Food and Beverage Management", "hospitality-fb", 395),
          ndu("Hospitality Management", "hospitality", 395),
        ],
      },
      {
        name: "Faculty of Engineering",
        slug: "engineering",
        programs: [
          ndu("Chemical Engineering (B.E.)", "chemical-engineering", 470),
          ndu("Civil Engineering (B.E.)", "civil-engineering", 470),
          ndu("Computer and Communication Engineering (B.E.)", "cce", 470),
          ndu("Electrical Engineering (B.E.)", "electrical-engineering", 470),
          ndu("Mechanical Engineering (B.E.)", "mechanical-engineering", 470),
          ndu("Petroleum Engineering (B.E.)", "petroleum-engineering", 470),
        ],
      },
      {
        name: "Faculty of Humanities",
        slug: "humanities",
        programs: [
          ndu("Advertising and Marketing (B.A.)", "advertising-marketing", 380),
          ndu("Communication Arts — Journalism and Electronic Media (B.A.)", "journalism", 380),
          ndu("Communication Arts — Radio/TV (B.A.)", "radio-tv", 380),
          ndu("Education — Basic Education with Teaching Diploma (B.A.)", "education", 380),
          ndu("English Language (B.A.)", "english", 380),
          ndu("Physical Education and Sport (B.A.)", "physical-education", 380),
          ndu("Psychology (B.A.)", "psychology", 380),
          ndu("Translation and Interpretation (B.A.)", "translation", 380),
        ],
      },
      {
        name: "Faculty of Law and Political Science",
        slug: "law-political",
        programs: [
          ndu("Laws (LL.B.)", "laws", 380),
          ndu("International Affairs and Diplomacy (B.A.)", "iad", 380),
          ndu("Political Science (B.A.)", "political-science", 380),
          ndu("Political Science — American Studies (B.A.)", "political-science-american", 380),
          ndu("Political Science — Euro-Mediterranean Studies (B.A.)", "political-science-euro", 380),
          ndu("Political Science — NGOs (B.A.)", "political-science-ngos", 380),
          ndu("Public Administration (B.A.)", "public-administration", 380),
        ],
      },
      {
        name: "Faculty of Natural and Applied Sciences",
        slug: "natural-sciences",
        programs: [
          ndu("Computer Science (B.S.)", "computer-science", 440),
          ndu("Computer Science — Computer Graphics and Animation (B.S.)", "computer-science-graphics", 440),
          ndu("Computer Science — Information Technology (B.S.)", "computer-science-it", 440),
          ndu("Business Computing (B.S.)", "business-computing", 440),
          ndu("Business Computing — MIS (B.S.)", "mis", 440),
          ndu("Geographic Information Systems (B.S.)", "gis", 440),
          ndu("Actuarial Sciences (B.S.)", "actuarial", 380),
          ndu("Biochemistry (B.S.)", "biochemistry", 380),
          ndu("Biology (B.S.)", "biology", 380),
          ndu("Chemistry (B.S.)", "chemistry", 380),
          ndu("Environmental Science (B.S.)", "environmental-science", 380),
          ndu("Mathematics (B.S.)", "mathematics", 380),
          ndu("Physics (B.S.)", "physics", 380),
        ],
      },
      {
        name: "Faculty of Nursing and Health Sciences",
        slug: "nursing-health",
        programs: [
          ndu("Nursing (B.N.)", "nursing", 380),
          ndu("Food Safety and Quality Management (B.S.)", "food-safety", 380),
          ndu("Health Communication (B.S.)", "health-communication", 380),
          ndu("Medical Laboratory Technology (B.S.)", "mlt", 380),
          ndu("Nutrition and Dietetics (B.S.)", "nutrition", 380),
        ],
      },
    ],
  },
  {
    institutionSlug: "usek",
    fees: [
      {
        name: "Registration fee",
        amountUsd: 200,
        period: "term",
        academicYear: "2026-2027",
        sourceUrl: USEK_SRC,
      },
      {
        name: "Operational fees",
        amountUsd: 400,
        period: "term",
        academicYear: "2026-2027",
        sourceUrl: USEK_SRC,
      },
    ],
    faculties: [
      {
        name: "Business School",
        slug: "business",
        programs: [
          usek("Business Administration (B.B.A.)", "bba", 375),
          usek(
            "Business Administration — International Hospitality and Tourism (B.B.A.)",
            "hospitality",
            375,
          ),
        ],
      },
      {
        name: "Faculty of Arts and Sciences",
        slug: "arts-sciences",
        programs: [
          usek("Arabic Language and Literature (B.A.)", "arabic", 220),
          usek("English Language and Literature (B.A.)", "english", 220),
          usek("French Language and Literature (B.A.)", "french", 220),
          usek("Modern Languages and Translation (B.A.)", "translation", 220),
          usek("Philosophy (B.A.)", "philosophy", 220),
          usek("Social Sciences (B.A.)", "social-sciences", 220),
          usek("Education — Basic Education (B.A.)", "education-basic", 220),
          usek("Education — Early Childhood (B.A.)", "education-ece", 220),
          usek("History (B.A.)", "history", 220),
          usek("Liturgy (B.A.)", "liturgy", 220),
          usek("Religious and Pastoral Education (B.A.)", "religious-education", 220),
          usek(
            "Conservation, Restoration of Cultural Property and Sacred Art (B.A.)",
            "sacred-art",
            220,
          ),
          usek("Performing Arts (B.A.)", "performing-arts", 220),
          usek("Journalism and Communication (B.A.)", "journalism", 220),
          usek("Cinema and Television (B.A.)", "cinema-tv", 340),
          usek("Psychology (B.A.)", "psychology", 240),
          usek("Human Nutrition and Dietetics (B.S.)", "nutrition", 330),
          usek("Computer Science (B.S.)", "computer-science", 385),
          usek("Information Technology (B.S.)", "it", 385),
          usek("Actuarial and Financial Mathematics (B.S.)", "actuarial", 375),
          usek("Chemistry (B.S.)", "chemistry", 385),
          usek("Biochemistry (B.S.)", "biochemistry", 385),
          usek("Biology (B.S.)", "biology", 385),
        ],
      },
      {
        name: "School of Engineering",
        slug: "engineering",
        programs: [
          usek("Agricultural Engineering (diploma)", "agricultural-engineering", 250),
          usek("Food Engineering (B.S.)", "food-engineering", 315),
          usek("Biomedical Engineering (B.E.)", "biomedical-engineering", 445),
          usek("Chemical Engineering (B.E.)", "chemical-engineering", 445),
          usek("Civil Engineering (B.E.)", "civil-engineering", 445),
          usek("Computer Engineering (B.E.)", "computer-engineering", 445),
          usek("Electrical and Electronics Engineering (B.E.)", "electrical-engineering", 445),
          usek("Telecommunications Engineering (B.E.)", "telecom-engineering", 445),
          usek("Mechanical Engineering (B.E.)", "mechanical-engineering", 445),
          usek("Petroleum Engineering (B.E.)", "petroleum-engineering", 445),
        ],
      },
      {
        name: "School of Law and Political Sciences",
        slug: "law-political",
        programs: [
          usek("Law", "law", 240),
          usek("Political Sciences (B.A.)", "political-sciences", 240),
          usek("International Relations (B.A.)", "international-relations", 240),
        ],
      },
      {
        name: "School of Medicine and Medical Sciences",
        slug: "medicine",
        programs: [usek("Medicine", "medicine", 440)],
      },
      {
        name: "Higher Institute of Nursing Sciences",
        slug: "nursing",
        programs: [usek("Nursing Sciences (B.S.)", "nursing", 300)],
      },
      {
        name: "School of Architecture and Design",
        slug: "architecture-design",
        programs: [
          usek("Architecture", "architecture", 375),
          usek("Interior Design", "interior-design", 350),
          usek("Design and Applied Arts (B.A.)", "design-applied-arts", 350),
          usek("Digital Media (B.A.)", "digital-media", 350),
          usek("Communication and Visual Arts (B.A.)", "visual-arts", 350),
        ],
      },
      {
        name: "School of Music and Performing Arts",
        slug: "music",
        programs: [
          usek("Music (B.A.)", "music", 220),
          usek("Higher and Specialized Music Education (B.A.)", "music-education", 220),
        ],
      },
      {
        name: "Pontifical School of Theology",
        slug: "theology",
        programs: [usek("Theology (B.A.)", "theology", 220)],
      },
    ],
  },
  {
    institutionSlug: "bau",
    fees: [
      {
        name: "Services (technology, healthcare, extracurricular)",
        amountUsd: 200,
        period: "term",
        academicYear: "2026-2027",
        sourceUrl: BAU_SRC,
      },
    ],
    faculties: [
      {
        name: "Faculty of Human Sciences",
        slug: "human-sciences",
        programs: [
          bau("Arabic Language and Literature (B.A.)", "arabic", 117),
          bau("English Language and Literature (B.A.)", "english", 117),
          bau("French Language and Literature (B.A.)", "french", 117),
          bau("History (B.A.)", "history", 117),
          bau("Sociology (B.A.)", "sociology", 117),
          bau("Psychology (B.A.)", "psychology", 117),
          bau("Mass Communication (B.A.)", "mass-communication", 123),
          bau("Education — Early Childhood (B.A.)", "education-ece", 150),
          bau("Education — Arabic Language (B.A.)", "education-arabic", 150),
          bau("Education — English Language (B.A.)", "education-english", 150),
          bau("Education — Sciences and Mathematics (B.A.)", "education-sm", 150),
          bau("Education — Social Sciences (B.A.)", "education-ss", 150),
        ],
      },
      {
        name: "Faculty of Law and Political Science",
        slug: "law-political",
        programs: [bau("Law", "law", 117)],
      },
      {
        name: "Faculty of Business Administration",
        slug: "business",
        programs: [
          bau("Management (B.B.A.)", "management", 150),
          bau("Banking and Finance (B.B.A.)", "banking-finance", 150),
          bau("Marketing (B.B.A.)", "marketing", 150),
          bau("Management Information Systems (B.B.A.)", "mis", 150),
          bau("Accounting (B.B.A.)", "accounting", 150),
          bau("Economics (B.B.A.)", "economics", 150),
        ],
      },
      {
        name: "Faculty of Architecture — Design and Built Environment",
        slug: "architecture",
        programs: [
          bau("Architecture (B.Arch.)", "architecture", 228),
          bau("Graphic Design (B.A.)", "graphic-design", 169),
          bau("Interior Design (B.A.)", "interior-design", 169),
          bau("Fashion Design (B.A.)", "fashion-design", 169),
        ],
      },
      {
        name: "Faculty of Engineering",
        slug: "engineering",
        programs: [
          bau("Civil Engineering (B.E.)", "civil-engineering", 228),
          bau("Computer Engineering (B.E.)", "computer-engineering", 228),
          bau(
            "Communications and Electronics Engineering (B.E.)",
            "communications-electronics",
            228,
          ),
          bau("Mechanical Engineering (B.E.)", "mechanical-engineering", 228),
          bau("Petroleum Engineering (B.E.)", "petroleum-engineering", 228),
          bau("Biomedical Engineering (B.E.)", "biomedical-engineering", 228),
          bau("Chemical Engineering (B.E.)", "chemical-engineering", 228),
          bau(
            "Electrical Power and Machines Engineering (B.E.)",
            "electrical-power",
            228,
          ),
          bau("Industrial Engineering (B.E.)", "industrial-engineering", 228),
          bau("Renewable Energy Engineering (B.E.)", "renewable-energy", 228),
        ],
      },
      {
        name: "Faculty of Science",
        slug: "science",
        programs: [
          bau("Physics (B.S.)", "physics", 160),
          bau("Mathematics (B.S.)", "mathematics", 160),
          bau("Chemistry (B.S.)", "chemistry", 160),
          bau("Biology (B.S.)", "biology", 160),
          bau("Biochemistry (B.S.)", "biochemistry", 160),
          bau("Computer Science (B.S.)", "computer-science", 160),
        ],
      },
      {
        name: "Faculty of Pharmacy",
        slug: "pharmacy",
        programs: [bau("Pharmacy", "pharmacy", 273)],
      },
      {
        name: "Faculty of Medicine",
        slug: "medicine",
        programs: [bau("Medicine and Surgery", "medicine", 445)],
      },
      {
        name: "Faculty of Dentistry",
        slug: "dentistry",
        programs: [bau("Dentistry", "dentistry", 428)],
      },
      {
        name: "Faculty of Health Sciences",
        slug: "health",
        programs: [
          bau("Nursing (B.S.)", "nursing", 150),
          bau("Medical Laboratory Technology (B.S.)", "mlt", 162),
          bau("Nutrition and Dietetics (B.S.)", "nutrition", 162),
          bau("Physical Therapy (B.S.)", "physical-therapy", 162),
        ],
      },
    ],
  },
  {
    institutionSlug: "uob",
    fees: [
      {
        name: "Student activities",
        amountUsd: 215,
        period: "term",
        academicYear: "2026-2027",
        sourceUrl: UOB_SRC,
      },
      {
        name: "Internet",
        amountUsd: 35,
        period: "term",
        academicYear: "2026-2027",
        sourceUrl: UOB_SRC,
      },
    ],
    faculties: [
      {
        name: "Académie libanaise des beaux-arts",
        slug: "alba",
        programs: [
          uob("Études architecturales — Dekouaneh (Licence)", "etudes-architecturales", 255, "ects"),
          uob("Architecture d'intérieur — Dekouaneh (Licence)", "architecture-interieure", 255, "ects"),
          uob("Graphisme et publicité — Dekouaneh (Licence)", "graphisme", 255, "ects"),
          uob("Création multimédia — Dekouaneh (Licence)", "creation-multimedia", 255, "ects"),
          uob("Illustration — bande dessinée — Dekouaneh (Licence)", "illustration-bd", 255, "ects"),
          uob("Animation 2D/3D — Dekouaneh (Licence)", "animation", 255, "ects"),
          uob("Photographie — Dekouaneh (Licence)", "photographie", 255, "ects"),
          uob("Arts visuels — Dekouaneh (Licence)", "arts-visuels", 255, "ects"),
          uob("Design de produits — Dekouaneh (Licence)", "design-produits", 255, "ects"),
          uob("Réalisation audiovisuelle — Dekouaneh (Licence)", "realisation-audiovisuelle", 255, "ects"),
          uob("Architecture du paysage — Dekouaneh (Licence)", "architecture-paysage", 255, "ects"),
          uob("Design de mode — Dekouaneh (Licence)", "design-mode", 255, "ects"),
          uob("Television and Digital Media — Dekouaneh (B.F.A.)", "television-digital-media", 255, "ects"),
          uob("Architectural Studies — Balamand (B.S.)", "architectural-studies", 410),
          uob("Interior Architecture and Design — Balamand (B.F.A.)", "interior-architecture", 410),
          uob("Computer Graphics and Interactive Media — Balamand (B.F.A.)", "computer-graphics", 410),
          uob("Graphic Design — Balamand (B.F.A.)", "graphic-design", 410),
        ],
      },
      {
        name: "Faculty of Arts and Sciences",
        slug: "arts-sciences",
        programs: [
          uob("Arabic Language and Literature (B.A.)", "arabic", 435),
          uob("Education (B.A.)", "education", 435),
          uob("English Language and Literature (B.A.)", "english", 435),
          uob("French Language and Literature (B.A.)", "french", 435),
          uob("History (B.A.)", "history", 435),
          uob("Languages and Translation (B.A.)", "translation", 435),
          uob("Mass Media and Communication (B.A.)", "mass-media", 435),
          uob("Philosophy (B.A.)", "philosophy", 435),
          uob("Physical Education (B.A.)", "physical-education", 435),
          uob("Political Science and International Affairs (B.A.)", "psia", 435),
          uob("Psychology (B.A.)", "psychology", 435),
          uob("Biology (B.S.)", "biology", 485),
          uob("Chemistry (B.S.)", "chemistry", 485),
          uob("Computer Science (B.S.)", "computer-science", 485),
          uob("Environmental Sciences (B.S.)", "environmental-sciences", 485),
          uob("Mathematics (B.S.)", "mathematics", 485),
          uob("Physics (B.S.)", "physics", 485),
        ],
      },
      {
        name: "Faculty of Business and Management",
        slug: "business",
        programs: [
          uob("Business Administration — Accounting and Auditing (B.B.A.)", "accounting", 480),
          uob("Business Administration — Finance (B.B.A.)", "finance", 480),
          uob("Business Administration — Marketing and Innovation (B.B.A.)", "marketing", 480),
          uob("Business Administration — Management and Entrepreneurship (B.B.A.)", "management", 480),
          uob("Tourism and Hotel Management (B.B.A.)", "tourism", 480),
          uob("Economics (B.S.)", "economics", 480),
        ],
      },
      {
        name: "Faculty of Engineering",
        slug: "engineering",
        programs: [
          uob("Chemical Engineering (B.E.)", "chemical-engineering", 535),
          uob("Civil Engineering (B.E.)", "civil-engineering", 535),
          uob("Computer Engineering (B.E.)", "computer-engineering", 535),
          uob("Electrical Engineering (B.E.)", "electrical-engineering", 535),
          uob("Mechanical Engineering (B.E.)", "mechanical-engineering", 535),
        ],
      },
      {
        name: "Faculty of Health Sciences",
        slug: "health",
        programs: [
          uob("Nursing (B.S.)", "nursing", 485),
          uob("Public Health and Development Sciences (B.S.)", "public-health", 485),
          uob("Medical Laboratory Sciences (B.S.)", "mls", 485),
          uob("Health Promotion (B.S.)", "health-promotion", 485),
          uob("Nutritional Sciences (B.S.)", "nutrition", 485),
        ],
      },
      {
        name: "Issam M. Fares Faculty of Technology",
        slug: "technology",
        programs: [
          uob("Aircraft Maintenance (B.Tech.)", "aircraft-maintenance", 275),
          uob("Mechatronics (B.Tech.)", "mechatronics", 275),
          uob("Telecommunications and Networks (B.Tech.)", "telecom-networks", 275),
          uob("Management and Administration (B.Tech.)", "management-admin", 275),
          uob("Agriculture (B.Tech.)", "agriculture", 275),
          uob("Civil Construction (B.Tech.)", "civil-construction", 275),
        ],
      },
    ],
  },
  {
    institutionSlug: "liu",
    fees: [
      {
        name: "Registration fee",
        amountUsd: 150,
        period: "term",
        academicYear: "2026-2027",
        sourceUrl: LIU_SRC,
      },
    ],
    faculties: [
      {
        name: "School of Arts and Sciences",
        slug: "arts-sciences",
        programs: [
          liu("Advertising (B.A.)", "advertising", 169),
          liu("Biochemistry (B.S.)", "biochemistry", 169),
          liu("Biology (B.S.)", "biology", 169),
          liu("Biomedical Science (B.S.)", "biomedical-science", 169),
          liu("Chemistry (B.S.)", "chemistry", 169),
          liu("Computer Science (B.S.)", "computer-science", 215),
          liu("Information Technology (B.S.)", "information-technology", 215),
          liu("Food Science and Technology (B.S.)", "food-science", 169),
          liu("Graphic Design (B.A.)", "graphic-design", 169),
          liu("Interior Design (B.A.)", "interior-design", 169),
          liu("Journalism (B.A.)", "journalism", 169),
          liu("Mathematics (B.S.)", "mathematics", 169),
          liu("Nutrition and Dietetics (B.S.)", "nutrition", 169),
          liu("Physics (B.S.)", "physics", 169),
          liu("Public Relations (B.A.)", "public-relations", 169),
          liu("Radio and TV (B.A.)", "radio-tv", 169),
        ],
      },
      {
        name: "School of Business",
        slug: "business",
        programs: [
          liu("Accounting Information Systems (B.B.A.)", "accounting", 179),
          liu("Economics (B.B.A.)", "economics", 179),
          liu("Banking and Finance (B.B.A.)", "banking-finance", 179),
          liu("Hospitality and Tourism Management (B.B.A.)", "hospitality", 179),
          liu("Business Management (B.B.A.)", "management", 179),
          liu("Management Information Systems (B.B.A.)", "mis", 179),
          liu("Marketing (B.B.A.)", "marketing", 179),
          liu("International Business Management (B.B.A.)", "international-business", 179),
        ],
      },
      {
        name: "School of Education",
        slug: "education",
        programs: [
          liu("Basic Education — English (B.A.)", "education-english", 169),
          liu("Basic Education — Mathematics (B.A.)", "education-math", 169),
          liu("Basic Education — Sciences (B.A.)", "education-sciences", 169),
          liu("Teaching English as a Foreign Language (B.A.)", "tefl", 169),
          liu("Early Childhood Education (B.A.)", "ece", 169),
          liu("Translation and Interpretation (B.A.)", "translation", 169),
        ],
      },
      {
        name: "School of Engineering",
        slug: "engineering",
        programs: [
          liu("Computer and Communications Engineering (B.S.)", "cce", 215),
          liu("Electrical and Electronics Engineering (B.S.)", "electrical", 215),
          liu("Biomedical Engineering (B.S.)", "biomedical-engineering", 215),
          liu("Industrial Engineering (B.S.)", "industrial-engineering", 215),
          liu("Mechanical Engineering (B.S.)", "mechanical-engineering", 215),
          liu("Surveying Engineering (B.S.)", "surveying", 215),
        ],
      },
      {
        name: "School of Pharmacy",
        slug: "pharmacy",
        programs: [liu("Pharmacy (B.Pharm.)", "pharmacy", 299)],
      },
    ],
  },
  {
    institutionSlug: "uls",
    faculties: [
      {
        name: "Faculty of Law",
        slug: "law",
        programs: [uls("Law", "bachelor-in-law", 200)],
      },
      {
        name: "Faculty of Economics and Management",
        slug: "economics",
        programs: [
          uls("Business Administration — General Business", "general-business", 200),
          uls("Banking and Finance", "banking-and-finance", 200),
          uls("Accounting and Auditing", "accounting-and-auditing", 200),
          uls("Financial Economics", "financial-economics", 200),
          uls("Supply Chain Management", "supply-chain-management", 200),
          uls("Human Resource Management", "human-resource-management", 200),
          uls(
            "International Business and Economic Development",
            "international-business",
            200,
          ),
          uls("Management Information Systems", "mis", 200),
          uls("Financial Engineering", "financial-engineering", 200),
          uls("Management", "management", 200),
          uls("Marketing", "marketing", 200),
          uls("Economics", "economics", 200),
        ],
      },
      {
        name: "Faculty of Canon Law",
        slug: "canon-law",
        programs: [uls("Canon Law", "bachelor-in-canon-law", 80)],
      },
      {
        name: "Faculty of Tourism and Hotel Management",
        slug: "tourism",
        programs: [uls("Hospitality Management (B.S.)", "hospitality-management", 250)],
      },
      {
        name: "Faculty of Religious and Theological Sciences",
        slug: "religious",
        programs: [uls("Ecclesiastical Sciences", "ecclesiastical-sciences", 40)],
      },
      {
        name: "Faculty of Political Sciences",
        slug: "political",
        programs: [
          uls(
            "Political Science and International Relations",
            "political-science",
            170,
          ),
        ],
      },
      {
        name: "Faculty of Public Health",
        slug: "public-health",
        programs: [
          uls("Nursing (B.S.)", "nursing", 120),
          uls("Physiotherapy (B.S.)", "physiotherapy", 230),
          uls("Medical Imaging (B.S.)", "medical-imaging", 130),
        ],
      },
    ],
  },
  {
    institutionSlug: "meu",
    fees: [
      {
        name: "Registration fee",
        amountUsd: 265,
        period: "term",
        academicYear: "2026-2027",
        sourceUrl: MEU_SRC,
      },
      {
        name: "Development fee",
        amountUsd: 55,
        period: "term",
        academicYear: "2026-2027",
        sourceUrl: MEU_SRC,
      },
      {
        name: "Student association and publications",
        amountUsd: 65,
        period: "term",
        academicYear: "2026-2027",
        sourceUrl: MEU_SRC,
      },
      {
        name: "IT / computer center",
        amountUsd: 165,
        period: "term",
        academicYear: "2026-2027",
        sourceUrl: MEU_SRC,
      },
    ],
    faculties: [
      {
        name: "Faculty of Arts and Sciences",
        slug: "arts-sciences",
        programs: [
          meu("Graphic Design and Digital Media (B.A.)", "gdm", 265),
          meu("Biology (B.S.)", "biology", 265),
          meu("Computer Science (B.S.)", "computer-science", 265),
        ],
      },
      {
        name: "Faculty of Business Administration",
        slug: "business",
        programs: [
          meu("Business Administration (B.B.A.)", "bba", 265),
          meu("Information Systems (B.S.)", "information-systems", 265),
        ],
      },
      {
        name: "Faculty of Education",
        slug: "education",
        programs: [
          meu("English (B.A.)", "english", 265),
          meu("Elementary Education with Teaching Diploma (B.A.)", "elementary-education", 265),
        ],
      },
      {
        name: "Faculty of Philosophy and Theology",
        slug: "philosophy-theology",
        programs: [
          meu("Religion (B.A.)", "religion", 265),
          meu("Theology (B.A.)", "theology", 265),
        ],
      },
    ],
  },
  {
    institutionSlug: "haigazian",
    fees: [
      {
        name: "Information technology services",
        amountUsd: 120,
        period: "term",
        academicYear: "2026-2027",
        sourceUrl: HAIGAZIAN_SRC,
      },
    ],
    faculties: [
      {
        name: "Faculty of Business Administration and Economics",
        slug: "business",
        programs: [
          haigazian("Accounting (B.B.A.)", "accounting", 335),
          haigazian("Advertising and Communication (B.B.A.)", "advertising", 335),
          haigazian("Business Administration (B.B.A.)", "business-administration", 335),
          haigazian("Economics (B.A.)", "economics", 335),
          haigazian("Finance (B.B.A.)", "finance", 335),
          haigazian("Hospitality Management (B.B.A.)", "hospitality-bba", 335),
          haigazian("Hospitality Management (B.A.)", "hospitality-ba", 335),
          haigazian("Human Resources Management (B.B.A.)", "hrm", 335),
          haigazian("Management Information Systems (B.B.A.)", "mis", 335),
        ],
      },
      {
        name: "Faculty of Humanities",
        slug: "humanities",
        programs: [
          haigazian("Arabic Language and Literature (B.A.)", "arabic", 335),
          haigazian("Armenian Studies (B.A.)", "armenian-studies", 335),
          haigazian("English Literature (B.A.)", "english-literature", 335),
          haigazian("English Language (B.A.)", "english-language", 335),
          haigazian("History (B.A.)", "history", 335),
          haigazian("Music (B.A.)", "music", 335),
        ],
      },
      {
        name: "Faculty of Sciences — Natural Sciences",
        slug: "natural-sciences",
        programs: [
          haigazian("Biology (B.S.)", "biology", 335),
          haigazian("Chemistry (B.S.)", "chemistry", 335),
          haigazian("Medical Laboratory Sciences (B.S.)", "mls", 335),
          haigazian("Nutrition Sciences and Dietetics (B.S.)", "nutrition", 335),
          haigazian("Physics (B.S.)", "physics", 335),
        ],
      },
      {
        name: "Faculty of Sciences — Mathematical Sciences",
        slug: "mathematical-sciences",
        programs: [
          haigazian("Computer Science (B.S.)", "computer-science", 335),
          haigazian("Mathematics (B.S.)", "mathematics", 335),
        ],
      },
      {
        name: "Faculty of Social and Behavioral Sciences",
        slug: "social-behavioral",
        programs: [
          haigazian("Christian Education (B.A.C.E.)", "christian-education", 335),
          haigazian("Education — Elementary (B.A.)", "education-elementary", 335),
          haigazian("Early Childhood Education (B.A.)", "ece", 335),
          haigazian("Special Education (B.A.)", "special-education", 335),
          haigazian("Political Science (B.A.)", "political-science", 335),
          haigazian("Psychology (B.A.)", "psychology", 335),
          haigazian("Social Work (B.A.)", "social-work", 335),
        ],
      },
    ],
  },
  {
    institutionSlug: "makassed",
    faculties: [
      {
        name: "Faculty of Nursing and Health Sciences",
        slug: "nursing-health",
        programs: [makassed("Nursing (B.S.N.)", "bsn", 130)],
      },
    ],
  },
  {
    institutionSlug: "jinan",
    faculties: [
      {
        name: "Faculty of Communication",
        slug: "communication",
        programs: [
          jinan("Advertising and Visual Communication", "advertising", 150),
          jinan("Radio and Television", "radio-television", 120),
          jinan("Journalism", "journalism", 120),
        ],
      },
      {
        name: "Faculty of Business Administration",
        slug: "business",
        programs: [
          jinan("General Management", "general-management", 125),
          jinan("Marketing and Management", "marketing-management", 125),
          jinan("Accounting and Finance", "accounting-finance", 125),
          jinan("Business Information Technology", "bit", 180),
        ],
      },
      {
        name: "Faculty of Literature and Humanities",
        slug: "literature",
        programs: [jinan("Translation and Languages", "translation", 135)],
      },
      {
        name: "Faculty of Education",
        slug: "education",
        programs: [
          jinan("Kindergarten", "kindergarten", 125),
          jinan("School Elementary Teaching", "elementary-teaching", 125),
        ],
      },
      {
        name: "Faculty of Public Health",
        slug: "public-health",
        programs: [
          jinan("Medical Laboratory Technology", "mlt", 190),
          jinan("Nursing Sciences", "nursing", 180),
          jinan("Medical Social Assistance", "medical-social-assistance", 130),
        ],
      },
      {
        name: "Faculty of Sciences",
        slug: "sciences",
        programs: [
          jinan("Biology", "biology", 165),
          jinan("Biochemistry", "biochemistry", 165),
          jinan("Computer Science", "computer-science", 190),
        ],
      },
      {
        name: "Political Science Institute",
        slug: "political",
        programs: [jinan("Political Science", "political-science", 70)],
      },
    ],
  },
  {
    institutionSlug: "global",
    fees: [
      {
        name: "Registration fee (fall and spring)",
        amountUsd: 150,
        period: "term",
        academicYear: "2025-2026",
        sourceUrl: GLOBAL_SRC,
      },
    ],
    faculties: [
      {
        name: "Faculty of Literature and Humanities",
        slug: "literature",
        programs: [
          globalUni("Arabic Language and Literature (B.A.)", "arabic", 120),
          globalUni("English Education (B.A.)", "english-education", 120),
          globalUni(
            "English and Early Childhood Education (B.A.)",
            "english-ece",
            120,
          ),
          globalUni("Mathematics Education (B.A.)", "mathematics-education", 120),
          globalUni("Science Education (B.A.)", "science-education", 120),
        ],
      },
      {
        name: "Faculty of Health Sciences",
        slug: "health",
        programs: [
          globalUni("Medical Lab Sciences (B.S.)", "mls", 130),
          globalUni("Nursing (B.S.)", "nursing", 130),
          globalUni("Nutrition and Dietetics (B.S.)", "nutrition", 130),
          globalUni("Physical Therapy (B.S.)", "physical-therapy", 130),
        ],
      },
      {
        name: "Faculty of Administrative Sciences",
        slug: "administrative",
        programs: [
          globalUni("Accounting (B.B.A.)", "accounting", 120),
          globalUni("Human Resources Management (B.B.A.)", "hrm", 120),
          globalUni("Management (B.B.A.)", "management", 120),
          globalUni("Marketing (B.B.A.)", "marketing", 120),
          globalUni("Management Information Systems (B.S.)", "mis", 120),
          globalUni("Health Management Information Systems (B.S.)", "hmis", 120),
          globalUni("Computer Sciences (B.S.)", "computer-sciences", 150),
          globalUni("Information Technology (B.S.)", "information-technology", 150),
        ],
      },
    ],
  },
  {
    institutionSlug: "aou",
    fees: [
      {
        name: "Registration fee",
        amountUsd: 150,
        period: "term",
        academicYear: "2026-2027",
        sourceUrl: AOU_SRC,
      },
    ],
    faculties: [
      {
        name: "Faculty of Business Studies",
        slug: "business",
        programs: [
          aou("Business Studies — Accounting", "accounting", 105),
          aou("Business Studies — Finance and MicroFinance", "finance", 105),
          aou("Business Studies — Human Resource Management", "hrm", 105),
          aou("Business Studies — Management", "management", 105),
          aou("Business Studies — Marketing", "marketing", 105),
        ],
      },
      {
        name: "Faculty of Computer Studies",
        slug: "computer",
        programs: [
          aou("Graphic and Multimedia Design Technology", "gmdt", 105),
          aou("Information Technology and Computing", "itc", 105),
          aou("ITC — Artificial Intelligence", "itc-ai", 105),
          aou("ITC — Computer Science", "itc-cs", 105),
          aou("ITC — Computing with Business", "itc-business", 105),
          aou("ITC — Data Science", "itc-data-science", 105),
          aou("ITC — Networking and Security", "itc-networking", 105),
        ],
      },
      {
        name: "Faculty of Language Studies",
        slug: "language",
        programs: [
          aou("English Language and Literature", "english", 105),
          aou("English Language, Literature and Translation", "translation", 105),
        ],
      },
      {
        name: "Faculty of Education Studies",
        slug: "education",
        programs: [aou("Elementary Education", "elementary-education", 65)],
      },
    ],
  },
  {
    institutionSlug: "rhu",
    fees: [
      {
        name: "Service fees",
        amountUsd: 250,
        period: "term",
        academicYear: "2026-2027",
        sourceUrl: RHU_SRC,
      },
    ],
    faculties: [
      {
        name: "College of Business Administration",
        slug: "business",
        programs: [
          rhu("Accounting (B.B.A.)", "accounting", 176),
          rhu("Business IT Management (B.B.A.)", "business-it", 176),
          rhu("Finance and Banking (B.B.A.)", "finance-banking", 176),
          rhu("Human Resources Management (B.B.A.)", "hrm", 176),
          rhu("Management (B.B.A.)", "management", 176),
          rhu("Marketing and Advertising (B.B.A.)", "marketing", 176),
        ],
      },
      {
        name: "College of Engineering",
        slug: "engineering",
        programs: [
          rhu("Civil Engineering (B.S./B.E.)", "civil-engineering", 268),
          rhu("Biomedical Engineering (B.S./B.E.)", "biomedical-engineering", 268),
          rhu("Computer and Communications Engineering (B.S./B.E.)", "cce", 268),
          rhu("Electrical Engineering (B.S./B.E.)", "electrical-engineering", 268),
          rhu("Mechanical Engineering (B.S./B.E.)", "mechanical-engineering", 268),
          rhu("Mechatronics Engineering (B.S./B.E.)", "mechatronics-engineering", 268),
        ],
      },
      {
        name: "College of Arts and Sciences",
        slug: "arts-sciences",
        programs: [
          rhu("Graphic Design (B.S.)", "graphic-design", 205),
          rhu("Computer Science (B.S.)", "computer-science", 189),
        ],
      },
    ],
  },
  {
    institutionSlug: "aust",
    fees: [
      {
        name: "Registration fee",
        amountUsd: 363,
        period: "term",
        academicYear: "2026-2027",
        sourceUrl: AUST_SRC,
      },
      {
        name: "Technology fee",
        amountUsd: 120,
        period: "term",
        academicYear: "2026-2027",
        sourceUrl: AUST_SRC,
      },
    ],
    faculties: [
      {
        name: "Faculty of Arts and Sciences",
        slug: "arts-sciences",
        programs: [
          aust("Communication Arts — Digital Advertising (B.A.)", "comm-advertising", 220),
          aust("Communication Arts — Journalism (B.A.)", "comm-journalism", 220),
          aust("Communication Arts — Public Relations (B.A.)", "comm-pr", 220),
          aust("Communication Arts — Radio and Television (B.A.)", "comm-rtv", 220),
          aust("Computer Science (B.S.)", "computer-science", 220),
          aust("English Studies (B.A.)", "english-studies", 220),
          aust("Graphic Design (B.A.)", "graphic-design", 220),
          aust("Graphic Design — Fashion Design (B.A.)", "graphic-design-fashion", 220),
          aust("Information and Communications Technology (B.S.)", "ict", 220),
          aust("International Affairs (B.A.)", "international-affairs", 220),
          aust("Interior Design (B.A.)", "interior-design", 220),
          aust("Translation (B.A.)", "translation", 220),
        ],
      },
      {
        name: "Faculty of Business and Economics",
        slug: "business",
        programs: [
          aust("Accounting (B.S.)", "accounting", 220),
          aust("Economics (B.S.)", "economics", 220),
          aust("Finance (B.S.)", "finance", 220),
          aust("Finance — Financial Engineering (B.S.)", "financial-engineering", 220),
          aust("Hospitality Management (B.S.)", "hospitality", 220),
          aust("Business Management (B.S.)", "management", 220),
          aust("Business Management — Human Resources (B.S.)", "management-hr", 220),
          aust("Business Management — International Business (B.S.)", "management-ib", 220),
          aust("Business Marketing (B.S.)", "marketing", 220),
          aust("Business Marketing — Digital Marketing (B.S.)", "marketing-digital", 220),
          aust("Management Information Systems (B.S.)", "mis", 220),
        ],
      },
      {
        name: "Faculty of Engineering",
        slug: "engineering",
        programs: [
          aust("Computer and Communications Engineering (B.S.)", "cce", 220),
          aust("CCE — Biomedical Engineering (B.S.)", "cce-biomedical", 220),
          aust("Mechatronics Engineering (B.S.)", "mechatronics", 220),
        ],
      },
      {
        name: "Faculty of Health Sciences",
        slug: "health",
        programs: [
          aust("Clinical Laboratory Science (B.S.)", "cls", 220),
          aust("Optics and Optometry (B.S.)", "optometry", 220),
          aust("Radiologic Sciences (B.S.)", "radiologic", 220),
          aust("Forensic Science (B.S.)", "forensic", 220),
          aust("Nutrition and Food Science (B.S.)", "nutrition", 220),
          aust("Nursing (B.S.)", "nursing", 220),
        ],
      },
    ],
  },
  {
    institutionSlug: "aut",
    fees: [
      {
        name: "Registration fee",
        amountUsd: 400,
        period: "term",
        academicYear: "2025-2026",
        sourceUrl: AUT_SRC,
      },
      {
        name: "Activities, yearbook, technology, internet and library",
        amountUsd: 250,
        period: "term",
        academicYear: "2025-2026",
        sourceUrl: AUT_SRC,
      },
    ],
    faculties: [
      {
        name: "Faculty of Business Administration",
        slug: "business",
        programs: [
          aut("Accounting (B.B.A.)", "accounting", 220),
          aut("Finance (B.B.A.)", "finance", 220),
          aut("Hospitality Management (B.B.A.)", "hospitality", 220),
          aut("Management (B.B.A.)", "management", 220),
          aut("Management Information Systems (B.B.A.)", "mis", 220),
          aut("Marketing and Advertising (B.B.A.)", "marketing", 220),
          aut("Transport Management and Logistics (B.B.A.)", "transport-logistics", 220),
        ],
      },
      {
        name: "Faculty of Arts and Humanities",
        slug: "arts-humanities",
        programs: [
          aut("Graphic Design (B.A.)", "graphic-design", 220),
          aut("Graphic Design — Web Design (B.A.)", "graphic-design-web", 220),
          aut("Interior Design (B.A.)", "interior-design", 220),
          aut("English Language and Literature (B.A.)", "english", 220),
          aut("Translation (B.A.)", "translation", 220),
          aut("Audiovisual Arts (B.A.)", "audiovisual", 220),
          aut("Journalism (B.A.)", "journalism", 220),
          aut("Public Relations (B.A.)", "public-relations", 220),
        ],
      },
      {
        name: "Faculty of Applied Sciences and Technology",
        slug: "applied-sciences",
        programs: [
          aut("Computer Science (B.S.)", "computer-science", 220),
          aut("Computer and Communication Sciences (B.S.)", "ccs", 220),
          aut("Information Technology (B.S.)", "it", 220),
          aut("Nutrition and Dietetics (B.S.)", "nutrition", 220),
          aut("Water Resources and Geo-Environmental Sciences (B.S.)", "water-resources", 220),
        ],
      },
    ],
  },
  {
    institutionSlug: "mubs",
    fees: [
      {
        name: "Registration fee",
        amountUsd: 100,
        period: "term",
        academicYear: "2026-2027",
        sourceUrl: MUBS_SRC,
      },
      {
        name: "Technology and e-library",
        amountUsd: 100,
        period: "term",
        academicYear: "2026-2027",
        sourceUrl: MUBS_SRC,
      },
      {
        name: "Student service",
        amountUsd: 55,
        period: "term",
        academicYear: "2026-2027",
        sourceUrl: MUBS_SRC,
      },
    ],
    faculties: [
      {
        name: "International School of Business",
        slug: "business",
        programs: [
          mubs("Business Administration", "business-administration", 205),
          mubs("Marketing", "marketing", 205),
          mubs("Accounting", "accounting", 205),
          mubs("Banking and Finance", "banking-finance", 205),
          mubs("Business Information Systems", "bis", 205),
          mubs("Licence en science de gestion de l'entreprise", "licence-gestion", 205),
        ],
      },
      {
        name: "School of Health Sciences",
        slug: "health",
        programs: [
          mubs("Optometry and Vision Science (B.S.)", "optometry", 205),
          mubs("Public Health (B.S.)", "public-health", 205),
          mubs("Nursing (B.S.)", "nursing", 205),
          mubs("Nutrition and Dietetics (B.S.)", "nutrition", 205),
        ],
      },
      {
        name: "School of Computer and Applied Sciences",
        slug: "computer",
        programs: [mubs("Computer Science (B.S.)", "computer-science", 205)],
      },
      {
        name: "School of Education and Social Work",
        slug: "education",
        programs: [
          mubs("Social Work (B.A.)", "social-work", 190),
          mubs("Early Childhood Education", "ece", 190),
          mubs("Educational Management", "educational-management", 190),
        ],
      },
    ],
  },
  {
    institutionSlug: "lcu",
    faculties: [
      {
        name: "Faculty of Business Administration",
        slug: "business",
        programs: [
          lcu("Marketing (B.B.A.)", "marketing", 315),
          lcu("Business Administration — Management (B.B.A.)", "management", 315),
          lcu("International Business Management (B.B.A.)", "ibm", 315),
          lcu("Finance (B.B.A.)", "finance", 315),
          lcu("Hospitality and Tourism Management (B.B.A.)", "hospitality", 315),
          lcu("Accounting (B.B.A.)", "accounting", 315),
          lcu("Business Computing (B.B.A.)", "business-computing", 315),
          lcu("Economics (B.B.A.)", "economics", 315),
          lcu("Human Resources Management (B.B.A.)", "hrm", 315),
        ],
      },
      {
        name: "Faculty of Arts and Sciences",
        slug: "arts-sciences",
        programs: [
          lcu("Computer Science (B.S.)", "computer-science", 315),
          lcu("Interior Design", "interior-design", 315),
          lcu("Graphic Design", "graphic-design", 315),
          lcu("Nutrition and Dietetics", "nutrition", 315),
          lcu("Biology", "biology", 315),
        ],
      },
      {
        name: "Faculty of Humanities",
        slug: "humanities",
        programs: [
          lcu("Journalism", "journalism", 315),
          lcu("Communication", "communication", 315),
          lcu("Translation and Living Languages", "translation", 315),
          lcu("Strategic and Diplomatic Studies", "strategic-diplomatic", 315),
        ],
      },
    ],
  },
  {
    institutionSlug: "ulf",
    fees: [
      {
        name: "Registration and activity fees",
        amountUsd: 200,
        period: "term",
        academicYear: "2026-2027",
        sourceUrl: ULF_SRC,
      },
      {
        name: "Insurance",
        amountUsd: 30,
        period: "year",
        academicYear: "2026-2027",
        sourceUrl: ULF_SRC,
      },
    ],
    faculties: [
      {
        name: "Faculty of Engineering",
        slug: "engineering",
        programs: [
          ulf("Civil Engineering (B.E.)", "civil-engineering", 135),
          ulf("Mechanical Engineering (B.E.)", "mechanical-engineering", 135),
          ulf("Electrical Engineering (B.E.)", "electrical-engineering", 135),
          ulf("Electronics and Communications (B.E.)", "electronics-communications", 135),
        ],
      },
      {
        name: "Faculty of Management",
        slug: "management",
        programs: [
          ulf("Business Administration", "bba", 100),
          ulf("Business Administration — Marketing", "bba-marketing", 100),
          ulf("Business Administration — International Business", "bba-ib", 100),
          ulf("Business Administration — Information Systems", "bba-is", 100),
          ulf("Business Administration — Hotel Management", "bba-hotel", 100),
        ],
      },
      {
        name: "Faculty of Sciences and Letters",
        slug: "sciences-letters",
        programs: [
          ulf("Computer Science (B.S.)", "computer-science", 100),
          ulf("Biomedical Instrumentation (B.S.)", "biomedical-instrumentation", 100),
          ulf("Mechanics and Renewable Energy (B.S.)", "mechanics-renewable", 100),
          ulf("Environmental Sciences (B.S.)", "environmental-sciences", 100),
          ulf("Informatics and Telecommunications (B.S.)", "informatics-telecom", 100),
        ],
      },
      {
        name: "Faculty of Technology",
        slug: "technology",
        programs: [
          ulf("Industrial Maintenance (B.Tech.)", "industrial-maintenance", 100),
          ulf("Telecommunications and Networking (B.Tech.)", "telecom-networking", 100),
          ulf("Industrial Informatics (B.Tech.)", "industrial-informatics", 100),
        ],
      },
    ],
  },
  {
    institutionSlug: "hfu",
    fees: [
      {
        name: "Inscription",
        amountUsd: 300,
        period: "term",
        academicYear: "2026-2027",
        sourceUrl: HFU_SRC,
      },
    ],
    faculties: [
      {
        name: "Faculty of Pedagogy",
        slug: "pedagogy",
        programs: [
          hfu("Orthopédagogie (Licence)", "orthopedagogie", 230),
          hfu(
            "Pédagogie au préscolaire et enseignement de base (Licence)",
            "pedagogie-prescolaire",
            230,
          ),
        ],
      },
      {
        name: "Faculty of Health",
        slug: "health",
        programs: [
          hfu("Physiothérapie (Licence)", "physiotherapie", 230),
          hfu("Sciences infirmières (Licence)", "sciences-infirmieres", 230),
          hfu("Sage-femme (Licence)", "sage-femme", 230),
          hfu("Laboratoire médical (Licence)", "laboratoire-medical", 230),
          hfu("Optique et optométrie (Licence)", "optique", 230),
          hfu("Nutrition (Licence)", "nutrition", 230),
          hfu("Imagerie médicale (Licence)", "imagerie-medicale", 230),
        ],
      },
      {
        name: "Faculty of Management",
        slug: "management",
        programs: [
          hfu("Gestion — Management (Licence)", "gestion-management", 230),
          hfu("Gestion — Marketing (Licence)", "gestion-marketing", 230),
          hfu("Gestion — Comptabilité (Licence)", "gestion-comptabilite", 230),
          hfu("Gestion — Banques et finance (Licence)", "gestion-banques", 230),
          hfu("Gestion — Informatique de gestion (Licence)", "gestion-informatique", 230),
        ],
      },
    ],
  },
  {
    institutionSlug: "ut",
    faculties: [
      {
        name: "Faculty of Islamic Studies",
        slug: "islamic-studies",
        programs: [ut("Sharia and Islamic Studies", "sharia", 35)],
      },
      {
        name: "Faculty of Humanities",
        slug: "humanities",
        programs: [
          ut("Arabic Language and Literature", "arabic", 100),
          ut("Psychology", "psychology", 100),
          ut("Languages and Translation", "translation", 100),
          ut("History", "history", 100),
          ut("Philosophy", "philosophy", 100),
        ],
      },
      {
        name: "Faculty of Business Administration",
        slug: "business",
        programs: [
          ut("Business Administration", "business-administration", 100),
          ut("Marketing", "marketing", 100),
          ut("Accounting", "accounting", 100),
          ut("Management Information Systems", "mis", 100),
        ],
      },
      {
        name: "Faculty of Education",
        slug: "education",
        programs: [
          ut("Early Childhood Education", "ece", 140),
          ut("Elementary Education", "elementary-education", 140),
          ut("Special Education", "special-education", 140),
          ut("Physical Education", "physical-education", 140),
        ],
      },
    ],
  },
  {
    institutionSlug: "usal",
    fees: [
      {
        name: "Registration fee",
        amountUsd: 180,
        period: "term",
        academicYear: "2025-2026",
        sourceUrl: USAL_SRC,
      },
      {
        name: "Other fees (IT, insurance, ID, services)",
        amountUsd: 20,
        period: "term",
        academicYear: "2025-2026",
        sourceUrl: USAL_SRC,
      },
    ],
    faculties: [
      {
        name: "Faculty of Humanities and Sciences",
        slug: "humanities-sciences",
        programs: [
          usal("Computer Science — Computing (B.S.)", "cs-computing", 70),
          usal("Computer Science — Computer and Network Security (B.S.)", "cs-security", 70),
          usal("Computer Science — Data Science (B.S.)", "cs-data-science", 70),
          usal("Nursing Sciences (B.S.)", "nursing", 65),
          usal("Media — Radio and Television", "media-rtv", 65),
          usal("Media — Digital Media", "media-digital", 65),
          usal("Media — Public Relations and Advertising", "media-pr", 65),
        ],
      },
      {
        name: "Faculty of Business Administration, Finance and Economy",
        slug: "business",
        programs: [
          usal("Business Administration — Accounting and Finance (B.B.A.)", "accounting-finance", 65),
          usal("Business Administration — Human Resources (B.B.A.)", "hrm", 65),
          usal("Business Administration — Management (B.B.A.)", "management", 65),
          usal("Business Administration — MIS (B.B.A.)", "mis", 65),
          usal("Business Administration — Digital Marketing (B.B.A.)", "digital-marketing", 65),
          usal("Business Administration — Hospitality Management (B.B.A.)", "hospitality", 65),
        ],
      },
      {
        name: "Faculty of Education",
        slug: "education",
        programs: [
          usal("Special Education", "special-education", 65),
          usal("Early Childhood Education", "ece", 65),
          usal("Physical and Sports Education", "physical-sports", 65),
          usal("Arabic Language and Children’s Literature", "arabic-education", 65),
          usal("English Language and Children’s Literature", "english-education", 65),
          usal("STEM Education", "stem-education", 65),
        ],
      },
    ],
  },
  {
    institutionSlug: "phoenicia",
    faculties: [
      {
        name: "College of Architecture and Design",
        slug: "architecture",
        programs: [phoenicia("Architecture (B.Arch.)", "architecture", 210)],
      },
      {
        name: "College of Arts and Sciences",
        slug: "arts-sciences",
        programs: [
          phoenicia("Communication and Social Media (B.A.)", "communication", 195),
          phoenicia("Computer Science (B.S.)", "computer-science", 195),
        ],
      },
      {
        name: "College of Business",
        slug: "business",
        programs: [phoenicia("Business Administration (B.B.A.)", "bba", 195)],
      },
      {
        name: "College of Engineering",
        slug: "engineering",
        programs: [
          phoenicia("Petroleum Engineering (B.E.)", "petroleum", 220),
          phoenicia("Civil and Environmental Engineering (B.E.)", "civil-environmental", 220),
          phoenicia("Mechanical Engineering (B.E.)", "mechanical", 220),
          phoenicia("Electrical and Communication Engineering (B.E.)", "electrical-communication", 220),
        ],
      },
      {
        name: "College of Law and Political Science",
        slug: "law-political",
        programs: [phoenicia("Law (LL.B.)", "law", 180)],
      },
      {
        name: "College of Public Health",
        slug: "public-health",
        programs: [
          phoenicia("Public Health (B.S.)", "public-health", 195),
          phoenicia("Speech Therapy (B.A.)", "speech-therapy", 195),
          phoenicia("Nursing (B.S.)", "nursing", 195),
        ],
      },
    ],
  },
  {
    institutionSlug: "maaref",
    faculties: [
      {
        name: "Faculty of Business Administration",
        slug: "business",
        programs: [
          maaref("Accounting", "accounting", 150),
          maaref("Banking and Finance", "banking-finance", 150),
          maaref("Human Resources Management", "hrm", 150),
          maaref("Information Technology and Management Systems", "itms", 150),
          maaref("Management", "management", 150),
          maaref("Economics", "economics", 150),
          maaref("Marketing", "marketing", 150),
          maaref("International Business", "international-business", 150),
        ],
      },
      {
        name: "Faculty of Religions and Humanities",
        slug: "religions",
        programs: [maaref("Translation and Languages", "translation", 150)],
      },
      {
        name: "Faculty of Mass Communication and Fine Arts",
        slug: "media-arts",
        programs: [
          maaref("Communication Studies", "communication", 150),
          maaref("Journalism and Digital Media", "journalism", 150),
          maaref("Advertising and Public Relations", "advertising-pr", 150),
          maaref("Radio and Television", "radio-tv", 150),
        ],
      },
      {
        name: "Faculty of Engineering",
        slug: "engineering",
        programs: [
          maaref("Civil Engineering", "civil-engineering", 200),
          maaref("Computer Engineering and Technology", "computer-engineering", 200),
          maaref("Electrical and Electronics Engineering", "electrical-electronics", 200),
          maaref("Mechanical Engineering", "mechanical-engineering", 200),
        ],
      },
      {
        name: "Faculty of Sciences",
        slug: "sciences",
        programs: [
          maaref("Applied Statistics", "applied-statistics", 150),
          maaref("Mathematics", "mathematics", 150),
          maaref("Computer Science", "computer-science", 150),
          maaref("Physics", "physics", 150),
          maaref("Chemistry", "chemistry", 150),
          maaref("Biology", "biology", 150),
        ],
      },
    ],
  },
  {
    institutionSlug: "azm",
    faculties: [
      {
        name: "Faculty of Business Administration",
        slug: "business",
        programs: [azm("Business Administration", "business-administration", 95)],
      },
      {
        name: "Faculty of Architecture and Design",
        slug: "architecture",
        programs: [azm("Architecture", "architecture", 110)],
      },
    ],
  },
];

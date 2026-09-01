export type CampusCatalogCampus = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  isMain: boolean;
};

export type CampusProgram = {
  id: string;
  name: string;
  slug: string;
  degreeLevel: "bachelor" | "master";
  billingModel: "per_credit" | "flat_term";
  creditSystem: "us" | "ects";
  defaultCredits: number;
  totalCredits: number;
  maxBilledCredits: number | null;
  perCreditUsd: number;
  academicYear: string;
  sourceUrl: string;
};

export type CampusFaculty = {
  id: string;
  name: string;
  slug: string;
  programs: CampusProgram[];
};

export type CampusInstitution = {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  website: string | null;
  logoUrl: string | null;
  campuses: CampusCatalogCampus[];
  faculties: CampusFaculty[];
};

export type CostLine = {
  kind: "tuition" | "fee" | "living";
  label: string;
  amountUsd: number;
  academicYear: string;
  sourceUrl?: string;
  period?: "term" | "year";
};

export type ProgramCosts = {
  program: CampusProgram & { id: string };
  faculty: { id: string; name: string; slug: string };
  institution: {
    id: string;
    name: string;
    shortName: string;
    slug: string;
    logoUrl: string | null;
  };
  period?: "semester" | "year" | "degree";
  credits: number;
  billedCredits: number;
  terms: number;
  /** Academic years spanned (degree estimates). */
  spanYears?: number;
  lines: CostLine[];
  totalUsd: number;
  academicYears: string[];
  disclaimer: string;
};

export type HousingStats = {
  slug: string;
  name: string;
  institutionId: string | null;
  radiusMeters: number;
  count: number;
  minUsd: number | null;
  medianUsd: number | null;
};

export const AUB_LIVING_COA = {
  academicYear: "2025-2026",
  sourceUrl: "https://www.aub.edu.lb/faid/Pages/Cost-of-Attendance.aspx",
  items: [
    {
      id: "food",
      label: "Food (AUB COA, from)",
      yearUsd: 2700,
      range: "$2,700–$5,940 / year",
    },
    {
      id: "books",
      label: "Books and supplies (AUB COA)",
      yearUsd: 2000,
      range: "$2,000 / year",
    },
    {
      id: "transport",
      label: "Transportation (AUB COA)",
      yearUsd: 4095,
      range: "$4,095 / year",
    },
    {
      id: "misc",
      label: "Miscellaneous (AUB COA)",
      yearUsd: 1200,
      range: "$1,200 / year",
    },
  ],
} as const;

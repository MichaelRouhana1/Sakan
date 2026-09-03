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
  creditTiers?: { upToCredits?: number; amountUsd: number }[] | null;
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

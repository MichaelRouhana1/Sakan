export type BenefitCategory =
  | "tech"
  | "food"
  | "services"
  | "entertainment"
  | "finance"
  | "telecom";

export type BenefitRedemptionType = "link" | "promo_code" | "show_id";

/** Sentinel in `applicableUniversities` for offers open to every campus. */
export const ALL_UNIVERSITIES = "ALL";

/** Mirrors `toPublicBenefit` in backend/src/modules/benefits/benefits.service.ts. */
export type StudentBenefit = {
  id: string;
  companyName: string;
  title: string;
  category: BenefitCategory;
  description: string;
  eligibility: string;
  redemptionType: BenefitRedemptionType;
  /** True for anonymous callers — `redemptionData` is withheld until sign-in. */
  redemptionLocked: boolean;
  redemptionData: string | null;
  isGlobal: boolean;
  applicableUniversities: string[];
  locationOrArea: string | null;
  sourceUrl: string | null;
};

/** Auth-only payload from GET /api/benefits/:id/redemption. */
export type BenefitRedemption = {
  id: string;
  companyName: string;
  title: string;
  redemptionType: BenefitRedemptionType;
  redemptionData: string;
  eligibility: string;
};

export type BenefitFilters = {
  /** Institution shortName, e.g. "AUB". */
  university?: string;
  category?: BenefitCategory;
  isGlobal?: boolean;
};

export function isCampusExclusive(benefit: StudentBenefit): boolean {
  return !benefit.applicableUniversities.includes(ALL_UNIVERSITIES);
}

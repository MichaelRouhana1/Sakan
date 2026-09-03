import { studentBenefits } from "../../db/schema/student-benefits.js";
import { NotFoundError } from "../../lib/errors.js";
import { benefitsRepository } from "./benefits.repository.js";
import type { ListBenefitsQuery } from "./benefits.schemas.js";

type BenefitRow = typeof studentBenefits.$inferSelect;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `redemptionData` is the payoff (promo code, redemption link, counter script) and
 * is withheld from anonymous callers. `redemptionType` stays public so the UI can
 * render the right locked-state badge before sign-in.
 */
function toPublicBenefit(row: BenefitRow, canRedeem: boolean) {
  return {
    id: row.id,
    companyName: row.companyName,
    title: row.title,
    category: row.category,
    description: row.description,
    eligibility: row.eligibility,
    redemptionType: row.redemptionType,
    redemptionLocked: !canRedeem,
    redemptionData: canRedeem ? row.redemptionData : null,
    isGlobal: row.isGlobal,
    applicableUniversities: row.applicableUniversities,
    locationOrArea: row.locationOrArea,
    sourceUrl: row.sourceUrl,
  };
}

export class BenefitsService {
  async list(filters: ListBenefitsQuery, canRedeem: boolean) {
    if (
      filters.university &&
      !(await benefitsRepository.institutionExists(filters.university))
    ) {
      throw new NotFoundError(`Unknown university "${filters.university}"`);
    }

    const rows = await benefitsRepository.list(filters);
    return rows.map((row) => toPublicBenefit(row, canRedeem));
  }

  async getById(id: string, canRedeem: boolean) {
    const row = await this.requireBenefit(id);
    return toPublicBenefit(row, canRedeem);
  }

  /** Auth-only: the redemption payload on its own, for a reveal action. */
  async getRedemption(id: string) {
    const row = await this.requireBenefit(id);
    return {
      id: row.id,
      companyName: row.companyName,
      title: row.title,
      redemptionType: row.redemptionType,
      redemptionData: row.redemptionData,
      eligibility: row.eligibility,
    };
  }

  private async requireBenefit(id: string) {
    if (!UUID_RE.test(id)) throw new NotFoundError("Benefit not found");
    const row = await benefitsRepository.findById(id);
    if (!row) throw new NotFoundError("Benefit not found");
    return row;
  }
}

export const benefitsService = new BenefitsService();

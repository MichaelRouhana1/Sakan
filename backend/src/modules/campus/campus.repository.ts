import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  faculties,
  feeItems,
  programs,
  tuitionRates,
} from "../../db/schema/academic.js";
import { institutions } from "../../db/schema/institutions.js";
import { universities } from "../../db/schema/universities.js";

const HOUSING_RADIUS_METERS = 2500;

export const campusHousingRadiusMeters = HOUSING_RADIUS_METERS;

export class CampusRepository {
  async listCatalog() {
    const instRows = await db
      .select({
        id: institutions.id,
        name: institutions.name,
        shortName: institutions.shortName,
        slug: institutions.slug,
        website: institutions.website,
        logoUrl: institutions.logoUrl,
      })
      .from(institutions)
      .where(eq(institutions.active, true))
      .orderBy(institutions.shortName);

    const facultyRows = await db
      .select({
        id: faculties.id,
        institutionId: faculties.institutionId,
        name: faculties.name,
        slug: faculties.slug,
      })
      .from(faculties)
      .orderBy(faculties.name);

    const programRows = await db
      .select({
        id: programs.id,
        facultyId: programs.facultyId,
        name: programs.name,
        slug: programs.slug,
        degreeLevel: programs.degreeLevel,
        billingModel: programs.billingModel,
        creditSystem: programs.creditSystem,
        defaultCredits: programs.defaultCredits,
        totalCredits: programs.totalCredits,
        maxBilledCredits: programs.maxBilledCredits,
        rateAmountUsd: tuitionRates.amountUsd,
        creditTiers: tuitionRates.creditTiers,
        academicYear: tuitionRates.academicYear,
        sourceUrl: tuitionRates.sourceUrl,
      })
      .from(programs)
      .innerJoin(tuitionRates, eq(tuitionRates.programId, programs.id))
      .orderBy(programs.name);

    const campusRows = await db
      .select({
        id: universities.id,
        institutionId: universities.institutionId,
        name: universities.name,
        slug: universities.slug,
        city: universities.city,
        isMain: universities.isMain,
      })
      .from(universities)
      .where(eq(universities.active, true))
      .orderBy(desc(universities.isMain), universities.name);

    return { instRows, facultyRows, programRows, campusRows };
  }

  async getProgramWithRate(programId: string) {
    const [row] = await db
      .select({
        programId: programs.id,
        programName: programs.name,
        programSlug: programs.slug,
        degreeLevel: programs.degreeLevel,
        billingModel: programs.billingModel,
        creditSystem: programs.creditSystem,
        defaultCredits: programs.defaultCredits,
        totalCredits: programs.totalCredits,
        maxBilledCredits: programs.maxBilledCredits,
        facultyId: faculties.id,
        facultyName: faculties.name,
        facultySlug: faculties.slug,
        institutionId: institutions.id,
        institutionName: institutions.name,
        institutionShortName: institutions.shortName,
        institutionSlug: institutions.slug,
        logoUrl: institutions.logoUrl,
        amountUsd: tuitionRates.amountUsd,
        creditTiers: tuitionRates.creditTiers,
        academicYear: tuitionRates.academicYear,
        sourceUrl: tuitionRates.sourceUrl,
      })
      .from(programs)
      .innerJoin(faculties, eq(programs.facultyId, faculties.id))
      .innerJoin(institutions, eq(faculties.institutionId, institutions.id))
      .innerJoin(tuitionRates, eq(tuitionRates.programId, programs.id))
      .where(eq(programs.id, programId))
      .orderBy(desc(tuitionRates.academicYear))
      .limit(1);
    return row ?? null;
  }

  async listFeesForInstitution(institutionId: string) {
    return db
      .select()
      .from(feeItems)
      .where(eq(feeItems.institutionId, institutionId));
  }

  async housingStatsByCampusSlug(slug: string) {
    const [campus] = await db
      .select({
        id: universities.id,
        slug: universities.slug,
        name: universities.name,
        institutionId: universities.institutionId,
      })
      .from(universities)
      .where(and(eq(universities.slug, slug), eq(universities.active, true)))
      .limit(1);
    if (!campus) return null;

    const result = await db.execute(sql`
      SELECT
        COUNT(*)::int AS count,
        MIN(l.monthly_rent_usd)::int AS min_usd,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY l.monthly_rent_usd)::int AS median_usd
      FROM listings l
      JOIN universities u ON u.slug = ${slug}
      WHERE l.status = 'active'
        AND l.location IS NOT NULL
        AND ST_DWithin(l.location, u.location, ${HOUSING_RADIUS_METERS})
    `);

    const rows = Array.isArray(result)
      ? result
      : ((result as { rows?: Record<string, unknown>[] }).rows ?? []);
    const stats = rows[0] ?? {};
    const count = Number(stats.count ?? 0);

    return {
      slug: campus.slug,
      name: campus.name,
      institutionId: campus.institutionId,
      radiusMeters: HOUSING_RADIUS_METERS,
      count,
      minUsd: count > 0 ? Number(stats.min_usd) : null,
      medianUsd: count > 0 ? Number(stats.median_usd) : null,
    };
  }
}

export const campusRepository = new CampusRepository();

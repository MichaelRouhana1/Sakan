import { and, asc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "../../db/index.js";
import { institutions } from "../../db/schema/institutions.js";
import { studentBenefits } from "../../db/schema/student-benefits.js";
import { ALL_UNIVERSITIES, type ListBenefitsQuery } from "./benefits.schemas.js";

export class BenefitsRepository {
  async list(filters: ListBenefitsQuery) {
    const conditions: SQL[] = [eq(studentBenefits.active, true)];

    if (filters.university) {
      // Array overlap hits student_benefits_universities_idx (GIN).
      conditions.push(
        sql`${studentBenefits.applicableUniversities} && ARRAY[${filters.university}, ${ALL_UNIVERSITIES}]::text[]`,
      );
    }
    if (filters.category) {
      conditions.push(eq(studentBenefits.category, filters.category));
    }
    if (filters.isGlobal !== undefined) {
      conditions.push(eq(studentBenefits.isGlobal, filters.isGlobal));
    }

    return db
      .select()
      .from(studentBenefits)
      .where(and(...conditions))
      .orderBy(
        // Campus-exclusive deals first (no ALL sentinel), then Lebanon-wide, then global —
        // a student can't find the campus-only ones anywhere else.
        sql`(${ALL_UNIVERSITIES} = ANY(${studentBenefits.applicableUniversities})) ASC`,
        asc(studentBenefits.isGlobal),
        asc(studentBenefits.category),
        asc(studentBenefits.companyName),
      );
  }

  async findById(id: string) {
    const [row] = await db
      .select()
      .from(studentBenefits)
      .where(and(eq(studentBenefits.id, id), eq(studentBenefits.active, true)))
      .limit(1);
    return row ?? null;
  }

  /** Guards against typo'd acronyms silently returning only the ALL rows. */
  async institutionExists(shortName: string) {
    const [row] = await db
      .select({ id: institutions.id })
      .from(institutions)
      .where(
        and(
          eq(institutions.shortName, shortName),
          eq(institutions.active, true),
        ),
      )
      .limit(1);
    return Boolean(row);
  }
}

export const benefitsRepository = new BenefitsRepository();

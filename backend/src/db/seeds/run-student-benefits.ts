import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../index.js";
import { studentBenefits } from "../schema/student-benefits.js";
import { studentBenefitSeeds } from "./studentBenefits.js";

/**
 * The seed file is the source of truth. Everything is parked inactive first, then
 * re-activated by upsert, so offers dropped from the seed (expired or ineligible)
 * stop being served without losing their history or ids.
 */
async function main() {
  await db
    .update(studentBenefits)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(studentBenefits.active, true));

  for (const benefit of studentBenefitSeeds) {
    await db
      .insert(studentBenefits)
      .values({
        companyName: benefit.companyName,
        title: benefit.title,
        category: benefit.category,
        description: benefit.description,
        eligibility: benefit.eligibility,
        redemptionType: benefit.redemptionType,
        redemptionData: benefit.redemptionData,
        isGlobal: benefit.isGlobal,
        applicableUniversities: benefit.applicableUniversities,
        locationOrArea: benefit.locationOrArea ?? null,
        sourceUrl: benefit.sourceUrl ?? null,
        active: true,
      })
      .onConflictDoUpdate({
        target: [studentBenefits.companyName, studentBenefits.title],
        set: {
          category: benefit.category,
          description: benefit.description,
          eligibility: benefit.eligibility,
          redemptionType: benefit.redemptionType,
          redemptionData: benefit.redemptionData,
          isGlobal: benefit.isGlobal,
          applicableUniversities: benefit.applicableUniversities,
          locationOrArea: benefit.locationOrArea ?? null,
          sourceUrl: benefit.sourceUrl ?? null,
          active: true,
          updatedAt: new Date(),
        },
      });
  }

  const stale = await db
    .select({ id: studentBenefits.id })
    .from(studentBenefits)
    .where(eq(studentBenefits.active, false));

  const globalCount = studentBenefitSeeds.filter((row) => row.isGlobal).length;
  console.log(
    `Seeded ${studentBenefitSeeds.length} student benefits (${globalCount} global / ${studentBenefitSeeds.length - globalCount} Lebanon-specific); ${stale.length} inactive`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

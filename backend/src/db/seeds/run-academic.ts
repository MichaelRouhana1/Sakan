import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db } from "../index.js";
import {
  faculties,
  feeItems,
  programs,
  tuitionRates,
} from "../schema/academic.js";
import { institutions } from "../schema/institutions.js";
import { academicSeeds, type FacultySeed } from "./academic.js";
import { FACULTY_CATALOG } from "./facultyCatalog.js";
import { institutionSeeds } from "./universities.js";

function mergedFaculties(institutionSlug: string): FacultySeed[] {
  const catalog = FACULTY_CATALOG[institutionSlug] ?? [];
  const withRates = academicSeeds.find(
    (row) => row.institutionSlug === institutionSlug,
  );
  const bySlug = new Map<string, FacultySeed>();
  for (const faculty of catalog) {
    bySlug.set(faculty.slug, { ...faculty, programs: [] });
  }
  for (const faculty of withRates?.faculties ?? []) {
    const existing = bySlug.get(faculty.slug);
    bySlug.set(faculty.slug, {
      name: existing?.name ?? faculty.name,
      slug: faculty.slug,
      programs: faculty.programs ?? [],
    });
  }
  return [...bySlug.values()];
}

async function main() {
  const programBySlug = new Map(
    academicSeeds.map((row) => [row.institutionSlug, row]),
  );
  let facultyCount = 0;
  let programCount = 0;

  for (const inst of institutionSeeds) {
    const [row] = await db
      .select({ id: institutions.id })
      .from(institutions)
      .where(eq(institutions.slug, inst.slug))
      .limit(1);
    if (!row) {
      throw new Error(
        `Institution ${inst.slug} not found. Seed universities first.`,
      );
    }
    if (!FACULTY_CATALOG[inst.slug]) {
      throw new Error(`No faculty catalog for ${inst.slug}`);
    }

    const institutionId = row.id;
    const facultyList = mergedFaculties(inst.slug);

    for (const fac of facultyList) {
      await db
        .insert(faculties)
        .values({
          institutionId,
          name: fac.name,
          slug: fac.slug,
        })
        .onConflictDoUpdate({
          target: [faculties.institutionId, faculties.slug],
          set: { name: fac.name, updatedAt: new Date() },
        });
      facultyCount += 1;

      const [facultyRow] = await db
        .select({ id: faculties.id })
        .from(faculties)
        .where(
          and(
            eq(faculties.institutionId, institutionId),
            eq(faculties.slug, fac.slug),
          ),
        )
        .limit(1);
      if (!facultyRow) {
        throw new Error(`Missing faculty ${inst.slug}/${fac.slug}`);
      }

      for (const program of fac.programs ?? []) {
        const creditSystem = program.creditSystem ?? "us";
        const degreeLevel = program.degreeLevel ?? "bachelor";
        const totalCredits =
          program.totalCredits ??
          (creditSystem === "ects"
            ? degreeLevel === "master"
              ? 120
              : 180
            : degreeLevel === "master"
              ? 36
              : 120);
        await db
          .insert(programs)
          .values({
            facultyId: facultyRow.id,
            name: program.name,
            slug: program.slug,
            degreeLevel,
            billingModel: "per_credit",
            creditSystem,
            defaultCredits: program.defaultCredits ?? 15,
            totalCredits,
            maxBilledCredits: program.maxBilledCredits ?? null,
          })
          .onConflictDoUpdate({
            target: [programs.facultyId, programs.slug],
            set: {
              name: program.name,
              degreeLevel,
              creditSystem,
              defaultCredits: program.defaultCredits ?? 15,
              totalCredits,
              maxBilledCredits: program.maxBilledCredits ?? null,
              updatedAt: new Date(),
            },
          });

        const [programRow] = await db
          .select({ id: programs.id })
          .from(programs)
          .where(
            and(
              eq(programs.facultyId, facultyRow.id),
              eq(programs.slug, program.slug),
            ),
          )
          .limit(1);
        if (!programRow) {
          throw new Error(`Missing program ${program.slug}`);
        }

        await db
          .insert(tuitionRates)
          .values({
            programId: programRow.id,
            academicYear: program.academicYear,
            amountUsd: program.perCreditUsd,
            sourceUrl: program.sourceUrl,
          })
          .onConflictDoUpdate({
            target: [tuitionRates.programId, tuitionRates.academicYear],
            set: {
              amountUsd: program.perCreditUsd,
              sourceUrl: program.sourceUrl,
              updatedAt: new Date(),
            },
          });
        programCount += 1;
      }
    }

    const fees = programBySlug.get(inst.slug)?.fees;
    if (fees) {
      for (const fee of fees) {
        const existing = await db
          .select({ id: feeItems.id })
          .from(feeItems)
          .where(
            and(
              eq(feeItems.institutionId, institutionId),
              eq(feeItems.name, fee.name),
              eq(feeItems.academicYear, fee.academicYear),
            ),
          )
          .limit(1);
        if (existing[0]) {
          await db
            .update(feeItems)
            .set({
              amountUsd: fee.amountUsd,
              period: fee.period,
              sourceUrl: fee.sourceUrl,
              updatedAt: new Date(),
            })
            .where(eq(feeItems.id, existing[0].id));
        } else {
          await db.insert(feeItems).values({
            institutionId,
            name: fee.name,
            amountUsd: fee.amountUsd,
            period: fee.period,
            academicYear: fee.academicYear,
            sourceUrl: fee.sourceUrl,
          });
        }
      }
    }
  }

  console.log(
    `Seeded academic catalog: ${institutionSeeds.length} universities, ${facultyCount} faculties, ${programCount} programs with rates`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { NotFoundError } from "../../lib/errors.js";
import type { CreditRateTier } from "../../db/schema/academic.js";
import { campusRepository } from "./campus.repository.js";

const POPULAR_SLUGS = ["aub", "lau", "usj"];

const DUAL_CURRENCY_NOTE: Record<string, string> = {
  usj: "USJ bills 70% in fresh USD and 30% in LBP at the market rate; this total is the published USD credit price (first cycle, 2026–2027). ",
  bau: "BAU also bills LBP per credit; this total is the published USD component only (new students, 2026–2027). ",
  uob: "UOB also bills LBP per credit; this total is the published USD component only. ",
  makassed:
    "Makassed also bills LBP per credit; this total is the published USD component only (2025–2026). ",
  rhu: "RHU also bills LBP per credit; this total is the published USD component only (2026–2027). ",
  usal: "USAL also bills LBP per credit; this total is the published USD component only (2025–2026). ",
  phoenicia:
    "Phoenicia bills part of tuition in LBP at a fixed rate; this total is the published USD rate (45% fresh USD). ",
  maaref:
    "Maaref also bills LBP per credit; this total is the published USD component only (2024–2025). ",
};

function dualCurrencyDisclaimer(slug: string) {
  const extra = DUAL_CURRENCY_NOTE[slug] ?? "";
  return `Official figures change. Skoun is an estimate, not an invoice. ${extra}Each line shows the academic year of its source.`;
}

function tuitionForCredits(
  credits: number,
  fallbackUsd: number,
  tiers: CreditRateTier[] | null | undefined,
  unit: string,
  termSuffix: string,
): { total: number; label: string } {
  if (!tiers?.length) {
    return {
      total: credits * fallbackUsd,
      label: `Tuition (${credits} ${unit} × $${fallbackUsd}${termSuffix})`,
    };
  }

  let remaining = Math.max(0, credits);
  let cursor = 0;
  const parts: { qty: number; rate: number }[] = [];

  for (const tier of tiers) {
    if (remaining <= 0) break;
    const cap = tier.upToCredits;
    const bandSize = cap == null ? remaining : Math.max(0, cap - cursor);
    const qty = Math.min(remaining, bandSize);
    if (qty > 0) parts.push({ qty, rate: tier.amountUsd });
    remaining -= qty;
    cursor = cap == null ? cursor + qty : cap;
  }
  if (remaining > 0) {
    const last = tiers[tiers.length - 1]!;
    parts.push({ qty: remaining, rate: last.amountUsd });
  }

  const total = parts.reduce((sum, part) => sum + part.qty * part.rate, 0);
  const bands = parts
    .map((part) => `${part.qty} ${unit} × $${part.rate}`)
    .join(" + ");
  return {
    total,
    label: `Tuition (${bands}${termSuffix})`,
  };
}

export class CampusService {
  async listInstitutions() {
    const { instRows, facultyRows, programRows, campusRows } =
      await campusRepository.listCatalog();

    const facultiesByInst = new Map<string, typeof facultyRows>();
    for (const faculty of facultyRows) {
      const list = facultiesByInst.get(faculty.institutionId) ?? [];
      list.push(faculty);
      facultiesByInst.set(faculty.institutionId, list);
    }

    const latestByProgram = new Map<string, (typeof programRows)[number]>();
    for (const program of programRows) {
      const prev = latestByProgram.get(program.id);
      if (!prev || program.academicYear > prev.academicYear) {
        latestByProgram.set(program.id, program);
      }
    }

    const programsByFaculty = new Map<string, typeof programRows>();
    for (const program of latestByProgram.values()) {
      const list = programsByFaculty.get(program.facultyId) ?? [];
      list.push(program);
      programsByFaculty.set(program.facultyId, list);
    }

    const campusesByInst = new Map<string, typeof campusRows>();
    for (const campus of campusRows) {
      if (!campus.institutionId) continue;
      const list = campusesByInst.get(campus.institutionId) ?? [];
      list.push(campus);
      campusesByInst.set(campus.institutionId, list);
    }

    return instRows
      .slice()
      .sort((a, b) => {
        const ai = POPULAR_SLUGS.indexOf(a.slug);
        const bi = POPULAR_SLUGS.indexOf(b.slug);
        if (ai !== -1 || bi !== -1) {
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        }
        return a.shortName.localeCompare(b.shortName);
      })
      .map((inst) => ({
      id: inst.id,
      name: inst.name,
      shortName: inst.shortName,
      slug: inst.slug,
      website: inst.website,
      logoUrl: inst.logoUrl,
      campuses: (campusesByInst.get(inst.id) ?? []).map((campus) => ({
        id: campus.id,
        name: campus.name,
        slug: campus.slug,
        city: campus.city,
        isMain: campus.isMain,
      })),
      faculties: (facultiesByInst.get(inst.id) ?? []).map((faculty) => ({
        id: faculty.id,
        name: faculty.name,
        slug: faculty.slug,
        programs: (programsByFaculty.get(faculty.id) ?? []).map((program) => ({
          id: program.id,
          name: program.name,
          slug: program.slug,
          degreeLevel: program.degreeLevel,
          billingModel: program.billingModel,
          creditSystem: program.creditSystem,
          defaultCredits: program.defaultCredits,
          totalCredits: program.totalCredits,
          maxBilledCredits: program.maxBilledCredits,
          perCreditUsd: program.rateAmountUsd,
          creditTiers: program.creditTiers ?? null,
          academicYear: program.academicYear,
          sourceUrl: program.sourceUrl,
        })),
      })),
    }))
      .filter((inst) => {
        const years = inst.faculties.flatMap((faculty) =>
          faculty.programs.map((program) => program.academicYear),
        );
        if (years.length === 0) return false;
        if (inst.slug === "usj") return true;
        return years.every((year) => year === "2026-2027");
      });
  }

  async programCosts(
    programId: string,
    credits?: number,
    period: "semester" | "year" | "degree" = "semester",
  ) {
    const program = await campusRepository.getProgramWithRate(programId);
    if (!program) throw new NotFoundError("Program not found");

    const unit = program.creditSystem === "ects" ? "ECTS" : "credits";
    const totalMajorCredits =
      program.totalCredits ?? (program.creditSystem === "ects" ? 180 : 120);
    const typicalLoad = program.defaultCredits;
    const spanYears = Math.max(
      1,
      Math.ceil(totalMajorCredits / Math.max(1, typicalLoad * 2)),
    );

    let requestedCredits: number;
    let billedCredits: number;
    let tuitionTotal: number;
    let tuitionLabel: string;
    let feeTermEquivalent: number;

    if (period === "degree") {
      requestedCredits = credits ?? totalMajorCredits;
      // Per-term billing caps do not apply to a full-degree rollup.
      billedCredits = requestedCredits;
      const priced = tuitionForCredits(
        billedCredits,
        program.amountUsd,
        program.creditTiers,
        unit,
        "",
      );
      tuitionTotal = priced.total;
      tuitionLabel = priced.label;
      feeTermEquivalent = spanYears * 2;
    } else {
      const termCount = period === "year" ? 2 : 1;
      requestedCredits = credits ?? typicalLoad;
      billedCredits =
        program.maxBilledCredits != null
          ? Math.min(requestedCredits, program.maxBilledCredits)
          : requestedCredits;
      if (program.creditTiers?.length) {
        const priced = tuitionForCredits(
          billedCredits * termCount,
          program.amountUsd,
          program.creditTiers,
          unit,
          "",
        );
        tuitionTotal = priced.total;
        tuitionLabel = priced.label;
      } else {
        tuitionTotal = billedCredits * program.amountUsd * termCount;
        tuitionLabel = `Tuition (${billedCredits} ${unit} × $${program.amountUsd} × ${termCount} term${termCount === 1 ? "" : "s"})`;
      }
      feeTermEquivalent = termCount;
    }

    const allFees = await campusRepository.listFeesForInstitution(
      program.institutionId,
    );
    const sameYear = allFees.filter(
      (fee) => fee.academicYear === program.academicYear,
    );
    const fees = sameYear.length > 0 ? sameYear : allFees;
    const programFees = fees.filter(
      (fee) => fee.programId === program.programId,
    );
    const overriddenByProgram = new Set(programFees.map((fee) => fee.name));
    const facultyFees = fees.filter(
      (fee) =>
        fee.facultyId === program.facultyId &&
        fee.programId == null &&
        !overriddenByProgram.has(fee.name),
    );
    const overriddenNames = new Set(
      [...programFees, ...facultyFees].map((fee) => fee.name),
    );
    const institutionFees = fees.filter(
      (fee) =>
        fee.facultyId == null &&
        fee.programId == null &&
        !overriddenNames.has(fee.name),
    );
    const feeLines = [...institutionFees, ...facultyFees, ...programFees].map(
      (fee) => {
        const amountUsd =
          fee.period === "year"
            ? Math.round((fee.amountUsd * feeTermEquivalent) / 2)
            : fee.amountUsd * feeTermEquivalent;
        return {
          kind: "fee" as const,
          label: fee.name,
          amountUsd,
          academicYear: fee.academicYear,
          sourceUrl: fee.sourceUrl,
          period: fee.period,
        };
      },
    );

    const lines = [
      {
        kind: "tuition" as const,
        label: tuitionLabel,
        amountUsd: tuitionTotal,
        academicYear: program.academicYear,
        sourceUrl: program.sourceUrl,
        period: period === "degree" ? ("year" as const) : ("term" as const),
      },
      ...feeLines,
    ];

    const totalUsd = lines.reduce((sum, line) => sum + line.amountUsd, 0);
    const years = [...new Set(lines.map((line) => line.academicYear))];

    return {
      program: {
        id: program.programId,
        name: program.programName,
        slug: program.programSlug,
        degreeLevel: program.degreeLevel,
        billingModel: program.billingModel,
        creditSystem: program.creditSystem,
        defaultCredits: program.defaultCredits,
        totalCredits: program.totalCredits,
        maxBilledCredits: program.maxBilledCredits,
        perCreditUsd: program.amountUsd,
        creditTiers: program.creditTiers ?? null,
        academicYear: program.academicYear,
        sourceUrl: program.sourceUrl,
      },
      faculty: {
        id: program.facultyId,
        name: program.facultyName,
        slug: program.facultySlug,
      },
      institution: {
        id: program.institutionId,
        name: program.institutionName,
        shortName: program.institutionShortName,
        slug: program.institutionSlug,
        logoUrl: program.logoUrl,
      },
      period,
      credits: requestedCredits,
      billedCredits,
      terms: period === "degree" ? spanYears * 2 : feeTermEquivalent,
      spanYears: period === "degree" ? spanYears : period === "year" ? 1 : 0,
      lines,
      totalUsd,
      academicYears: years,
      disclaimer: dualCurrencyDisclaimer(program.institutionSlug),
    };
  }

  async housingStats(slug: string) {
    const stats = await campusRepository.housingStatsByCampusSlug(slug);
    if (!stats) throw new NotFoundError("Campus not found");
    return stats;
  }
}

export const campusService = new CampusService();

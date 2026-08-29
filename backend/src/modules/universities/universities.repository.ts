import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { formatCampusMapLabel } from "../../db/seeds/universities.js";
import { institutions, universities } from "../../db/schema/index.js";

function isPublicLebaneseUniversity(row: {
  slug: string;
  name: string;
  institutionSlug?: string | null;
  institutionName?: string | null;
}): boolean {
  const slugs = [row.slug, row.institutionSlug]
    .filter(Boolean)
    .map((s) => s!.toLowerCase());
  const names = [row.name, row.institutionName]
    .filter(Boolean)
    .map((s) => s!.toLowerCase());
  if (slugs.some((s) => s === "lu" || s === "lu-fanar")) return true;
  return names.some((n) => n.includes("lebanese university"));
}

function parseCoord(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const campusPublicColumns = {
  id: universities.id,
  name: universities.name,
  slug: universities.slug,
  city: universities.city,
  isMain: universities.isMain,
  active: universities.active,
  institutionId: universities.institutionId,
  institutionName: institutions.name,
  institutionShortName: institutions.shortName,
  institutionSlug: institutions.slug,
  logoUrl: institutions.logoUrl,
  createdAt: universities.createdAt,
  lng: sql<number | null>`ST_X(${universities.location}::geometry)`.as("lng"),
  lat: sql<number | null>`ST_Y(${universities.location}::geometry)`.as("lat"),
};

export type UniversityPublic = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  isMain: boolean;
  active: boolean;
  institutionId: string | null;
  institutionName: string | null;
  institutionShortName: string | null;
  institutionSlug: string | null;
  logoUrl: string | null;
  createdAt: Date;
  lng: number | null;
  lat: number | null;
  displayName: string;
  mapLabel: string;
};

export type CampusMeta = {
  slug: string;
  name: string;
  mapLabel?: string;
  lng: number;
  lat: number;
};

export type InstitutionPublic = {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  website: string | null;
  logoUrl: string | null;
  campuses: UniversityPublic[];
};

function toPublicCampus(row: {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  isMain: boolean;
  active: boolean;
  institutionId: string | null;
  institutionName: string | null;
  institutionShortName: string | null;
  institutionSlug: string | null;
  logoUrl: string | null;
  createdAt: Date;
  lng: unknown;
  lat: unknown;
}): UniversityPublic {
  const shortName = row.institutionShortName;
  const displayName = shortName ? `${shortName} — ${row.name}` : row.name;
  return {
    ...row,
    lng: parseCoord(row.lng),
    lat: parseCoord(row.lat),
    displayName,
    mapLabel: formatCampusMapLabel(shortName, row.slug, row.name),
  };
}

export class UniversitiesRepository {
  async listAll(opts?: { includeInactive?: boolean }): Promise<UniversityPublic[]> {
    const query = db
      .select(campusPublicColumns)
      .from(universities)
      .leftJoin(institutions, eq(universities.institutionId, institutions.id));
    const campusOrder = [
      asc(institutions.name),
      desc(universities.isMain),
      asc(universities.name),
    ] as const;
    const rows = opts?.includeInactive
      ? await query.orderBy(...campusOrder)
      : await query.where(eq(universities.active, true)).orderBy(...campusOrder);
    return rows
      .map(toPublicCampus)
      .filter((row) => !isPublicLebaneseUniversity(row));
  }

  async listInstitutions(): Promise<InstitutionPublic[]> {
    const campuses = await this.listAll();
    const byInst = new Map<string, InstitutionPublic>();
    for (const campus of campuses) {
      if (!campus.institutionId || !campus.institutionSlug) continue;
      const existing = byInst.get(campus.institutionId);
      if (existing) {
        existing.campuses.push(campus);
        continue;
      }
      byInst.set(campus.institutionId, {
        id: campus.institutionId,
        name: campus.institutionName ?? campus.name,
        shortName: campus.institutionShortName ?? campus.slug,
        slug: campus.institutionSlug,
        website: null,
        logoUrl: campus.logoUrl,
        campuses: [campus],
      });
    }

    const instRows = await db
      .select({
        id: institutions.id,
        website: institutions.website,
        logoUrl: institutions.logoUrl,
        name: institutions.name,
        shortName: institutions.shortName,
        slug: institutions.slug,
      })
      .from(institutions)
      .where(eq(institutions.active, true))
      .orderBy(asc(institutions.name));

    return instRows
      .filter((inst) => !isPublicLebaneseUniversity(inst))
      .map((inst) => {
        const grouped = byInst.get(inst.id);
        if (!grouped || grouped.campuses.length === 0) return null;
        return {
          ...grouped,
          name: inst.name,
          shortName: inst.shortName,
          slug: inst.slug,
          website: inst.website,
          logoUrl: inst.logoUrl,
        };
      })
      .filter((row): row is InstitutionPublic => row != null);
  }

  async findBySlug(slug: string): Promise<UniversityPublic | null> {
    const [row] = await db
      .select(campusPublicColumns)
      .from(universities)
      .leftJoin(institutions, eq(universities.institutionId, institutions.id))
      .where(and(eq(universities.slug, slug), eq(universities.active, true)))
      .limit(1);
    if (!row) return null;
    return toPublicCampus(row);
  }

  async findById(id: string): Promise<UniversityPublic | null> {
    const [row] = await db
      .select(campusPublicColumns)
      .from(universities)
      .leftJoin(institutions, eq(universities.institutionId, institutions.id))
      .where(eq(universities.id, id))
      .limit(1);
    if (!row) return null;
    return toPublicCampus(row);
  }

  async campusMetaBySlug(slug: string): Promise<CampusMeta | null> {
    const [meta] = await this.campusMetaBySlugs([slug]);
    return meta ?? null;
  }

  async campusMetaBySlugs(slugs: string[]): Promise<CampusMeta[]> {
    if (slugs.length === 0) return [];
    const rows = await db
      .select(campusPublicColumns)
      .from(universities)
      .leftJoin(institutions, eq(universities.institutionId, institutions.id))
      .where(inArray(universities.slug, slugs));

    const bySlug = new Map(rows.map((row) => [row.slug, toPublicCampus(row)]));
    const out: CampusMeta[] = [];
    for (const slug of slugs) {
      const uni = bySlug.get(slug);
      if (!uni || uni.lng == null || uni.lat == null) continue;
      out.push({
        slug: uni.slug,
        name: uni.displayName,
        mapLabel: uni.mapLabel,
        lng: uni.lng,
        lat: uni.lat,
      });
    }
    return out;
  }
}

export const universitiesRepository = new UniversitiesRepository();

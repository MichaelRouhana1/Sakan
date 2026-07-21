import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { universities } from "../../db/schema/index.js";

function parseCoord(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const universityPublicColumns = {
  id: universities.id,
  name: universities.name,
  slug: universities.slug,
  createdAt: universities.createdAt,
  lng: sql<number | null>`ST_X(${universities.location}::geometry)`.as("lng"),
  lat: sql<number | null>`ST_Y(${universities.location}::geometry)`.as("lat"),
};

export type UniversityPublic = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  lng: number | null;
  lat: number | null;
};

export type CampusMeta = {
  slug: string;
  name: string;
  lng: number;
  lat: number;
};

export class UniversitiesRepository {
  async listAll(): Promise<UniversityPublic[]> {
    const rows = await db.select(universityPublicColumns).from(universities);
    return rows.map((row) => ({
      ...row,
      lng: parseCoord(row.lng),
      lat: parseCoord(row.lat),
    }));
  }

  async findBySlug(slug: string): Promise<UniversityPublic | null> {
    const [row] = await db
      .select(universityPublicColumns)
      .from(universities)
      .where(eq(universities.slug, slug))
      .limit(1);
    if (!row) return null;
    return {
      ...row,
      lng: parseCoord(row.lng),
      lat: parseCoord(row.lat),
    };
  }

  async campusMetaBySlug(slug: string): Promise<CampusMeta | null> {
    const [meta] = await this.campusMetaBySlugs([slug]);
    return meta ?? null;
  }

  async campusMetaBySlugs(slugs: string[]): Promise<CampusMeta[]> {
    if (slugs.length === 0) return [];
    const rows = await db
      .select(universityPublicColumns)
      .from(universities)
      .where(inArray(universities.slug, slugs));

    const bySlug = new Map(
      rows.map((row) => [
        row.slug,
        {
          ...row,
          lng: parseCoord(row.lng),
          lat: parseCoord(row.lat),
        },
      ]),
    );

    // Preserve request order; skip campuses without coordinates.
    const out: CampusMeta[] = [];
    for (const slug of slugs) {
      const uni = bySlug.get(slug);
      if (!uni || uni.lng == null || uni.lat == null) continue;
      out.push({
        slug: uni.slug,
        name: uni.name,
        lng: uni.lng,
        lat: uni.lat,
      });
    }
    return out;
  }
}

export const universitiesRepository = new UniversitiesRepository();

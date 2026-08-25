import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { institutions, universities } from "../../db/schema/index.js";
import { ConflictError, NotFoundError, ValidationError } from "../../lib/errors.js";
import type { AdminActor } from "../../middleware/auth.js";
import { universitiesRepository } from "../universities/universities.repository.js";
import { writeAudit } from "./admin.audit.js";

type InstitutionInput = {
  name: string;
  shortName: string;
  slug: string;
  website?: string | null;
  logoUrl?: string | null;
  active?: boolean;
};

type CampusInput = {
  institutionId: string;
  name: string;
  slug: string;
  city?: string | null;
  lng: number;
  lat: number;
  isMain?: boolean;
  active?: boolean;
};

export type AdminCampusRow = {
  id: string;
  institutionId: string | null;
  name: string;
  slug: string;
  city: string | null;
  isMain: boolean;
  active: boolean;
  lng: number | null;
  lat: number | null;
  createdAt: Date;
};

export type AdminInstitutionRow = {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  website: string | null;
  logoUrl: string | null;
  active: boolean;
  createdAt: Date;
  campusCount: number;
  activeCampusCount: number;
  campuses: AdminCampusRow[];
};

const WKT_POINT_RE = /^POINT\(-?\d+(\.\d+)?\s+-?\d+(\.\d+)?\)$/i;

function parseCoord(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pointWkt(lng: number, lat: number): string {
  const wkt = `POINT(${lng} ${lat})`;
  if (!WKT_POINT_RE.test(wkt)) {
    throw new ValidationError("lng/lat must be finite decimal degrees");
  }
  return wkt;
}

/** Postgres unique violation, possibly wrapped by drizzle's query error. */
function isUniqueViolation(err: unknown): boolean {
  let cursor: unknown = err;
  for (let depth = 0; depth < 4 && cursor != null; depth += 1) {
    if ((cursor as { code?: string }).code === "23505") return true;
    cursor = (cursor as { cause?: unknown }).cause;
  }
  return false;
}

async function withSlugConflict<T>(slug: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ConflictError(`Slug "${slug}" is already taken`);
    }
    throw err;
  }
}

/** Fields the caller actually sent, for a legible audit payload. */
function changedFields(input: Record<string, unknown>): string[] {
  return Object.keys(input).filter((key) => input[key] !== undefined);
}

export class AdminUniversitiesService {
  listInstitutions() {
    return universitiesRepository.listInstitutions();
  }

  /**
   * Full ops catalog. Unlike the public `listInstitutions()`, this keeps
   * inactive rows, the Lebanese University, and institutions with no campuses —
   * those are exactly the rows ops needs to fix.
   */
  async listCatalog(): Promise<{
    institutions: AdminInstitutionRow[];
    orphanCampuses: AdminCampusRow[];
  }> {
    const [instRows, campusRows] = await Promise.all([
      db
        .select({
          id: institutions.id,
          name: institutions.name,
          shortName: institutions.shortName,
          slug: institutions.slug,
          website: institutions.website,
          logoUrl: institutions.logoUrl,
          active: institutions.active,
          createdAt: institutions.createdAt,
        })
        .from(institutions)
        .orderBy(asc(institutions.name)),
      db
        .select({
          id: universities.id,
          institutionId: universities.institutionId,
          name: universities.name,
          slug: universities.slug,
          city: universities.city,
          isMain: universities.isMain,
          active: universities.active,
          createdAt: universities.createdAt,
          lng: sql<number | null>`ST_X(${universities.location}::geometry)`.as("lng"),
          lat: sql<number | null>`ST_Y(${universities.location}::geometry)`.as("lat"),
        })
        .from(universities)
        .orderBy(desc(universities.isMain), asc(universities.name)),
    ]);

    const byInstitution = new Map<string, AdminCampusRow[]>();
    const orphanCampuses: AdminCampusRow[] = [];

    for (const row of campusRows) {
      const campus: AdminCampusRow = {
        ...row,
        lng: parseCoord(row.lng),
        lat: parseCoord(row.lat),
      };
      if (!campus.institutionId) {
        orphanCampuses.push(campus);
        continue;
      }
      const bucket = byInstitution.get(campus.institutionId);
      if (bucket) bucket.push(campus);
      else byInstitution.set(campus.institutionId, [campus]);
    }

    return {
      institutions: instRows.map((inst) => {
        const campuses = byInstitution.get(inst.id) ?? [];
        return {
          ...inst,
          campuses,
          campusCount: campuses.length,
          activeCampusCount: campuses.filter((c) => c.active).length,
        };
      }),
      orphanCampuses,
    };
  }

  async createInstitution(input: InstitutionInput, actor: AdminActor) {
    const row = await withSlugConflict(input.slug, async () => {
      const [created] = await db
        .insert(institutions)
        .values({
          name: input.name,
          shortName: input.shortName,
          slug: input.slug,
          website: input.website ?? null,
          logoUrl: input.logoUrl ?? null,
          active: input.active ?? true,
        })
        .returning();
      return created;
    });
    if (!row) throw new ConflictError("Institution was not created");

    await writeAudit(actor, "institution.create", "institution", row.id, {
      name: row.name,
      slug: row.slug,
      active: row.active,
    });
    return row;
  }

  async updateInstitution(
    id: string,
    input: Partial<InstitutionInput>,
    actor: AdminActor,
  ) {
    const [existing] = await db
      .select({ id: institutions.id, active: institutions.active })
      .from(institutions)
      .where(eq(institutions.id, id))
      .limit(1);
    if (!existing) throw new NotFoundError("Institution not found");

    const row = await withSlugConflict(input.slug ?? "", async () => {
      const [updated] = await db
        .update(institutions)
        .set({
          ...(input.name != null ? { name: input.name } : {}),
          ...(input.shortName != null ? { shortName: input.shortName } : {}),
          ...(input.slug != null ? { slug: input.slug } : {}),
          ...(input.website !== undefined ? { website: input.website } : {}),
          ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
          ...(input.active != null ? { active: input.active } : {}),
          updatedAt: new Date(),
        })
        .where(eq(institutions.id, id))
        .returning();
      return updated;
    });
    if (!row) throw new NotFoundError("Institution not found");

    await writeAudit(actor, "institution.update", "institution", id, {
      fields: changedFields(input),
      ...(input.active != null && input.active !== existing.active
        ? { activeFrom: existing.active, activeTo: input.active }
        : {}),
    });
    return row;
  }

  /** Admin-scoped single campus read: keeps inactive rows, exposes lng/lat. */
  private async getCampus(id: string): Promise<AdminCampusRow | null> {
    const [row] = await db
      .select({
        id: universities.id,
        institutionId: universities.institutionId,
        name: universities.name,
        slug: universities.slug,
        city: universities.city,
        isMain: universities.isMain,
        active: universities.active,
        createdAt: universities.createdAt,
        lng: sql<number | null>`ST_X(${universities.location}::geometry)`.as("lng"),
        lat: sql<number | null>`ST_Y(${universities.location}::geometry)`.as("lat"),
      })
      .from(universities)
      .where(eq(universities.id, id))
      .limit(1);
    if (!row) return null;
    return { ...row, lng: parseCoord(row.lng), lat: parseCoord(row.lat) };
  }

  async createCampus(input: CampusInput, actor: AdminActor) {
    const wkt = pointWkt(input.lng, input.lat);

    const [parent] = await db
      .select({ id: institutions.id })
      .from(institutions)
      .where(eq(institutions.id, input.institutionId))
      .limit(1);
    if (!parent) throw new NotFoundError("Institution not found");

    const created = await withSlugConflict(input.slug, async () => {
      const [row] = await db
        .insert(universities)
        .values({
          institutionId: input.institutionId,
          name: input.name,
          slug: input.slug,
          city: input.city ?? null,
          location: sql`ST_GeogFromText(${wkt})`,
          isMain: input.isMain === true,
          active: input.active !== false,
        })
        .returning({ id: universities.id });
      return row;
    });
    if (!created) throw new ConflictError("Campus was not created");

    await writeAudit(actor, "campus.create", "campus", created.id, {
      name: input.name,
      slug: input.slug,
      institutionId: input.institutionId,
      lng: input.lng,
      lat: input.lat,
      active: input.active !== false,
    });

    return this.getCampus(created.id);
  }

  async updateCampus(
    id: string,
    input: Partial<CampusInput>,
    actor: AdminActor,
  ) {
    const existing = await this.getCampus(id);
    if (!existing) throw new NotFoundError("Campus not found");

    if ((input.lng == null) !== (input.lat == null)) {
      throw new ValidationError("lng and lat must be sent together");
    }
    const movingPin = input.lng != null && input.lat != null;
    const wkt = movingPin ? pointWkt(input.lng!, input.lat!) : null;

    await withSlugConflict(input.slug ?? "", () =>
      db
        .update(universities)
        .set({
          ...(input.name != null ? { name: input.name } : {}),
          ...(input.slug != null ? { slug: input.slug } : {}),
          ...(input.city !== undefined ? { city: input.city } : {}),
          ...(input.isMain != null ? { isMain: input.isMain } : {}),
          ...(input.active != null ? { active: input.active } : {}),
          ...(wkt ? { location: sql`ST_GeogFromText(${wkt})` } : {}),
          updatedAt: new Date(),
        })
        .where(eq(universities.id, id)),
    );

    await writeAudit(actor, "campus.update", "campus", id, {
      fields: changedFields(input),
      ...(movingPin ? { lng: input.lng, lat: input.lat } : {}),
      ...(input.active != null && input.active !== existing.active
        ? { activeFrom: existing.active, activeTo: input.active }
        : {}),
    });

    return this.getCampus(id);
  }
}

export const adminUniversitiesService = new AdminUniversitiesService();

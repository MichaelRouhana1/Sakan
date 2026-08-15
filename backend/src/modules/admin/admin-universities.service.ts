import { eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { institutions, universities } from "../../db/schema/index.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { universitiesRepository } from "../universities/universities.repository.js";

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
  locationWkt: string;
  isMain?: boolean;
  active?: boolean;
};

export class AdminUniversitiesService {
  listInstitutions() {
    return universitiesRepository.listInstitutions();
  }

  async createInstitution(input: InstitutionInput) {
    const [row] = await db
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
    return row;
  }

  async updateInstitution(id: string, input: Partial<InstitutionInput>) {
    const [row] = await db
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
    if (!row) throw new NotFoundError("Institution not found");
    return row;
  }

  async createCampus(input: CampusInput) {
    if (!/^POINT\(-?\d+(\.\d+)?\s+-?\d+(\.\d+)?\)$/i.test(input.locationWkt)) {
      throw new ValidationError("locationWkt must be POINT(lng lat)");
    }
    await db.execute(sql`
      INSERT INTO universities (
        name, slug, location, institution_id, city, is_main, active
      )
      VALUES (
        ${input.name},
        ${input.slug},
        ST_GeogFromText(${input.locationWkt}),
        ${input.institutionId}::uuid,
        ${input.city ?? null},
        ${input.isMain === true},
        ${input.active !== false}
      )
    `);
    return universitiesRepository.findBySlug(input.slug);
  }

  async updateCampus(
    id: string,
    input: Partial<CampusInput> & { locationWkt?: string },
  ) {
    const existing = await universitiesRepository.findById(id);
    if (!existing) throw new NotFoundError("Campus not found");

    if (input.locationWkt) {
      if (!/^POINT\(-?\d+(\.\d+)?\s+-?\d+(\.\d+)?\)$/i.test(input.locationWkt)) {
        throw new ValidationError("locationWkt must be POINT(lng lat)");
      }
      await db.execute(sql`
        UPDATE universities
        SET
          name = COALESCE(${input.name ?? null}, name),
          slug = COALESCE(${input.slug ?? null}, slug),
          city = COALESCE(${input.city ?? null}, city),
          is_main = COALESCE(${input.isMain ?? null}, is_main),
          active = COALESCE(${input.active ?? null}, active),
          location = ST_GeogFromText(${input.locationWkt}),
          updated_at = now()
        WHERE id = ${id}::uuid
      `);
    } else {
      await db
        .update(universities)
        .set({
          ...(input.name != null ? { name: input.name } : {}),
          ...(input.slug != null ? { slug: input.slug } : {}),
          ...(input.city !== undefined ? { city: input.city } : {}),
          ...(input.isMain != null ? { isMain: input.isMain } : {}),
          ...(input.active != null ? { active: input.active } : {}),
          updatedAt: new Date(),
        })
        .where(eq(universities.id, id));
    }
    return universitiesRepository.findById(id);
  }
}

export const adminUniversitiesService = new AdminUniversitiesService();

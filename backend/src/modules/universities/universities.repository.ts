import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { universities } from "../../db/schema/index.js";

export class UniversitiesRepository {
  async listAll() {
    return db.select().from(universities);
  }

  async findBySlug(slug: string) {
    const [row] = await db
      .select()
      .from(universities)
      .where(eq(universities.slug, slug))
      .limit(1);
    return row ?? null;
  }
}

export const universitiesRepository = new UniversitiesRepository();

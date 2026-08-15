import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../index.js";
import { institutionSeeds } from "./universities.js";

async function main() {
  for (const inst of institutionSeeds) {
    await db.execute(sql`
      INSERT INTO institutions (name, short_name, slug, website, active)
      VALUES (
        ${inst.name},
        ${inst.shortName},
        ${inst.slug},
        ${inst.website},
        true
      )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        short_name = EXCLUDED.short_name,
        website = EXCLUDED.website,
        active = true,
        updated_at = now()
    `);

    const instRow = await db.execute(sql`
      SELECT id FROM institutions WHERE slug = ${inst.slug} LIMIT 1
    `);
    const instRows = Array.isArray(instRow)
      ? instRow
      : ((instRow as { rows?: { id: string }[] }).rows ?? []);
    const institutionId = String(instRows[0]?.id ?? "");
    if (!institutionId) {
      throw new Error(`Missing institution id for ${inst.slug}`);
    }

    for (const campus of inst.campuses) {
      await db.execute(sql`
        INSERT INTO universities (
          name, slug, location, institution_id, city, is_main, active
        )
        VALUES (
          ${campus.name},
          ${campus.slug},
          ST_GeogFromText(${campus.location}),
          ${institutionId}::uuid,
          ${campus.city},
          ${campus.isMain === true},
          true
        )
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          location = EXCLUDED.location,
          institution_id = EXCLUDED.institution_id,
          city = EXCLUDED.city,
          is_main = EXCLUDED.is_main,
          active = true,
          updated_at = now()
      `);
    }
  }

  // Public LU is out of v1 scope — hide the old Fanar pin if present.
  await db.execute(sql`
    UPDATE universities
    SET active = false, updated_at = now()
    WHERE slug = 'lu-fanar'
  `);

  const campusCount = institutionSeeds.reduce(
    (n, inst) => n + inst.campuses.length,
    0,
  );
  console.log(
    `Seeded ${institutionSeeds.length} institutions / ${campusCount} campuses`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

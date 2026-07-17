import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../index.js";
import { universitySeeds } from "./universities.js";

async function main() {
  for (const row of universitySeeds) {
    await db.execute(sql`
      INSERT INTO universities (name, slug, location)
      VALUES (
        ${row.name},
        ${row.slug},
        ST_GeogFromText(${row.location})
      )
      ON CONFLICT (slug) DO NOTHING
    `);
  }

  console.log(`Seeded ${universitySeeds.length} universities`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Apply migration 0044 (once) and the reviewed OSM street/neighbourhood seed. Never replays older migrations.
import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { seedOsmLocations } from '../../src/db/seeds/seed-osm-locations.ts';

const target = new URL(process.env.DATABASE_URL);
if (!['localhost','127.0.0.1','[::1]'].includes(target.hostname) || target.pathname !== '/studently_dev' ||
  process.env.NODE_ENV === 'production' || ['prod','production'].includes(process.env.DEPLOYMENT_ENV)) {
  throw new Error('OSM apply only accepts loopback studently_dev outside production');
}
const client = postgres(target.toString(), { max: 1, connect_timeout: 5, onnotice: () => {} });
const db = drizzle(client);
const journal = JSON.parse(await readFile(new URL('../../drizzle/meta/_journal.json', import.meta.url),'utf8'));
const entry = journal.entries.find(row => row.tag==='0044_search_osm_streets');
const previous = journal.entries.find(row => row.tag==='0043_search_location_images');
const migration = await readFile(new URL('../../drizzle/0044_search_osm_streets.sql',import.meta.url),'utf8');
const hash = createHash('sha256').update(migration).digest('hex');
const seedText = await readFile(new URL('../../src/db/seeds/osm/streets.seed.json',import.meta.url),'utf8');
const seed = JSON.parse(seedText);
const output = new URL('../../../artifacts/osm-streets/',import.meta.url);
const dryRun = process.argv.includes('--dry-run');
class DryRun extends Error { constructor(report) { super('dry run'); this.report = report; } }
try {
  const report = await db.transaction(async tx => {
    const [database] = await tx.execute(sql`SELECT current_database() name`);
    if (database.name!=='studently_dev') throw new Error('Connected database does not match approved target');
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('studently-search-osm-0044'))`);
    const [prior] = await tx.execute(sql`SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at=${previous.when}`);
    if (!prior) throw new Error('Apply requires migration 0043; it will not replay it');
    const [applied] = await tx.execute(sql`SELECT hash FROM drizzle.__drizzle_migrations WHERE created_at=${entry.when}`);
    if (applied && applied.hash!==hash) throw new Error('Applied migration hash differs; refusing to overwrite migration history');
    const inventory = () => tx.execute(sql`SELECT count(*)::int AS units, count(DISTINCT place_id)::int AS places,
      md5(coalesce(string_agg(to_jsonb(l)::text,'' ORDER BY id),'')) AS unit_hash FROM listings l`);
    const [before] = await inventory();
    if (!applied) {
      for (const statement of migration.split('--> statement-breakpoint')) await tx.execute(sql.raw(statement));
      await tx.execute(sql`INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES (${hash},${entry.when})`);
    }
    const imported = await seedOsmLocations(tx, seed);
    const radii = await tx.execute(sql`SELECT radius_m, count(*)::int AS areas, string_agg(id, ',' ORDER BY id) AS ids
      FROM search_locations WHERE kind='area' GROUP BY radius_m ORDER BY radius_m`);
    const [after] = await inventory();
    if (JSON.stringify(before)!==JSON.stringify(after)) throw new Error('Inventory changed during OSM apply; rolling back');
    const result = { database: database.name, migration: entry.tag, alreadyApplied: Boolean(applied), dryRun,
      seedSha256: createHash('sha256').update(seedText).digest('hex'), decisions: seed.meta?.decisions,
      imported, areaRadii: radii, inventory: { units: after.units, places: after.places, unchanged: true } };
    if (dryRun) throw new DryRun(result);
    return result;
  }).catch(error => { if (error instanceof DryRun) return error.report; throw error; });
  await mkdir(output,{recursive:true});
  await writeFile(new URL(dryRun ? 'apply-report.dry-run.json' : 'apply-report.json',output),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
} finally { await client.end(); }

// Only the approved additive catalog migration and seed; never replays older migrations.
import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { seedSearchCatalog } from '../../src/db/seeds/seed-search-catalog.ts';

const target = new URL(process.env.DATABASE_URL);
if (!['localhost','127.0.0.1','[::1]'].includes(target.hostname) || target.pathname !== '/studently_dev' ||
  process.env.NODE_ENV === 'production' || ['prod','production'].includes(process.env.DEPLOYMENT_ENV)) {
  throw new Error('Search catalog apply only accepts loopback studently_dev outside production');
}
const client = postgres(target.toString(), { max: 1, connect_timeout: 5, onnotice: () => {} });
const db = drizzle(client);
const journal = JSON.parse(await readFile(new URL('../../drizzle/meta/_journal.json', import.meta.url),'utf8'));
const entry = journal.entries.find(row => row.tag==='0041_search_catalog');
const migration = await readFile(new URL('../../drizzle/0041_search_catalog.sql',import.meta.url),'utf8');
const hash = createHash('sha256').update(migration).digest('hex');
const output = new URL('../../../artifacts/search-v2/step-1/',import.meta.url);
try {
  const report = await db.transaction(async tx => {
    const [database] = await tx.execute(sql`SELECT current_database() name`);
    if (database.name!=='studently_dev') throw new Error('Connected database does not match approved target');
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('studently-search-catalog-0041'))`);
    const [previous] = await tx.execute(sql`SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at=1794570000000`);
    if (!previous) throw new Error('Apply requires the existing creation-drafts migration; it will not replay it');
    const [applied] = await tx.execute(sql`SELECT hash FROM drizzle.__drizzle_migrations WHERE created_at=${entry.when}`);
    if (applied && applied.hash!==hash) throw new Error('Applied migration hash differs; refusing to overwrite migration history');
    const [before] = await tx.execute(sql`SELECT count(*)::int AS units, count(DISTINCT place_id)::int AS places,
      md5(coalesce(string_agg(to_jsonb(l)::text,'' ORDER BY id),'')) AS unit_hash FROM listings l`);
    if (!applied) {
      for (const statement of migration.split('--> statement-breakpoint')) await tx.execute(sql.raw(statement));
      await tx.execute(sql`INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES (${hash},${entry.when})`);
    }
    const seed = await seedSearchCatalog(tx);
    const [after] = await tx.execute(sql`SELECT count(*)::int AS units, count(DISTINCT place_id)::int AS places,
      md5(coalesce(string_agg(to_jsonb(l)::text,'' ORDER BY id),'')) AS unit_hash FROM listings l`);
    if (JSON.stringify(before)!==JSON.stringify(after)) throw new Error('Inventory changed during catalog apply; rolling back');
    const [coverage] = await tx.execute(sql`SELECT count(*)::int AS institutions FROM institutions WHERE name_ar IS NOT NULL`);
    return {database:database.name,migration:entry.tag,alreadyApplied:Boolean(applied),seed,translatedInstitutions:coverage.institutions,
      inventory:{units:after.units,places:after.places,unchanged:true}};
  });
  await mkdir(output,{recursive:true});
  await writeFile(new URL('catalog-report.json',output),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
} finally { await client.end(); }

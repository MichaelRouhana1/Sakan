import 'dotenv/config';
import { access, readFile, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import postgres from 'postgres';
import { seedTarget, assertSeedMarker } from './seed-guard.mjs';

const backup = path.resolve('..', 'backups', 'studently_dev-20261028-1615.dump');
const migrationUrl = new URL('../../drizzle/0038_places_cleanup.sql', import.meta.url);
const journalUrl = new URL('../../drizzle/meta/_journal.json', import.meta.url);
const slice4ListingIds = [
  '2267a3a6-b8a6-4148-a831-84945de6056e',
  '7c6954e2-487b-4349-8902-48f54cc51f65',
  '48bd2d6a-727d-415d-9a26-475834e968b0',
  '54455fb0-bedf-4c45-b2f8-39d4a6371160',
  'c69bcdec-b536-433d-8753-a65d56610652',
];

const target = seedTarget(process.env);
if (target.name !== 'studently_dev' || target.environment !== 'local') {
  throw new Error('Slice 5 cleanup is restricted to local studently_dev');
}
await access(backup, constants.R_OK);
const backupInfo = await stat(backup);
if (!backupInfo.isFile() || backupInfo.size === 0) throw new Error('Verified backup is missing or empty');

const body = await readFile(migrationUrl, 'utf8');
const hash = createHash('sha256').update(body).digest('hex');
const journal = JSON.parse(await readFile(journalUrl, 'utf8'));
const entry = journal.entries.find(item => item.tag === '0038_places_cleanup');
if (!entry) throw new Error('0038_places_cleanup is missing from the migration journal');

const client = postgres(target.url.toString(), { max: 1, connect_timeout: 5, onnotice: () => {} });
try {
  const result = await client.begin(async tx => {
    await assertSeedMarker(tx, target);
    await tx`select pg_advisory_xact_lock(183710,5)`;
    const [already] = await tx`select id from drizzle.__drizzle_migrations where hash=${hash}`;
    if (already) throw new Error('0038_places_cleanup is already applied');
    const [last] = await tx`select created_at from drizzle.__drizzle_migrations order by created_at desc limit 1`;
    const previous = journal.entries[journal.entries.findIndex(item => item.tag === entry.tag) - 1];
    if (!last || Number(last.created_at) !== previous.when) {
      throw new Error('Database migration ledger is not exactly at 0037');
    }
    for (const statement of body.split('--> statement-breakpoint')) await tx.unsafe(statement);
    await tx`insert into drizzle.__drizzle_migrations(hash,created_at) values(${hash},${entry.when})`;

    const [counts] = await tx`select (select count(*)::int from listings) listings,(select count(*)::int from places) places`;
    const [kept] = await tx`select count(*)::int n from listings where id=any(${slice4ListingIds}::uuid[])`;
    const [legacy] = await tx`select to_regclass('public.listing_campus_routes')::text old_routes,
      count(*) filter(where column_name in ('listing_type','gender_restriction','area','location'))::int old_columns
      from information_schema.columns where table_schema='public' and table_name='listings'`;
    const manifestRows = await tx`select entity,id from studently_ops.housing_seed_manifest order by entity,id`;
    const manifestOkay = manifestRows.length === 1 && manifestRows[0].entity === 'user'
      && manifestRows[0].id === '626bf397-4751-40ba-8d5e-6aadfe5545e6';
    if (counts.listings !== 7 || counts.places !== 4 || kept.n !== 5 || legacy.old_routes || legacy.old_columns || !manifestOkay) {
      throw new Error(`Post-cleanup invariants failed; transaction will roll back: ${JSON.stringify({ counts, kept, legacy, manifestRows })}`);
    }
    return { counts, preservedSlice4Units: kept.n, legacy, manifestRows };
  });
  console.log(JSON.stringify({ backup, backupBytes: backupInfo.size, ...result }, null, 2));
} finally {
  await client.end();
}

import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

/** Slice 5's destructive half is restricted to studently_dev. Isolated test
 * databases apply only its schema-finalization tail, with no cleanup deletes. */
export async function exposeCurrentRuntimeView(client) {
  const [column] = await client`select 1 from information_schema.columns
    where table_schema='public' and table_name='listing_resolved' and column_name='hidden_reason'`;
  if (column) return;
  const journal = JSON.parse(await readFile(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8'));
  for (const entry of journal.entries.filter(item => item.idx >= 34 && item.idx < 38)) {
    const [done] = await client`select 1 from drizzle.__drizzle_migrations where created_at=${entry.when}`;
    if (done) continue;
    const migration = await readFile(new URL(`../drizzle/${entry.tag}.sql`, import.meta.url), 'utf8');
    for (const statement of migration.split('--> statement-breakpoint')) await client.unsafe(statement);
    await client`insert into drizzle.__drizzle_migrations(hash,created_at)
      values(${createHash('sha256').update(migration).digest('hex')},${entry.when})`;
  }
  const body = await readFile(new URL('../drizzle/0038_places_cleanup.sql', import.meta.url), 'utf8');
  const marker = '-- Remove the listing compatibility bridges and duplicated route cache.';
  const tail = body.slice(body.indexOf(marker));
  for (const statement of tail.split('--> statement-breakpoint')) await client.unsafe(statement);
}

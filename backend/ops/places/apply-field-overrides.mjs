import 'dotenv/config';
import postgres from 'postgres';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';

const tag = '0037_per_field_utility_overrides';

export async function applyFieldOverrides(client) {
  const journal = JSON.parse(await readFile(new URL('../../drizzle/meta/_journal.json', import.meta.url), 'utf8'));
  const entry = journal.entries.find((item) => item.tag === tag);
  if (!entry) throw new Error('Missing journal entry: ' + tag);
  const [{db}] = await client`select current_database() as db`;
  return client.begin(async (tx) => {
    await tx`set local lock_timeout='10s'`;
    await tx`select pg_advisory_xact_lock(183710,1)`;
    const body = await readFile(new URL('../../drizzle/' + tag + '.sql', import.meta.url), 'utf8');
    const hash = createHash('sha256').update(body).digest('hex');
    if ((await tx`select id from drizzle.__drizzle_migrations where hash=${hash}`).length) {
      return {applied: false, migrations: [], database: db};
    }
    if ((await tx`select id from drizzle.__drizzle_migrations where created_at=${entry.when}`).length) {
      throw new Error('Migration checksum mismatch: ' + tag);
    }
    for (const statement of body.split('--> statement-breakpoint')) await tx.unsafe(statement);
    await tx`insert into drizzle.__drizzle_migrations(hash,created_at) values(${hash},${entry.when})`;
    return {applied: true, migrations: [tag], database: db};
  });
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/apply-field-overrides.mjs')) {
  const client = postgres(process.env.DATABASE_URL, {max: 1, onnotice: () => {}});
  try {
    const [{db, addr}] = await client`select current_database() as db, inet_server_addr()::text as addr`;
    if (db !== 'studently_dev') throw new Error('Refusing to migrate database ' + db);
    console.log(JSON.stringify(await applyFieldOverrides(client)));
    console.error('applied on ' + db + ' via ' + addr);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

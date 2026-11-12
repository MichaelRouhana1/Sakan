import 'dotenv/config';
import postgres from 'postgres';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const client = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  const [database] = await client`select current_database() name`;
  if (database.name !== 'studently_dev') throw new Error('This helper only applies to studently_dev');
  const migration = await readFile(new URL('../../drizzle/0039_unit_auto_renew.sql', import.meta.url), 'utf8');
  await client.begin(async tx => {
    for (const statement of migration.split('--> statement-breakpoint')) await tx.unsafe(statement);
    const hash = createHash('sha256').update(migration).digest('hex');
    await tx`INSERT INTO drizzle.__drizzle_migrations(hash,created_at) SELECT ${hash},1794480000000
      WHERE NOT EXISTS(SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash=${hash})`;
  });
  console.log('Applied unit auto-renew migration to studently_dev');
} finally { await client.end(); }

// Verifies normalize v2 golden vectors against the real Postgres, in a temp function. No writes outside pg_temp.
import { readFileSync } from 'node:fs';
import { connect, installTempNormalize, GOLDEN } from './lib.mjs';

let failed = 0;
const lf = path => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const generated = lf('./normalize_v2.sql').replace(/^-- GENERATED.*\n/, '').replaceAll('{{FN}}', 'search_normalize').trimEnd();
const migration = lf('../../drizzle/0044_search_osm_streets.sql');
const inSync = migration.startsWith(generated + '\n--> statement-breakpoint');
console.log(`migration 0044 function matches normalize_v2.sql: ${inSync}`);
if (!inSync) failed++;

const sql = connect();
try {
  await sql.begin(async tx => {
    const fn = await installTempNormalize(tx);
    const [{ v }] = await tx.unsafe(`SELECT provolatile AS v FROM pg_proc WHERE oid = '${fn}(text)'::regprocedure`);
    console.log(`provolatile = ${v} (expected i)`);
    if (v !== 'i') failed++;
    for (const [input, expected] of GOLDEN) {
      const [{ n }] = await tx.unsafe(`SELECT ${fn}($1) AS n`, [input]);
      const ok = n === expected;
      if (!ok) failed++;
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${JSON.stringify(input)} -> ${JSON.stringify(n)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}`);
    }
    throw Object.assign(new Error('rollback'), { rollback: true });
  }).catch(e => { if (!e.rollback) throw e; });
} finally {
  await sql.end();
}
console.log(failed ? `${failed} FAILED` : 'all golden vectors pass');
process.exit(failed ? 1 : 0);

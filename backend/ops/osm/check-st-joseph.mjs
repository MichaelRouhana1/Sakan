// Read-only: does "st joseph" reach the USJ campuses today (v1 index) and under v2? Mirrors search.service match tiers.
import { connect, installTempNormalize } from './lib.mjs';
const sql = connect();
try {
  await sql.begin(async tx => {
    const fn = await installTempNormalize(tx);
    await tx.unsafe('SET LOCAL pg_trgm.similarity_threshold=0.25');
    await tx.unsafe('SET LOCAL pg_trgm.word_similarity_threshold=0.6');
    for (const [label, col] of [['v1 (stored normalized)', 'a.normalized'], ['v2 (pg_temp function)', `${fn}(a.alias)`]]) {
      const q = label.startsWith('v1') ? 'st joseph' : (await tx.unsafe(`SELECT ${fn}('st joseph') q`))[0].q;
      const rows = await tx.unsafe(`SELECT u.slug, max(similarity(${col}, $1)) s, max(word_similarity($1, ${col})) ws,
          bool_or(${col} = $1) exact, bool_or(${col} LIKE $1 || '%' OR ${col} LIKE '% ' || $1 || '%') pref
        FROM search_aliases a JOIN universities u ON u.id = a.campus_id
        WHERE ${col} = $1 OR ${col} LIKE $1 || '%' OR ${col} LIKE '% ' || $1 || '%' OR ${col} % $1 OR ${col} %> $1
        GROUP BY u.slug ORDER BY s DESC LIMIT 10`, [q]);
      console.log(`${label}: query "${q}" -> ${rows.length} campus hits`);
      for (const r of rows) console.log(`   ${r.slug}  tier=${r.exact ? 0 : r.pref ? 1 : 2}  sim=${Number(r.s).toFixed(2)} wsim=${Number(r.ws).toFixed(2)}`);
    }
    throw Object.assign(new Error('rollback'), { rollback: true });
  }).catch(e => { if (!e.rollback) throw e; });
} finally { await sql.end(); }

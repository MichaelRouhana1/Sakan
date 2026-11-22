// Read-only preview of what swapping to normalize v2 would change in the existing alias index (rolled back).
import { connect, installTempNormalize } from './lib.mjs';
const sql = connect();
try {
  await sql.begin(async tx => {
    const fn = await installTempNormalize(tx);
    const [tot] = await tx.unsafe(`SELECT count(*)::int n FROM search_aliases`);
    const changed = await tx.unsafe(`SELECT alias, normalized AS old_n, ${fn}(alias) AS new_n, source FROM search_aliases WHERE normalized IS DISTINCT FROM ${fn}(alias) ORDER BY source, alias`);
    console.log(`aliases total ${tot.n}; normalized value would change for ${changed.length}`);
    for (const r of changed.slice(0, 60)) console.log(`  [${r.source}] ${JSON.stringify(r.alias)}: ${JSON.stringify(r.old_n)} -> ${JSON.stringify(r.new_n)}`);
    const usj = await tx.unsafe(`SELECT a.alias, ${fn}(a.alias) AS n FROM search_aliases a JOIN universities u ON u.id=a.campus_id WHERE ${fn}(a.alias) LIKE '%joseph%' ORDER BY 1`);
    console.log(`campus aliases containing "joseph" under v2: ${usj.length}`);
    for (const r of usj.slice(0, 12)) console.log(`  ${JSON.stringify(r.alias)} -> ${JSON.stringify(r.n)}`);
    const q = await tx.unsafe(`SELECT ${fn}('st joseph') AS q, ${fn}('saint joseph') AS q2`);
    console.log('query "st joseph" ->', JSON.stringify(q[0].q), '| "saint joseph" ->', JSON.stringify(q[0].q2));
    const hits = await tx.unsafe(`SELECT DISTINCT u.slug FROM search_aliases a JOIN universities u ON u.id=a.campus_id
      WHERE ${fn}(a.alias) = ${fn}('st joseph') OR ${fn}(a.alias) LIKE ${fn}('st joseph') || '%' OR ${fn}(a.alias) LIKE '% ' || ${fn}('st joseph') || '%' ORDER BY 1`);
    console.log(`campuses matching "st joseph" exact/prefix/word-prefix under v2: ${hits.map(h => h.slug).join(', ') || 'none'}`);
    throw Object.assign(new Error('rollback'), { rollback: true });
  }).catch(e => { if (!e.rollback) throw e; });
} finally { await sql.end(); }

// Read-only dev evidence. The forced-index transaction is diagnostic only.
import 'dotenv/config';
import postgres from 'postgres';
import { mkdir, writeFile } from 'node:fs/promises';

const target = new URL(process.env.DATABASE_URL);
if (!['localhost','127.0.0.1','[::1]'].includes(target.hostname) || target.pathname!=='/studently_dev') throw new Error('Loopback studently_dev required');
const client = postgres(target.toString(),{max:1,connect_timeout:5,onnotice:()=>{}});
const checks = [
  {name:'exact-arabic-alias',query:"SELECT location_id FROM search_aliases WHERE normalized=search_normalize('الحمراء')"},
  {name:'prefix',query:"SELECT target_key FROM search_aliases WHERE normalized LIKE 'dek%'"},
  {name:'trigram',query:"SELECT target_key FROM search_aliases WHERE normalized % 'dekwnae'"},
];
const output = new URL('../../../artifacts/search-v2/step-1/',import.meta.url);
try {
  const plans = await client.begin('read only',async tx => {
    await tx`SET LOCAL pg_trgm.similarity_threshold=0.25`;
    const evidence=[];
    for(const check of checks) {
      const normal=await tx.unsafe('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) '+check.query);
      await tx`SET LOCAL enable_seqscan=off`;
      const indexed=await tx.unsafe('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) '+check.query);
      await tx`SET LOCAL enable_seqscan=on`;
      const expected=check.name==='trigram' ? 'search_aliases_trgm_idx' : 'search_aliases_normalized_idx';
      if(!JSON.stringify(indexed).includes(expected)) throw new Error('Index not usable for '+check.name);
      evidence.push({name:check.name,query:check.query,expectedIndex:expected,normal,indexDiagnostic:indexed});
    }
    return evidence;
  });
  await mkdir(output,{recursive:true});
  await writeFile(new URL('query-plans.json',output),JSON.stringify({database:'studently_dev',similarityThreshold:0.25,note:'Normal plans are reported unchanged; enable_seqscan=off only proves index eligibility inside this read-only transaction.',plans},null,2)+'\n');
  console.log(JSON.stringify(plans.map(p=>({name:p.name,indexUsable:p.expectedIndex})),null,2));
} finally { await client.end(); }

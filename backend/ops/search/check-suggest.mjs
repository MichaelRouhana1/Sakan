// Read-only responses and actual SQL plans on dev data; no synthetic benchmark.
import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { PgDialect } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { mkdir,writeFile } from 'node:fs/promises';
import { SearchService } from '../../dist/modules/search/search.service.js';
const target=new URL(process.env.DATABASE_URL);
if(!['localhost','127.0.0.1','[::1]'].includes(target.hostname)||target.pathname!=='/studently_dev')throw new Error('Loopback studently_dev required');
const client=postgres(target.toString(),{max:1,onnotice:()=>{}}),db=drizzle(client),dialect=new PgDialect();
const plans=[],responses=[];
let queryLabel='';
const executor={execute:q=>db.execute(q),transaction:fn=>db.transaction(async tx=>{
  await tx.execute(sql`SET TRANSACTION READ ONLY`);
  return fn({execute:async q=>{
    const compiled=dialect.sqlToQuery(q);
    if(compiled.sql.includes('WITH live_units')) {
      const normal=await tx.execute(sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${q}`);
      await tx.execute(sql`SET LOCAL enable_seqscan=off`);
      const indexed=await tx.execute(sql`EXPLAIN (FORMAT JSON) ${q}`);
      await tx.execute(sql`SET LOCAL enable_seqscan=on`);
      const indexNames=[];
      function walk(node){if(!node||typeof node!=='object')return;if(node['Index Name'])indexNames.push(node['Index Name']);Object.values(node).forEach(v=>Array.isArray(v)?v.forEach(walk):walk(v));}
      walk(normal);
      if([...queryLabel].length>=3 && !JSON.stringify(indexed).includes('search_aliases_trgm_idx')) throw new Error('Trigram index is not eligible for '+queryLabel);
      plans.push({query:queryLabel,naturalIndexes:[...new Set(indexNames)],natural:normal,indexEligibilityDiagnostic:indexed});
    }
    return tx.execute(q);
  }});
})};
try{
  const service=new SearchService(executor);
  for(const q of ['','حمرا','Fanâr','Dekouané','achrafih','AUB','USJ','LAU','qwertyuiozx']){
    queryLabel=q;responses.push(await service.suggest(q));
  }
  const output=new URL('../../../artifacts/search-v2/step-2/',import.meta.url);await mkdir(output,{recursive:true});
  await writeFile(new URL('api-samples.json',output),JSON.stringify(responses,null,2)+'\n');
  await writeFile(new URL('query-plans.json',output),JSON.stringify({database:'studently_dev',note:'Actual suggest SQL on existing data. Natural plans are unchanged. enable_seqscan=off is transaction-local index eligibility evidence only.',plans},null,2)+'\n');
  console.log(JSON.stringify(plans.map(p=>({query:p.query,naturalIndexes:p.naturalIndexes})),null,2));
}finally{await client.end();}
process.exit(0);

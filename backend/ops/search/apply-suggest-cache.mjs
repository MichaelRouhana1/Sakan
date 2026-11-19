// Additive migration only. Never replay the earlier dev-only cleanup migrations.
import 'dotenv/config';
import postgres from 'postgres';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const target=new URL(process.env.DATABASE_URL);
if(!['localhost','127.0.0.1','[::1]'].includes(target.hostname)||target.pathname!=='/studently_dev'||process.env.NODE_ENV==='production'||['prod','production'].includes(process.env.DEPLOYMENT_ENV)) throw new Error('Only loopback studently_dev outside production is allowed');
const client=postgres(target.toString(),{max:1,onnotice:()=>{}});
const journal=JSON.parse(await readFile(new URL('../../drizzle/meta/_journal.json',import.meta.url),'utf8'));
const entry=journal.entries.find(e=>e.tag==='0042_search_suggest_cache');
const body=await readFile(new URL('../../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8');
const hash=createHash('sha256').update(body).digest('hex');
try {
  const report=await client.begin(async tx=>{
    await tx`SELECT pg_advisory_xact_lock(hashtext('studently-search-suggest-0042'))`;
    const previous=journal.entries.find(e=>e.tag==='0041_search_catalog');
    if(!(await tx`SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at=${previous.when}`).length) throw new Error('Search catalog migration must already be applied');
    const [applied]=await tx`SELECT hash FROM drizzle.__drizzle_migrations WHERE created_at=${entry.when}`;
    if(applied&&applied.hash!==hash)throw new Error('Applied migration hash differs');
    const inventory=()=>tx`SELECT count(*)::int AS units,md5(coalesce(string_agg(to_jsonb(l)::text,'' ORDER BY id),'')) AS hash FROM listings l`;
    const [before]=await inventory();
    if(!applied){for(const part of body.split('--> statement-breakpoint'))await tx.unsafe(part);await tx`INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES (${hash},${entry.when})`;}
    const [after]=await inventory();
    if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Inventory changed; rolling back');
    return {migration:entry.tag,alreadyApplied:Boolean(applied),inventory:{units:after.units,unchanged:true}};
  });
  const output=new URL('../../../artifacts/search-v2/step-2/',import.meta.url);await mkdir(output,{recursive:true});
  await writeFile(new URL('migration-report.json',output),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await client.end();}

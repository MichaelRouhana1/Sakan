import 'dotenv/config';
import postgres from 'postgres';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {preflight,foundationTags} from './foundation.mjs';

export async function applyInventory(client) {
 const report=await preflight(client);
 if(report.blockers.length)throw new Error('Preflight blocked: '+report.blockers.join('; '));
 const journal=JSON.parse(await readFile(new URL('../../drizzle/meta/_journal.json',import.meta.url),'utf8'));
 const entries=journal.entries.filter(e=>['0034_unit_inventory_money','0035_inventory_gender_version'].includes(e.tag));
 return client.begin(async tx=>{
  await tx`set local lock_timeout='10s'`;
  await tx`select pg_advisory_xact_lock(183710,1)`;
  for(const tag of foundationTags){
   const prior=createHash('sha256').update(await readFile(new URL('../../drizzle/'+tag+'.sql',import.meta.url),'utf8')).digest('hex');
   if(!(await tx`select id from drizzle.__drizzle_migrations where hash=${prior}`).length)throw new Error('Apply foundation first: '+tag);
  }
  await tx`lock table places,listings,listing_photos in share row exclusive mode`;
  const migrations=[];
  for(const entry of entries){
   const body=await readFile(new URL('../../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8');
   const hash=createHash('sha256').update(body).digest('hex');
   if((await tx`select id from drizzle.__drizzle_migrations where hash=${hash}`).length)continue;
   if((await tx`select id from drizzle.__drizzle_migrations where created_at=${entry.when}`).length)throw new Error('Migration checksum mismatch: '+entry.tag);
   for(const statement of body.split('--> statement-breakpoint'))await tx.unsafe(statement);
   await tx`insert into drizzle.__drizzle_migrations(hash,created_at) values(${hash},${entry.when})`;
   migrations.push(entry.tag);
  }
  return {applied:migrations.length>0,migrations};
 });
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/apply-inventory.mjs')){
 const client=postgres(process.env.DATABASE_URL,{max:1,onnotice:()=>{}});
 try{console.log(JSON.stringify(await applyInventory(client)))}catch(e){console.error(e.message);process.exitCode=1}finally{await client.end()}
}

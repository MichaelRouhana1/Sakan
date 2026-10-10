import 'dotenv/config';
import postgres from 'postgres';
import { spawn } from 'node:child_process';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import { seedTarget,assertSeedMarker } from './seed-guard.mjs';
import { seedHousing } from './seed-housing.mjs';

const raw={...process.env};const target=seedTarget(raw,{reset:true});
if(target.environment!=='local' || target.name!=='skoun_dev')throw new Error('Reset is restricted to loopback skoun_dev');
const adminUrl=new URL(target.url);adminUrl.pathname='/postgres';
const admin=postgres(adminUrl.toString(),{max:1,onnotice:()=>{}});
let client;
function catalog(script){
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['--import','tsx',script],{stdio:'inherit',env:{...raw,DATABASE_URL:target.url.toString()}});
  child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(script+' exited '+code)));
 });
}
try{
 const [exists]=await admin`select datname from pg_database where datname=${target.name}`;
 if(exists){
  client=postgres(target.url.toString(),{max:1,onnotice:()=>{}});
  await client.begin('read only',tx=>assertSeedMarker(tx,target));
  await client.end();client=null;
 }
 if(process.argv.includes('--dry-run')){
  console.log(JSON.stringify({readOnly:true,target:target.name,exists:!!exists,approvedMarker:!!exists,action:'Recreate only this dedicated dev database; preserve DATABASE_URL'},null,2));
 }else{
  // Target was checked above against an exact name, loopback host, environment,
  // and independent marker. Never infer a reset target from DATABASE_URL.
  if(exists)await admin.unsafe('DROP DATABASE "skoun_dev"');
  await admin.unsafe('CREATE DATABASE "skoun_dev"');
  client=postgres(target.url.toString(),{max:1,onnotice:()=>{}});
  await migrate(drizzle(client),{migrationsFolder:'drizzle'});
  // Drizzle changes this client's JSON/date serializers. The raw seed needs
  // postgres.js defaults, so give it a fresh connection after migration.
  await client.end();
  client=postgres(target.url.toString(),{max:1,onnotice:()=>{}});
  await client.unsafe('CREATE SCHEMA skoun_ops; CREATE TABLE skoun_ops.environment_guard(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),environment text NOT NULL,database_name text NOT NULL)');
  await client`insert into skoun_ops.environment_guard(environment,database_name) values('local','skoun_dev')`;
  for(const script of ['src/db/seeds/run-universities.ts','src/db/seeds/run-academic.ts','src/db/seeds/run-student-benefits.ts'])await catalog(script);
  console.log(JSON.stringify(await seedHousing(client,{...raw,DATABASE_URL:target.url.toString()}),null,2));
  console.log('Reset complete: skoun_dev. Existing DATABASE_URL was not reset or changed.');
 }
}catch(error){console.error(error.message);process.exitCode=1;}
finally{if(client)await client.end();await admin.end();}


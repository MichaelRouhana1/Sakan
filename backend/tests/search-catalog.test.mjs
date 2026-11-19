// Disposable loopback database only. No fixtures or rollback tricks on studently_dev.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { exposeCurrentRuntimeView } from './current-runtime-view.mjs';
import { seedSearchCatalog } from '../dist/db/seeds/seed-search-catalog.js';
import { searchLocationSeeds, campusNamesAr, institutionNamesAr } from '../dist/db/seeds/search-catalog.js';
import { institutionSeeds } from '../dist/db/seeds/universities.js';
import { LEBANON_AREAS } from '../dist/constants/lebanonAreas.js';
import { SearchResolver, SearchResolutionError } from '../dist/modules/search/search-resolver.js';
import { normalizeSearch } from '../dist/modules/search/search-normalization.js';

const target = new URL(process.env.DATABASE_URL);
if (!['localhost','127.0.0.1','[::1]'].includes(target.hostname)) throw new Error('Loopback database required');
const name='studently_search_catalog_test_'+randomUUID().replaceAll('-','');
if (!/^studently_search_catalog_test_[a-f0-9]{32}$/.test(name)) throw new Error('Unsafe test database name');
const admin=postgres(target.toString(),{max:1,connect_timeout:5,onnotice:()=>{}});
let client;
let cleaned=false, created=false;
async function cleanup() {
  if(cleaned) return;
  cleaned=true;
  try { if(client) await client.end(); }
  finally {
    try { if(created) await admin.unsafe('DROP DATABASE IF EXISTS "'+name+'"'); }
    finally { await admin.end(); }
  }
}
after(cleanup);
async function bootstrap() {
  try {
    await admin.unsafe('CREATE DATABASE "'+name+'"');
    created=true;
    target.pathname='/'+name;
    client=postgres(target.toString(),{max:1,connect_timeout:5,onnotice:()=>{}});
    await client.unsafe('CREATE SCHEMA drizzle; CREATE TABLE drizzle.__drizzle_migrations(id serial primary key,hash text NOT NULL,created_at bigint)');
    const journal=JSON.parse(await readFile(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8'));
    for(const entry of journal.entries.filter(row=>row.idx<38)) {
      const body=await readFile(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8');
      for(const part of body.split('--> statement-breakpoint')) await client.unsafe(part);
      await client`INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES (${entry.tag},${entry.when})`;
    }
    await exposeCurrentRuntimeView(client);
    const migration=await readFile(new URL('../drizzle/0041_search_catalog.sql',import.meta.url),'utf8');
    for(const part of migration.split('--> statement-breakpoint')) await client.unsafe(part);
    for(const inst of institutionSeeds) {
      const [parent]=await client`INSERT INTO institutions(name,short_name,slug) VALUES (${inst.name},${inst.shortName},${inst.slug}) RETURNING id`;
      for(const campus of inst.campuses) await client`INSERT INTO universities(institution_id,name,slug,city,is_main,location)
        VALUES (${parent.id},${campus.name},${campus.slug},${campus.city},${Boolean(campus.isMain)},ST_GeogFromText(${campus.location}))`;
    }
    const [owner]=await client`INSERT INTO users(role) VALUES ('poster') RETURNING id`;
    const [place]=await client`INSERT INTO places(owner_id,area,building_name,electricity,water)
      VALUES (${owner.id},'Hamra','Bliss House','solar','state_well_24_7') RETURNING id`;
    const executor=drizzle(client), resolver=new SearchResolver(executor);
    const seeded=await executor.transaction(tx=>seedSearchCatalog(tx));
    return {owner,place,executor,resolver,seeded,migration};
  } catch(error) { await cleanup(); throw error; }
}
const {owner,place,executor,resolver,seeded,migration}=await bootstrap();

test('all existing areas, institutions and campuses have curated bilingual records',async()=>{
  assert.deepEqual(new Set(searchLocationSeeds.filter(r=>r.kind==='area').map(r=>r.canonicalArea)),new Set(LEBANON_AREAS));
  assert.equal(searchLocationSeeds.filter(r=>r.kind==='city').length,18);
  assert.deepEqual(seeded.missingInstitutions,[]); assert.deepEqual(seeded.missingCampuses,[]);
  assert.deepEqual(seeded.untranslatedActiveCampuses,[]); assert.deepEqual(seeded.unmappedPlaces,[]);
  for(const inst of institutionSeeds) {
    assert.ok(institutionNamesAr[inst.slug]);
    for(const campus of inst.campuses) assert.ok(campusNamesAr[campus.slug]);
  }
  const [row]=await client`SELECT city FROM places WHERE id=${place.id}`;
  assert.equal(row.city,'Beirut');
});

test('Fanar and Dekwaneh are cities in Matn and are not Beirut children',async()=>{
  for(const input of ['Fanâr','الفنار','Dekouané','الدكوانة']) {
    const city=await resolver.resolveCity(input);
    assert.equal(city.kind,'city'); assert.equal(city.contextEn,'Matn'); assert.equal(city.contextAr,'المتن');
    assert.equal(city.parentCityId,null);
    assert.ok(!city.canonicalAreas.includes('Hamra'));
  }
  const beirut=await resolver.resolveCity('Beyrouth');
  assert.equal(beirut.canonicalAreas.length,9);
  assert.ok(beirut.canonicalAreas.includes('Hamra'));
  assert.ok(!beirut.canonicalAreas.includes('Fanar'));
  assert.ok(!beirut.canonicalAreas.includes('Furn El Chebbak'));
});

test('one SQL normalizer handles Arabic, accents, ligatures, digits and invisible marks',async()=>{
  const cases=[['  Fanâr  ','fanar'],['Dekouané','dekouane'],['Zahlé','zahle'],
    ['الْحَمْرَا','الحمرا'],['الأشرفية','الاشرفيه'],['إإآٱ','اااا'],['الفـنار','الفنار'],
    ['الحم\u200fرا','الحمرا'],['کىی','كيي'],['٠١٢٣٤٥٦٧٨٩','0123456789'],['۰۱۲۳۴۵۶۷۸۹','0123456789'],
    ['A.U.B.','a u b'],['7amra','7amra'],['🦄🦄',''],['\uFEFFHamra','hamra'],['Æsir','aesir']];
  for(const [input,want] of cases) assert.equal(await normalizeSearch(executor,input),want,input);
});

test('explicit area filters resolve EN, AR, Franco and French aliases to stored keys',async()=>{
  for(const input of ['Hamra','الحمرا','الحمراء','7amra','el7amra']) assert.deepEqual((await resolver.resolveAreaFilters([input])).canonicalAreas,['Hamra']);
  for(const input of ['Dekwane','Dekouané','الدكوانة']) assert.deepEqual((await resolver.resolveAreaFilters([input])).canonicalAreas,['Dekwaneh']);
  for(const input of ['achrafieh','ashrafieh','2ashrafiye','الأشرفية']) assert.deepEqual((await resolver.resolveAreaFilters([input])).canonicalAreas,['Achrafieh']);
  assert.deepEqual((await resolver.resolveAreaFilters(['الحمرا','Hamra','فردان'])).canonicalAreas,['Hamra','Verdun']);
  await assert.rejects(resolver.resolveAreaFilters(['Hamra','Unknown district']),e=>e instanceof SearchResolutionError && e.code==='UNKNOWN_SEARCH_AREA');
  assert.deepEqual((await resolver.resolveAreaFilters([])).canonicalAreas,[]);
});

test('query resolution consumes longest exact phrases and preserves remaining words',async()=>{
  const plain=await resolver.resolveQuery('الحمراء');
  assert.deepEqual(plain.canonicalAreas,['Hamra']); assert.equal(plain.remainingQuery,'');
  const mixed=await resolver.resolveQuery('studio رأس بيروت sunny');
  assert.deepEqual(mixed.canonicalAreas,['Ras Beirut']); assert.equal(mixed.remainingQuery,'studio sunny');
  assert.equal(mixed.locations.length,1);
  const town=await resolver.resolveQuery('Dekouané');
  assert.equal(town.locations[0].kind,'city'); assert.deepEqual(town.canonicalAreas,['Dekwaneh']);
  const jounieh=await resolver.resolveQuery('جونية');
  assert.equal(jounieh.locations[0].kind,'city'); assert.deepEqual(jounieh.canonicalAreas,['Jounieh','Kaslik']);
  const typo=await resolver.resolveQuery('dekwnae');
  assert.equal(typo.canonicalAreas,null); assert.equal(typo.remainingQuery,'dekwnae');
  assert.equal((await resolver.resolveQuery('hamrathon')).canonicalAreas,null);
  assert.equal((await resolver.resolveQuery('')).canonicalAreas,null);
});

test('browse intersections distinguish no constraint from no possible matches',async()=>{
  assert.deepEqual((await resolver.resolveBrowse({q:'studio الحمرا',city:'Beyrouth'})).canonicalAreas,['Hamra']);
  assert.deepEqual((await resolver.resolveBrowse({areas:['Dekwane'],q:'الحمرا'})).canonicalAreas,[]);
  assert.deepEqual((await resolver.resolveBrowse({areas:['Hamra'],q:'الحمراء'})).canonicalAreas,['Hamra']);
  assert.equal((await resolver.resolveBrowse({q:'sunny'})).canonicalAreas,null);
  await assert.rejects(resolver.resolveBrowse({city:'Dekwaneh',areas:['Hamra']}),e=>e.code==='UNKNOWN_SEARCH_AREA');
});

test('institution abbreviations retain each campus without rewriting geography',async()=>{
  const [aub]=await resolver.resolveCampusAliases('A.U.B.'); assert.equal(aub.slug,'aub'); assert.match(aub.nameAr,/رأس بيروت/);
  assert.equal((await resolver.resolveCampusAliases('AUB')).length,1);
  assert.deepEqual((await resolver.resolveCampusAliases('LAU')).map(c=>c.slug),['lau-beirut','lau-jbeil']);
  assert.deepEqual((await resolver.resolveCampusAliases('LAU Jbeil')).map(c=>c.slug),['lau-jbeil']);
  assert.equal((await resolver.resolveCampusAliases('USJ')).length,9);
  assert.equal((await resolver.resolveCampusAliases('الجامعة الأمريكية في بيروت')).length,1);
  await client`UPDATE universities SET active=false WHERE slug='lau-jbeil'`;
  assert.deepEqual((await resolver.resolveCampusAliases('LAU')).map(c=>c.slug),['lau-beirut']);
  await client`UPDATE universities SET active=true WHERE slug='lau-jbeil'`;
});

test('aliases are normalized by the database, including updates and untrusted normalized values',async()=>{
  const [alias]=await client`INSERT INTO search_aliases(location_id,alias,normalized) VALUES ('area:hamra','Hâmrâ test','forged') RETURNING id,normalized`;
  assert.equal(alias.normalized,'hamra test');
  const [updated]=await client`UPDATE search_aliases SET alias='حَمْرَا test',normalized='also forged' WHERE id=${alias.id} RETURNING normalized`;
  assert.equal(updated.normalized,'حمرا test');
  await assert.rejects(client`INSERT INTO search_aliases(location_id,alias,normalized) VALUES ('area:hamra','🦄','forged')`,e=>e.code==='23514');
  await client`DELETE FROM search_aliases WHERE id=${alias.id}`;
});

test('generated aliases follow source edits while curated aliases survive',async()=>{
  const [row]=await client`INSERT INTO search_aliases(place_id,alias,normalized) VALUES (${place.id},'Friendly home','') RETURNING id`;
  await client`UPDATE places SET building_name='New Bliss House' WHERE id=${place.id}`;
  const aliases=await client`SELECT alias FROM search_aliases WHERE place_id=${place.id}`;
  assert.ok(!aliases.some(a=>a.alias==='Bliss House'));
  assert.ok(aliases.some(a=>a.alias==='New Bliss House — الحمرا'));
  assert.ok(aliases.some(a=>a.alias==='Friendly home'));
  await client`UPDATE institutions SET short_name='AUB TEST' WHERE slug='aub'`;
  assert.equal((await resolver.resolveCampusAliases('AUB TEST')).length,1);
  await client`UPDATE institutions SET short_name='AUB' WHERE slug='aub'`;
  await client`DELETE FROM search_aliases WHERE id=${row.id}`;
});

test('duplicate aliases are explicit ambiguities and city context disambiguates',async()=>{
  await client`INSERT INTO search_aliases(location_id,alias,normalized) VALUES ('area:hamra','shared name',''),('area:dekwaneh','shared name','')`;
  await assert.rejects(resolver.resolveAreaFilters(['shared name']),e=>e.code==='AMBIGUOUS_SEARCH_LOCATION' && e.details[0].candidates.length===2);
  await assert.rejects(resolver.resolveQuery('shared name'),e=>e.code==='AMBIGUOUS_SEARCH_LOCATION');
  assert.deepEqual((await resolver.resolveAreaFilters(['shared name'],'city:beirut')).canonicalAreas,['Hamra']);
  await client`DELETE FROM search_aliases WHERE alias='shared name'`;
});

test('database constraints prevent areas under areas, orphan aliases, malformed coordinates and recent types',async()=>{
  await assert.rejects(client`UPDATE search_locations SET parent_city_id='area:hamra' WHERE id='area:dekwaneh'`,e=>e.code==='23503');
  await assert.rejects(client`UPDATE search_locations SET lat=100,lng=35 WHERE id='area:hamra'`,e=>e.code==='23514');
  await assert.rejects(client`UPDATE search_locations SET parent_city_id=NULL WHERE id='area:hamra'`,e=>e.code==='23514');
  await assert.rejects(client`INSERT INTO search_aliases(alias,normalized) VALUES ('hello','')`,e=>e.code==='23514');
  await assert.rejects(client`INSERT INTO search_aliases(location_id,place_id,alias,normalized) VALUES ('area:hamra',${place.id},'hello','')`,e=>e.code==='23514');
  await assert.rejects(client`INSERT INTO user_search_recents(user_id,entity_type,entity_id) VALUES (${owner.id},'listing','x')`,e=>e.code==='23514');
  await client`INSERT INTO user_search_recents(user_id,entity_type,entity_id) VALUES (${owner.id},'city','city:beirut')`;
});

test('seed is idempotent, preserves curated aliases and reports unrecognized data',async()=>{
  await client`INSERT INTO search_aliases(location_id,alias,normalized) VALUES ('area:hamra','my custom alias','')`;
  const snapshot=async()=>JSON.stringify(await client`SELECT id,target_key,alias,normalized,source FROM search_aliases ORDER BY id`);
  const before=await snapshot(); await executor.transaction(tx=>seedSearchCatalog(tx)); assert.equal(await snapshot(),before);
  const [unknown]=await client`INSERT INTO places(owner_id,area,electricity,water) VALUES (${owner.id},'Unknown area','solar','state_well_24_7') RETURNING id`;
  const report=await executor.transaction(tx=>seedSearchCatalog(tx));
  assert.deepEqual(report.unmappedPlaces,[{area:'Unknown area',count:1}]);
  const [row]=await client`SELECT city FROM places WHERE id=${unknown.id}`; assert.equal(row.city,null);
});

test('inactive locations and cities do not resolve, and input is bounded/parameterized',async()=>{
  await client`UPDATE search_locations SET active=false WHERE id='city:beirut'`;
  await assert.rejects(resolver.resolveAreaFilters(['Hamra']),e=>e.code==='UNKNOWN_SEARCH_AREA');
  await client`UPDATE search_locations SET active=true WHERE id='city:beirut'`;
  await assert.rejects(resolver.resolveQuery('a '.repeat(100)),e=>e.code==='INVALID_SEARCH_QUERY');
  const attack=await resolver.resolveQuery("'; DROP TABLE places; --"); assert.equal(attack.canonicalAreas,null);
  const [table]=await client`SELECT to_regclass('places')::text name`; assert.equal(table.name,'places');
});

test('additive migration can be reapplied without changing rows or curated aliases',async()=>{
  const snapshot=async()=>JSON.stringify(await client`SELECT id,target_key,alias,normalized,source FROM search_aliases ORDER BY id`);
  const before=await snapshot();
  for(const part of migration.split('--> statement-breakpoint')) await client.unsafe(part);
  assert.equal(await snapshot(),before);
  assert.deepEqual((await resolver.resolveAreaFilters(['7amra'])).canonicalAreas,['Hamra']);
});

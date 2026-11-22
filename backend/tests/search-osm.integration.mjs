// OSM streets and neighbourhoods: real Postgres + HTTP on a uniquely named disposable loopback database only.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { exposeCurrentRuntimeView } from './current-runtime-view.mjs';
import { exposeSearchRuntime } from './search-runtime.mjs';
import { institutionSeeds } from '../dist/db/seeds/universities.js';
import { seedSearchCatalog } from '../dist/db/seeds/seed-search-catalog.js';
import { seedOsmLocations, OsmImportError } from '../dist/db/seeds/seed-osm-locations.js';

const target=new URL(process.env.DATABASE_URL);
if(!['localhost','127.0.0.1','[::1]'].includes(target.hostname)) throw new Error('Loopback required');
const name='studently_osm_test_'+randomUUID().replaceAll('-','');
const admin=postgres(target.toString(),{max:1,onnotice:()=>{}});
let client,server,created=false,passed=0;
const check=async(name,fn)=>{await fn();passed++;console.log('PASS '+name);};

const line=(...points)=>({type:'MultiLineString',coordinates:[points]});
const street=(slug,nameEn,nameAr,parentAreaId,cityId,points,aliases=[])=>({id:'street:'+slug,slug,parentAreaId,cityId,multiArea:false,nameEn,nameAr,
  aliases,osmIds:['w'+slug.length],centroid:{lng:points[0][0],lat:points[0][1]},geom:line(...points)});
const seed={
  streets:[
    street('bliss-street-beirut','Bliss Street','شارع بليس','area:hamra','city:beirut',[[35.4790,33.8998],[35.4860,33.8998]],
      [{alias:'Rue Bliss',language:'fr',source:'osm'}]),
    street('hamra-street-beirut','Hamra Street','شارع الحمرا','area:hamra','city:beirut',[[35.4790,33.8960],[35.4870,33.8960]]),
    street('main-street-beirut','Main Street','الشارع الرئيسي','area:achrafieh','city:beirut',[[35.5170,33.8880],[35.5210,33.8880]]),
    street('main-street-zahle','Main Street','الشارع الرئيسي','area:zahle','city:zahle',[[35.8990,33.8460],[35.9050,33.8460]]),
    street('rue-sassine-beirut','Rue Sassine','شارع ساسين','area:achrafieh','city:beirut',[[35.5200,33.8870],[35.5230,33.8860]],
      [{alias:'Sassine',language:'en',source:'curated'}]),
    ...['One','Two','Three','Four','Five'].map((n,i)=>street('cedar-'+n.toLowerCase()+'-beirut','Cedar '+n,'سيدار '+(i+1),'area:hamra','city:beirut',
      [[35.4800+i*0.001,33.8970],[35.4805+i*0.001,33.8975]])),
    // A close misspelling of a street name: only reachable through the fuzzy tier of "mar elias".
    street('mar-elyas-beirut','Mar Elyas','مار الياس','area:ras-beirut','city:beirut',[[35.4880,33.8930],[35.4890,33.8932]]),
    // Arabic only: label is the Arabic name and the id comes from the OSM way, never a transliteration.
    street('zahle-osm-12345','طلعة الحمّار','طلعة الحمّار','area:zahle','city:zahle',[[35.8960,33.8440],[35.8970,33.8445]]),
  ],
  hoods:[
    {id:'hood:monot',slug:'monot',parentAreaId:'area:achrafieh',nameEn:'Monot',nameAr:'مونو',aliases:[{alias:'Rue Monot',language:'fr',source:'osm'}],
      osmIds:['n1'],lat:33.8925,lng:35.5155},
    {id:'hood:adliyeh',slug:'adliyeh',parentAreaId:'area:achrafieh',nameEn:'Adliyeh',nameAr:'العدلية',aliases:[{alias:'Palais de Justice',language:'fr',source:'curated'}],
      osmIds:['n2'],lat:33.8905,lng:35.5120},
  ],
  aliasAdds:[{targetId:'area:verdun',alias:'فيردان',language:'ar'}],
};
const STREETS=seed.streets.length,HOODS=seed.hoods.length;
const manualState=async()=>(await client`SELECT
  (SELECT md5(string_agg(to_jsonb(l)::text,'|' ORDER BY l.id)) FROM search_locations l WHERE l.source='manual') AS locations,
  (SELECT md5(string_agg(concat_ws(':',a.target_key,a.alias,a.normalized,a.language,a.source),'|' ORDER BY a.target_key,a.alias,a.source))
     FROM search_aliases a WHERE a.source<>'osm' AND a.location_id NOT LIKE 'street:%' AND a.location_id NOT LIKE 'hood:%') AS aliases`)[0];

try {
  await admin.unsafe('CREATE DATABASE "'+name+'"'); created=true;
  target.pathname='/'+name; process.env.DATABASE_URL=target.toString();
  client=postgres(target.toString(),{max:1,onnotice:()=>{}});
  await client.unsafe('CREATE SCHEMA drizzle; CREATE TABLE drizzle.__drizzle_migrations(id serial primary key,hash text not null,created_at bigint)');
  const journal=JSON.parse(await readFile(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8'));
  for(const entry of journal.entries.filter(e=>e.idx<38)) {
    const body=await readFile(new URL('../drizzle/'+entry.tag+'.sql',import.meta.url),'utf8');
    for(const part of body.split('--> statement-breakpoint')) await client.unsafe(part);
    await client`INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES (${entry.tag},${entry.when})`;
  }
  await exposeCurrentRuntimeView(client);
  await exposeSearchRuntime(client);
  for(const inst of institutionSeeds) {
    const [parent]=await client`INSERT INTO institutions(name,short_name,slug) VALUES (${inst.name},${inst.shortName},${inst.slug}) RETURNING id`;
    for(const campus of inst.campuses) await client`INSERT INTO universities(institution_id,name,slug,city,is_main,location)
      VALUES (${parent.id},${campus.name},${campus.slug},${campus.city},${Boolean(campus.isMain)},ST_GeogFromText(${campus.location}))`;
  }
  await drizzle(client).transaction(tx=>seedSearchCatalog(tx));
  const [owner]=await client`INSERT INTO users(role) VALUES ('poster') RETURNING id`;
  async function fixture(area,building,lng,lat) {
    const [place]=await client`INSERT INTO places(owner_id,area,building_name,location,electricity,water)
      VALUES (${owner.id},${area},${building},ST_SetSRID(ST_MakePoint(${lng},${lat}),4326)::geography,'solar','state_well_24_7') RETURNING id`;
    const [unit]=await client`INSERT INTO listings(poster_id,place_id,unit_type,gender_rule,space_type,property_type,status,availability,monthly_rent_usd,title,expires_at)
      VALUES (${owner.id},${place.id},'private_room','any','private_room','apartment','active','available',400,'Bright studio',now()+interval '30 days') RETURNING id`;
    return {...place,unitId:unit.id};
  }
  // ~130 m from Bliss Street, ~555 m from Hamra Street.
  const nearBliss=await fixture('Hamra','Bliss Corner',35.4830,33.9010);
  // Hamra, but more than 400 m from both Hamra streets.
  const farHamra=await fixture('Hamra','Far Hamra',35.4830,33.8900);
  // ~600 m from Zahle's Main Street: inside Zahle's 800 m radius, outside 400 m.
  const zahle=await fixture('Zahle','Zahle House',35.9020,33.8514);
  // ~55 m from Beirut's Main Street.
  const achrafieh=await fixture('Achrafieh','Sassine Flat',35.5190,33.8885);

  const manualBefore=await manualState();
  const firstImport=await drizzle(client).transaction(tx=>seedOsmLocations(tx,seed));

  const {searchRouter}=await import('../dist/modules/search/search.routes.js');
  const {listingsController}=await import('../dist/modules/listings/listings.controller.js');
  const {errorHandler}=await import('../dist/middleware/error-handler.js');
  const {searchRecentsService}=await import('../dist/modules/search/search-recents.service.js');
  const {default:express}=await import('express');
  const app=express();app.use(express.json());app.use('/api/search',searchRouter);
  app.get('/api/listings',(req,res,next)=>listingsController.list(req,res,next)); app.use(errorHandler);
  server=app.listen(0,'127.0.0.1'); await once(server,'listening');
  const base='http://127.0.0.1:'+server.address().port;
  const suggest=async(q,limit=10)=>(await (await fetch(base+'/api/search/suggest?'+new URLSearchParams({q,limit:String(limit)}))).json()).data;
  const browseRaw=params=>fetch(base+'/api/listings?'+new URLSearchParams(params));
  const browse=async(params)=>{const response=await browseRaw(params);assert.equal(response.status,200,JSON.stringify(params));return response.json();};
  const ids=r=>new Set([...r.data,...r.featured].map(x=>x.id));
  const streetsOf=r=>r.results.filter(x=>x.type==='street');

  await check('normalize is immutable and folds Arabic, accents and generic street words without stripping "st"',async()=>{
    assert.equal((await client`SELECT provolatile FROM pg_proc WHERE proname='search_normalize'`)[0].provolatile,'i');
    for(const [input,expected] of [['الحمراء','الحمرا'],['Rue Bliss','bliss'],['شارع بليس','بليس'],['St. Joseph','st joseph'],['Street','street'],
      ['أحمد','احمد'],['مدرسة','مدرسه'],['مستشفى','مستشفي'],['بـيـروت','بيروت'],['حَمْرَا','حمرا'],['Achrafiéh','achrafieh'],
      ['Avenue Charles Helou','charles helou'],['Main Street','main'],['Beirut Rd','beirut']]) {
      assert.equal((await client`SELECT search_normalize(${input}) AS n`)[0].n,expected,input);
    }
    const stale=await client`SELECT count(*)::int AS n FROM search_aliases WHERE normalized IS DISTINCT FROM search_normalize(alias)`;
    assert.equal(stale[0].n,0);
  });
  await check('importer inserts only OSM rows under curated parents, inherits the area radius and leaves manual rows untouched',async()=>{
    assert.deepEqual(firstImport.locations,[{kind:'hood',count:HOODS},{kind:'street',count:STREETS}]);
    assert.equal(firstImport.inserted,STREETS+HOODS);assert.equal(firstImport.updated,0);assert.deepEqual(firstImport.deleted,[]);
    assert.deepEqual(await manualState(),manualBefore);
    const rows=await client`SELECT s.id,s.radius_m,s.parent_city_id,a.radius_m AS parent_radius FROM search_locations s
      JOIN search_locations a ON a.id=s.parent_area_id WHERE s.source='osm' ORDER BY s.id`;
    assert.equal(rows.length,STREETS+HOODS);assert.ok(rows.every(r=>r.radius_m===r.parent_radius));
    assert.equal(rows.find(r=>r.id==='street:bliss-street-beirut').radius_m,400);
    assert.equal(rows.find(r=>r.id==='street:main-street-zahle').radius_m,800);
    assert.equal(rows.find(r=>r.id==='hood:monot').parent_city_id,'city:beirut');
    const areaRadii=await client`SELECT id,radius_m FROM search_locations WHERE kind='area' AND id IN ('area:hamra','area:badaro','area:zahle','area:dekwaneh')`;
    assert.deepEqual(Object.fromEntries(areaRadii.map(r=>[r.id,r.radius_m])),{'area:hamra':400,'area:badaro':400,'area:zahle':800,'area:dekwaneh':800});
  });
  await check('re-import is idempotent and stale OSM rows are removed without touching manual rows',async()=>{
    const again=await drizzle(client).transaction(tx=>seedOsmLocations(tx,seed));
    assert.equal(again.inserted,0);assert.equal(again.updated,0);assert.deepEqual(again.deleted,[]);assert.equal(again.aliasesAdded,0);assert.equal(again.aliasesRemoved,0);
    const fewer={...seed,streets:seed.streets.filter(s=>s.id!=='street:cedar-five-beirut')};
    const pruned=await drizzle(client).transaction(tx=>seedOsmLocations(tx,fewer));
    assert.deepEqual(pruned.deleted,['street:cedar-five-beirut']);
    assert.equal((await client`SELECT count(*)::int AS n FROM search_aliases WHERE location_id='street:cedar-five-beirut'`)[0].n,0);
    await drizzle(client).transaction(tx=>seedOsmLocations(tx,seed));
    assert.deepEqual(await manualState(),manualBefore);
  });
  await check('importer aborts on manual collisions, orphans, cross-city parents and missing alias targets',async()=>{
    await client`INSERT INTO search_locations(id,kind,slug,name_en,name_ar,district_en,district_ar,parent_city_id,parent_area_id,lat,lng,geom,radius_m,source)
      VALUES ('street:manual-lane','street','manual-lane','Manual Lane','زاروب يدوي','Beirut','بيروت','city:beirut','area:hamra',33.898,35.481,
        ST_Multi(ST_GeomFromText('LINESTRING(35.481 33.898,35.482 33.898)',4326))::geography,400,'manual')`;
    const manualLane=await client`SELECT to_jsonb(l)::text AS row FROM search_locations l WHERE id='street:manual-lane'`;
    const attempts=[
      [{...seed,streets:[...seed.streets,{...seed.streets[0],id:'street:manual-lane',slug:'manual-lane'}]},/collide with manual/],
      [{...seed,streets:[...seed.streets,{...seed.streets[0],id:'street:other-lane',slug:'manual-lane'}]},/collide with manual/],
      [{...seed,streets:[...seed.streets,{...seed.streets[0],id:'street:orphan',slug:'orphan',parentAreaId:'area:nowhere'}]},/curated parent/],
      [{...seed,streets:[...seed.streets,{...seed.streets[0],id:'street:wrong-city',slug:'wrong-city',cityId:'city:zahle'}]},/curated parent/],
      [{...seed,aliasAdds:[{targetId:'area:nowhere',alias:'x',language:'en'}]},/Alias targets/],
      [{...seed,streets:[...seed.streets,{...seed.streets[0],id:'area:hamra'}]},/Malformed/],
      [{...seed,streets:[...seed.streets,seed.streets[0]]},/Duplicate/],
    ];
    for(const [bad,pattern] of attempts) {
      await assert.rejects(drizzle(client).transaction(tx=>seedOsmLocations(tx,bad)),e=>e instanceof OsmImportError&&pattern.test(e.message));
    }
    assert.deepEqual(await client`SELECT to_jsonb(l)::text AS row FROM search_locations l WHERE id='street:manual-lane'`,manualLane);
    assert.equal((await client`SELECT count(*)::int AS n FROM search_locations WHERE source='osm'`)[0].n,STREETS+HOODS);
    await client`DELETE FROM search_locations WHERE id='street:manual-lane'`;
  });
  await check('Bliss, شارع بليس and Rue Bliss all find Bliss Street with its area, city and nearby count',async()=>{
    for(const q of ['Bliss','bliss street','شارع بليس','بليس','Rue Bliss']) {
      const hit=streetsOf(await suggest(q)).find(x=>x.id==='street:bliss-street-beirut');assert.ok(hit,q);
      assert.equal(hit.label.en,'Bliss Street');assert.equal(hit.label.ar,'شارع بليس');
      assert.equal(hit.context.en,'Hamra, Beirut');assert.ok(hit.context.ar.includes('بيروت'));
      assert.equal(hit.canonicalArea,'Hamra');assert.equal(hit.parentAreaId,'area:hamra');assert.equal(hit.nearbyRadiusMeters,400);
      assert.equal(hit.eligibleUnitCount,1);assert.equal(hit.fallback,null);
      const url=new URL(hit.url,base);
      assert.deepEqual(Object.fromEntries(url.searchParams),{locationId:'street:bliss-street-beirut',kind:'street',radiusKm:'0.4'});
    }
  });
  await check('Hamra and Hamra Street put the area first; الحمراء resolves to the area',async()=>{
    for(const q of ['Hamra','hamra street','Hamra Street','الحمراء','شارع الحمرا']) {
      const r=await suggest(q);assert.equal(r.results[0].id,'area:hamra',q);
      assert.ok(r.results.findIndex(x=>x.id==='street:hamra-street-beirut')>0,q);
    }
    assert.equal((await suggest('طريق الجديدة')).results[0].id,'area:tariq-el-jdide');
  });
  await check('"st joseph" still finds the USJ campuses first',async()=>{
    const r=await suggest('st joseph');assert.equal(r.results[0].type,'campus');assert.match(r.results[0].label.en,/^USJ/);
  });
  await check('a street name shared by two towns stays two entries with their own context and radius',async()=>{
    const mains=streetsOf(await suggest('main street')).filter(x=>x.label.en==='Main Street');
    assert.deepEqual(mains.map(x=>x.id).sort(),['street:main-street-beirut','street:main-street-zahle']);
    const beirut=mains.find(x=>x.id==='street:main-street-beirut'),zahleStreet=mains.find(x=>x.id==='street:main-street-zahle');
    assert.equal(beirut.context.en,'Achrafieh, Beirut');assert.equal(zahleStreet.context.en,'Zahle');
    assert.equal(beirut.nearbyRadiusMeters,400);assert.equal(zahleStreet.nearbyRadiusMeters,800);
    assert.equal(beirut.eligibleUnitCount,1);assert.equal(zahleStreet.eligibleUnitCount,1);
    assert.match(zahleStreet.url,/radiusKm=0\.8$/);
  });
  await check('streets need three characters and at most three streets are listed',async()=>{
    for(const q of ['bl','ce','بل']) assert.deepEqual(streetsOf(await suggest(q)),[],q);
    assert.ok(streetsOf(await suggest('bli')).some(x=>x.id==='street:bliss-street-beirut'));
    for(const q of ['cedar','ced']) {const s=streetsOf(await suggest(q,20));assert.equal(s.length,3,q);assert.ok(s.every(x=>x.label.en.startsWith('Cedar')));}
    const defaults=await suggest('',20);
    assert.ok([...defaults.sections.topAreas,...defaults.sections.topCampuses].every(x=>!['street','hood'].includes(x.type)));
  });
  await check('neighbourhoods and curated street aliases are suggested under their parent area',async()=>{
    const monot=(await suggest('monot')).results[0];
    assert.equal(monot.id,'hood:monot');assert.equal(monot.type,'hood');assert.equal(monot.context.en,'Achrafieh, Beirut');
    assert.match(monot.url,/locationId=hood%3Amonot&kind=hood&radiusKm=0\.4$/);
    assert.ok((await suggest('sassine')).results.some(x=>x.id==='street:rue-sassine-beirut'));
    assert.equal((await suggest('فيردان')).results[0].id,'area:verdun');
    // A curated alias on a hood finds the hood (Badaro's "Palais de Justice" is Adliyeh).
    const adliyeh=(await suggest('palais de justice')).results[0];assert.equal(adliyeh.id,'hood:adliyeh');assert.equal(adliyeh.label.en,'Adliyeh');
  });
  await check('"mar elias" ranks the Mar Elyas street above Antelias; exact and prefix matches keep the kind order',async()=>{
    // Fuzzy tier only: similarity first, then kind. Antelias (area) is a looser trigram match than the street.
    const fuzzy=(await suggest('mar elias')).results.map(x=>x.id);
    const antelias=['city:antelias','area:antelias'].filter(id=>fuzzy.includes(id));
    assert.ok(antelias.length,'Antelias must be a fuzzy candidate or this test proves nothing');
    assert.ok(fuzzy.includes('street:mar-elyas-beirut'));
    for(const id of antelias) assert.ok(fuzzy.indexOf('street:mar-elyas-beirut')<fuzzy.indexOf(id),id);
    // Prefix tier: kind order stays area > street even though the street is a prefix match too.
    for(const q of ['ham','hamr']) {
      const prefix=(await suggest(q)).results.map(x=>x.id);
      assert.ok(prefix.indexOf('area:hamra')>=0&&prefix.indexOf('area:hamra')<prefix.indexOf('street:hamra-street-beirut'),q);
    }
    // Exact tier: the area and the neighbourhood still lead the street of the same name.
    const exact=(await suggest('adliyeh')).results.map(x=>x.id);assert.equal(exact[0],'hood:adliyeh');
  });
  await check('Arabic-only streets show the Arabic name and carry the OSM way id in their slug',async()=>{
    for(const q of ['طلعة الحمار','طلعة الحمّار','طلعه الحمار']) {
      const hit=streetsOf(await suggest(q)).find(x=>x.id==='street:zahle-osm-12345');assert.ok(hit,q);
      assert.equal(hit.label.en,'طلعة الحمّار');assert.equal(hit.label.ar,'طلعة الحمّار');assert.equal(hit.context.en,'Zahle');assert.equal(hit.slug,'zahle-osm-12345');
    }
  });
  await check('the reviewed seed contains exactly the approved decisions',async()=>{
    const reviewed=JSON.parse(await readFile(new URL('../src/db/seeds/osm/streets.seed.json',import.meta.url),'utf8'));
    const decisions=JSON.parse(await readFile(new URL('../ops/osm/decisions.json',import.meta.url),'utf8'));
    assert.deepEqual(reviewed.hoods.map(h=>h.id).sort(),[...decisions.approvedHoods].sort());
    assert.equal(reviewed.hoods.length,18);
    for(const id of ['hood:palais-de-justice','hood:american-university','hood:park']) assert.ok(!reviewed.hoods.some(h=>h.id===id),id);
    assert.ok(reviewed.hoods.find(h=>h.id==='hood:adliyeh').aliases.some(a=>a.alias==='Palais de Justice'&&a.source==='curated'));
    assert.ok(!reviewed.streets.some(s=>s.id==='street:monot-achrafieh'));
    assert.ok(reviewed.streets.find(s=>s.id==='street:rue-sassine-achrafieh').aliases.some(a=>a.alias==='Sassine'));
    assert.deepEqual(reviewed.aliasAdds.map(a=>[a.targetId,a.alias]).sort(),[['area:gemmayzeh','جميزة'],['area:mar-mikhael','Mar Mkhayel'],['area:verdun','فيردان']]);
    assert.ok(reviewed.streets.every(s=>/^street:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.id)&&!s.flags.includes('numbered-only')));
    assert.ok(reviewed.streets.filter(s=>s.flags.includes('no-latin-name')).every(s=>/^street:[a-z0-9]+(?:-[a-z0-9]+)*-osm-\d+$/.test(s.id)));
    assert.ok(reviewed.streets.filter(s=>!s.flags.includes('no-latin-name')).every(s=>!/-osm-\d+$/.test(s.id)));
    // A town's streets sit inside its curated area and share the area's radius.
    assert.equal(reviewed.areaRadiusM['area:jounieh'],800);assert.equal(reviewed.areaRadiusM['area:hamra'],400);
  });
  await check('street browse uses the area radius, clamps larger radii and agrees with the suggestion count',async()=>{
    let r=await browse({locationId:'street:bliss-street-beirut',kind:'street',radiusKm:'0.4'});
    assert.deepEqual([...ids(r)],[nearBliss.unitId]);assert.equal(r.pagination.totalMatching,1);
    const n=r.searchResolution.nearby;
    assert.equal(n.id,'street:bliss-street-beirut');assert.equal(n.label.en,'Bliss Street');assert.equal(n.canonicalArea,'Hamra');
    assert.equal(n.radiusMeters,400);assert.equal(n.appliedRadiusMeters,400);assert.equal(n.count,1);assert.equal(n.fallback,null);
    assert.equal((await browse({locationId:'street:bliss-street-beirut',kind:'street',radiusKm:'5'})).searchResolution.nearby.appliedRadiusMeters,400);
    assert.equal((await browse({locationId:'street:bliss-street-beirut',kind:'street'})).searchResolution.nearby.appliedRadiusMeters,400);
    r=await browse({locationId:'street:main-street-zahle',kind:'street',radiusKm:'0.8'});
    assert.deepEqual([...ids(r)],[zahle.unitId]);assert.equal(r.searchResolution.nearby.appliedRadiusMeters,800);
    r=await browse({locationId:'street:main-street-beirut',kind:'street',radiusKm:'0.4'});
    assert.deepEqual([...ids(r)],[achrafieh.unitId]);
    for(const q of ['Bliss','main street','monot','hamra street']) for(const item of (await suggest(q)).results.filter(x=>['street','hood'].includes(x.type))) {
      const result=await browse(Object.fromEntries(new URL(item.url,base).searchParams));
      assert.equal(result.pagination.totalMatching,item.fallback?item.fallback.count:item.eligibleUnitCount,item.id);
    }
  });
  await check('zero nearby results fall back to the parent area, including unpinned units',async()=>{
    const hamraStreet=streetsOf(await suggest('hamra street')).find(x=>x.id==='street:hamra-street-beirut');
    assert.equal(hamraStreet.eligibleUnitCount,0);assert.deepEqual(hamraStreet.fallback,{canonicalArea:'Hamra',label:{en:'Hamra',ar:hamraStreet.fallback.label.ar},count:2});
    let r=await browse({locationId:'street:hamra-street-beirut',kind:'street',radiusKm:'0.4'});
    assert.deepEqual(new Set(ids(r)),new Set([nearBliss.unitId,farHamra.unitId]));
    assert.equal(r.searchResolution.nearby.count,0);assert.deepEqual(r.searchResolution.nearby.fallback,{canonicalArea:'Hamra',label:hamraStreet.fallback.label,count:2});
    r=await browse({locationId:'street:bliss-street-beirut',kind:'street',radiusKm:'0.1'});
    assert.equal(r.searchResolution.nearby.appliedRadiusMeters,100);assert.equal(r.searchResolution.nearby.fallback.count,2);
    r=await browse({locationId:'street:main-street-zahle',kind:'street',radiusKm:'0.4'});
    assert.equal(r.searchResolution.nearby.count,0);assert.equal(r.searchResolution.nearby.fallback.canonicalArea,'Zahle');assert.deepEqual([...ids(r)],[zahle.unitId]);
    const unpinned=await fixture('Hamra','Unpinned',35.4830,33.8900);
    await client`UPDATE places SET location=NULL WHERE id=${unpinned.id}`;
    r=await browse({locationId:'street:hamra-street-beirut',kind:'street'});
    assert.ok(ids(r).has(unpinned.unitId));assert.equal(r.searchResolution.nearby.fallback.count,3);
    await client`UPDATE listings SET status='archived' WHERE id=${unpinned.unitId}`;
    r=await browse({locationId:'hood:monot',kind:'hood'});
    assert.equal(r.searchResolution.nearby.kind,'hood');assert.equal(r.searchResolution.nearby.fallback.canonicalArea,'Achrafieh');
  });
  await check('free text never resolves to a street, and invalid street parameters are rejected',async()=>{
    for(const q of ['Hamra Street','Bliss Street','monot']) {
      const r=await browse({q});assert.ok((r.searchResolution.locations??[]).every(x=>['city','area'].includes(x.kind)),q);
    }
    assert.deepEqual((await browse({q:'Hamra Street'})).searchResolution.canonicalAreas,['Hamra']);
    for(const params of [{kind:'street'},{locationId:'street:bliss-street-beirut'},{locationId:'street:bliss-street-beirut',kind:'hood'},
      {locationId:'area:hamra',kind:'street'},{locationId:'street:../x',kind:'street'},{locationId:'street:bliss-street-beirut',kind:'street',lat:'33.9',lng:'35.48'}]) {
      assert.equal((await browseRaw(params)).status,400,JSON.stringify(params));
    }
    assert.equal((await browseRaw({locationId:'street:no-such-street',kind:'street'})).status,404);
  });
  await check('recent streets keep their identity and nearby URL',async()=>{
    await searchRecentsService.remember(owner.id,{type:'street',id:'street:bliss-street-beirut'});
    await searchRecentsService.remember(owner.id,{type:'hood',id:'hood:monot'});
    const rows=await searchRecentsService.list(owner.id);
    assert.deepEqual(rows.slice(0,2).map(x=>[x.type,x.id]),[['hood','hood:monot'],['street','street:bliss-street-beirut']]);
    assert.equal(rows[1].url,'/search?locationId=street%3Abliss-street-beirut&kind=street&radiusKm=0.4');assert.equal(rows[1].context.en,'Hamra, Beirut');
    await assert.rejects(searchRecentsService.remember(owner.id,{type:'street',id:'street:no-such-street'}));
  });
  console.log('OSM scenarios passed: '+passed);
} catch(error) {console.error(error);process.exitCode=1;}
finally {
  if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  if(client)await client.end();
  if(created)await admin.unsafe('DROP DATABASE IF EXISTS "'+name+'" WITH (FORCE)');
  await admin.end();
}
process.exit(process.exitCode??0);

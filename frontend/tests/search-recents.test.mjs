import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from '../../backend/node_modules/esbuild/lib/main.js';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const bundle=await build({entryPoints:[path.join(root,'features/search/recentSearches.ts')],bundle:true,write:false,format:'esm',platform:'node'});
const {parseRecentSearches,prependRecent}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
const area=(slug='hamra')=>({id:'area:'+slug,type:'area',slug,label:{en:slug,ar:'Arabic'},context:{en:'Beirut',ar:'Arabic context'},canonicalArea:slug,center:null,url:'https://untrusted.test'});
const raw=items=>JSON.stringify({version:1,items});
test('guest records are capped, deduplicated, ordered by selection and never navigate to stored URLs',()=>{
 let rows=[];for(let n=0;n<12;n++)rows=prependRecent(rows,area('test-'+n));
 assert.equal(rows.length,8);assert.equal(rows[0].id,'area:test-11');
 rows=prependRecent(rows,rows[7]);assert.equal(rows[0].id,'area:test-4');assert.equal(rows.length,8);
 const parsed=parseRecentSearches(raw([area(),area()]));assert.equal(parsed.length,1);
 assert.equal(parsed[0].url,'/search?areas=hamra');
});
test('corrupt storage, forged identities and malformed Arabic labels fail safely',()=>{
 for(const raw of [null,'bad','{}','[]',JSON.stringify({version:2,items:[area()]})])assert.deepEqual(parseRecentSearches(raw),[]);
 for(const row of [{...area(),id:'city:hamra'},{...area(),type:'query'},{...area(),slug:'../evil'},
  {...area(),label:{en:'Hamra',ar:null}},{...area(),type:'place',id:'bad'}])assert.deepEqual(parseRecentSearches(raw([row])),[]);
});
test('city, area, campus and property keep separate identities and canonical filter destinations',()=>{
 const city={...area(),type:'city',id:'city:hamra',canonicalAreas:['Hamra']};
 const campus={...area(),type:'campus',id:'10000000-0000-4000-8000-000000000001',slug:'aub'};
 const place={...area(),type:'place',id:campus.id,canonicalArea:'Hamra'};
 const rows=parseRecentSearches(raw([city,area(),campus,place]));assert.equal(rows.length,4);
 assert.equal(rows[0].url,'/search?city=hamra');assert.match(rows[2].url,/campusId=.*universitySlugs=aub/);
 assert.match(rows[3].url,/placeId=/);
});

test('restart keeps thumbnail, count and campus radius metadata while rejecting unsafe media URLs',()=>{
 const campus={...area(),type:'campus',id:'10000000-0000-4000-8000-000000000001',slug:'aub',nearbyRadiusMeters:2500,eligibleUnitCount:6,thumbnailUrl:'/uploads/cover.jpg'};
 const [restored]=parseRecentSearches(raw([campus]));assert.equal(restored.eligibleUnitCount,6);assert.equal(restored.thumbnailUrl,'/uploads/cover.jpg');assert.equal(restored.nearbyRadiusMeters,2500);assert.match(restored.url,/radiusKm=2.5/);
 const [unsafe]=parseRecentSearches(raw([{...area(),thumbnailUrl:'javascript:alert(1)',eligibleUnitCount:-1}]));assert.equal(unsafe.thumbnailUrl,null);assert.equal(unsafe.eligibleUnitCount,undefined);
});

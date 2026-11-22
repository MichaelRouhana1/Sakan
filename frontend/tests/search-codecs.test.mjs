import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from '../../backend/node_modules/esbuild/lib/main.js';
import path from 'node:path';

const frontend=path.resolve(import.meta.dirname,'..');
const bundle=await build({stdin:{contents:`export * from './features/search/selection'; export * from './features/matcher/browseState'; export * from './lib/browseSearchUrl'; export * from './lib/browseFilters';`,resolveDir:frontend,loader:'ts'},absWorkingDir:frontend,bundle:true,write:false,platform:'node',format:'esm'});
const m=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
const label={en:'Destination',ar:'وجهة'},context={en:'Matn',ar:'المتن'},center={lat:33.89,lng:35.48};
const fixtures=[
  {type:'city',id:'city:dekwaneh',slug:'dekwaneh',canonicalAreas:['Dekwaneh'],url:'/search?city=dekwaneh',label,context,center},
  {type:'area',id:'area:hamra',slug:'hamra',canonicalArea:'Hamra',url:'/search?areas=Hamra',label,context,center},
  {type:'campus',id:'b0c230c1-ad13-41de-a935-3de7bb09f613',slug:'aub',url:'/search?campusId=b0c230c1-ad13-41de-a935-3de7bb09f613&universitySlugs=aub',label,context,center},
  {type:'place',id:'903fce27-063f-420e-8d04-3ea45be377f9',canonicalArea:'Hamra',url:'/search?placeId=903fce27-063f-420e-8d04-3ea45be377f9',label,context,center},
];
test('every typed result has the same destination as its API URL and survives URL round-trip',()=>{
  for(const item of fixtures) {
    const params=m.browseSearchParams(m.searchDestination(item));
    assert.deepEqual(params,Object.fromEntries(new URL(item.url,'https://studently.test').searchParams));
    const state=m.parseBrowseState(params);
    assert.deepEqual(m.parseBrowseState(m.serializeBrowseState(state)),state);
    const api=m.toListFilters(state.mode,state.filters,'newest');
    if(item.type==='city')assert.equal(api.city,item.slug);
    if(item.type==='place')assert.equal(api.placeId,item.id);
    if(item.type==='area')assert.deepEqual(api.areas,['Hamra']);
    if(item.type==='campus')assert.equal(api.campusId,item.id);
  }
});
test('selection clears all previous destinations and matcher location but preserves property filters and preferences',()=>{
  const prefs={version:1,location:{importance:'required',value:{kind:'area',label:'Fanar',areas:['Fanar']}},wifi:{importance:'required',value:true}};
  const old=m.parseBrowseState({q:'old',city:'beirut',placeId:fixtures[3].id,areas:'Fanar',campusId:fixtures[2].id,universitySlugs:'lau',radiusKm:'5',minRentUsd:'200',maxRentUsd:'700',electricity:'solar',water:'tank_delivery',listingTypes:'studio',genderRestrictions:'girls_only',wifiIncluded:'true',studentsOnly:'true',sort:'rent_asc',match:JSON.stringify(prefs)});
  for(const item of fixtures) {
    const next=m.applySearchSelection(old,item),f=next.filters;
    assert.equal(next.sort,'rent_asc');assert.equal(next.prefs.location,undefined);assert.deepEqual(next.prefs.wifi,prefs.wifi);
    for(const key of ['minRentUsd','maxRentUsd','electricity','water','listingTypes','genderRestrictions','wifiIncluded','studentsOnly']) assert.deepEqual(f[key],old.filters[key]);
    assert.equal(f.q,null);assert.equal(f.radiusKm,null);assert.equal(f.institutionSlug,null);
    const active=Object.keys(m.browseSearchParams(f));
    assert.deepEqual(active,Object.keys(m.browseSearchParams(m.searchDestination(item))));
    assert.deepEqual(m.parseBrowseState(m.serializeBrowseState(next)),next);
  }
});
test('unsupported distance and empty matcher sorts reset, supported sorts remain',()=>{
  const old=m.parseBrowseState({areas:'Hamra',sort:'distance'});
  assert.equal(m.applySearchSelection(old,fixtures[3]).sort,'newest');
  assert.equal(m.applySearchSelection(old,fixtures[0]).sort,'distance');
  assert.equal(m.applySearchSelection(old,{...fixtures[0],canonicalAreas:['Hamra','Badaro']}).sort,'newest');
  const locationOnly=m.parseBrowseState({sort:'match',match:JSON.stringify({version:1,location:{importance:'prefer',value:{kind:'area',label:'Hamra',areas:['Hamra']}}})});
  assert.equal(m.applySearchSelection(locationOnly,fixtures[0]).sort,'newest');
  assert.equal(m.applySearchSelection(locationOnly,fixtures[0]).prefs,null);
});
test('free-text, Arabic and clear round-trip without stale destination params',()=>{
  const old=m.parseBrowseState({city:'beirut',placeId:fixtures[3].id,sort:'distance',wifiIncluded:'true'});
  const typed=m.applySearchText(old,'  حمرا هادئة  ');
  assert.equal(typed.filters.q,'حمرا هادئة');assert.equal(typed.filters.city,null);assert.equal(typed.filters.placeId,null);
  assert.equal(typed.sort,'newest');assert.equal(typed.filters.wifiIncluded,true);
  assert.deepEqual(m.parseBrowseState(m.serializeBrowseState(typed)),typed);
  assert.deepEqual(m.browseSearchParams(m.applySearchText(typed,'').filters),{});
  const cleared=m.browseSearchSetParams({city:'fanar'});
  assert.equal(cleared.city,'fanar');assert.equal(cleared.placeId,undefined);assert.equal(cleared.areas,undefined);
});
test('unknown-location recovery preserves text/property filters and non-location matcher answers',()=>{
  const old=m.parseBrowseState({city:'notacity',areas:'xyz',q:'studio',maxRentUsd:'700',wifiIncluded:'true',sort:'rent_asc',
    match:JSON.stringify({version:1,location:{importance:'required',value:{kind:'area',label:'xyz',areas:['xyz']}},wifi:{importance:'required',value:true}})});
  const next=m.clearSearchLocation(old);
  assert.equal(next.filters.city,null);assert.deepEqual(next.filters.areas,[]);assert.equal(next.filters.q,'studio');
  assert.equal(next.filters.maxRentUsd,700);assert.equal(next.filters.wifiIncluded,true);assert.equal(next.sort,'rent_asc');
  assert.equal(next.prefs.location,undefined);assert.deepEqual(next.prefs.wifi,old.prefs.wifi);
});

test('campus nearby count radius survives selection, URL codecs and replacing the location',()=>{
 const item={...fixtures[2],nearbyRadiusMeters:2500,eligibleUnitCount:6};
 const destination=m.searchDestination(item);assert.equal(destination.radiusKm,2.5);
 const params=m.browseSearchParams(destination);assert.equal(params.radiusKm,'2.5');
 const old=m.parseBrowseState({maxRentUsd:'700',wifiIncluded:'true'});
 const selected=m.applySearchSelection(old,item);assert.equal(selected.filters.radiusKm,2.5);assert.equal(selected.filters.maxRentUsd,700);assert.equal(selected.filters.wifiIncluded,true);
 assert.equal(m.parseBrowseState(m.serializeBrowseState(selected)).filters.radiusKm,2.5);
 assert.equal(m.applySearchSelection(selected,fixtures[1]).filters.radiusKm,null);
 assert.equal(m.browseSearchSetParams(m.searchDestination(fixtures[1])).radiusKm,undefined);
});

const street={type:'street',id:'street:bliss-street-beirut',slug:'bliss-street-beirut',canonicalArea:'Hamra',parentAreaId:'area:hamra',
  nearbyRadiusMeters:400,eligibleUnitCount:4,fallback:null,url:'/search?locationId=street%3Abliss-street-beirut&kind=street&radiusKm=0.4',label,context,center};
const hood={...street,type:'hood',id:'hood:monot',slug:'monot',canonicalArea:'Achrafieh',parentAreaId:'area:achrafieh',
  url:'/search?locationId=hood%3Amonot&kind=hood&radiusKm=0.4'};
test('street and neighbourhood destinations match their API URL, keep the area radius and round-trip',()=>{
  for(const item of [street,hood]) {
    const params=m.browseSearchParams(m.searchDestination(item));
    assert.deepEqual(params,Object.fromEntries(new URL(item.url,'https://studently.test').searchParams));
    const state=m.parseBrowseState(params);
    assert.equal(state.filters.locationId,item.id);assert.equal(state.filters.locationKind,item.type);assert.equal(state.filters.radiusKm,0.4);
    assert.deepEqual(m.parseBrowseState(m.serializeBrowseState(state)),state);
    const api=m.toListFilters(state.mode,state.filters,'newest');
    assert.equal(api.locationId,item.id);assert.equal(api.locationKind,item.type);assert.equal(api.radiusKm,0.4);assert.equal(api.areas,undefined);
  }
  assert.equal(m.searchDestination({...street,nearbyRadiusMeters:800}).radiusKm,0.8);
});
test('selecting a street replaces every other destination, and any other selection or text clears the street',()=>{
  const old=m.parseBrowseState({city:'beirut',placeId:fixtures[3].id,areas:'Fanar',campusId:fixtures[2].id,universitySlugs:'lau',maxRentUsd:'700',sort:'distance'});
  const selected=m.applySearchSelection(old,street),f=selected.filters;
  assert.deepEqual(Object.keys(m.browseSearchParams(f)).sort(),['kind','locationId','radiusKm']);assert.equal(f.maxRentUsd,700);
  assert.equal(selected.sort,'distance');assert.equal(selected.mode,'standard');
  for(const next of [m.applySearchSelection(selected,fixtures[1]),m.applySearchSelection(selected,fixtures[3]),m.applySearchText(selected,'quiet')]) {
    assert.equal(next.filters.locationId,null);assert.equal(next.filters.locationKind,null);assert.equal(next.filters.radiusKm,null);
    assert.equal(m.browseSearchParams(next.filters).kind,undefined);
  }
  assert.equal(m.clearSearchLocation(selected).filters.locationId,null);
  const cleared=m.browseSearchSetParams({areas:['Hamra']});assert.equal(cleared.locationId,undefined);assert.equal(cleared.kind,undefined);
});
test('a kind without a location id, or a mismatched kind, never reaches the API',()=>{
  assert.equal(m.parseBrowseState({kind:'street'}).filters.locationKind,null);
  assert.equal(m.toListFilters('standard',m.parseBrowseState({kind:'street'}).filters,'newest').locationKind,undefined);
  assert.equal(m.parseBrowseState({locationId:'street:bliss',kind:'bogus'}).filters.locationId,null);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from '../../backend/node_modules/esbuild/lib/main.js';
import path from 'node:path';
const frontend = path.resolve(import.meta.dirname, '..');
const bundle = await build({ stdin:{ contents:"export * from './lib/mapPinGroups'; export * from './lib/mapClusters'; export * from './features/listings/normalizeListing';",resolveDir:frontend,loader:'ts'},absWorkingDir:frontend,bundle:true,write:false,platform:'node',format:'esm' });
const m = await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
const unit = (id, placeId, extra={}) => m.normalizeListing({id,placeId,lat:33.89,lng:35.48,monthlyRentUsd:500,...extra});
test('one pin per place with full matching unit count, preserving server unit order',()=>{
  const rows = Array.from({length:31},(_,i)=>unit('u'+i,'p',{monthlyRentUsd:500-i}));
  const groups = m.groupListingsByPlace(rows);
  assert.equal(groups.length,1); assert.equal(groups[0].count,31); assert.equal(groups[0].displayPriceUsd,470);
  assert.deepEqual(groups[0].listings.map(l=>l.id),rows.map(l=>l.id));
});
test('coincident places and missing identities never become siblings',()=>{
  const groups = m.groupListingsByPlace([unit('a','p'),unit('b','q'),unit('c'),unit('d')]);
  assert.equal(groups.length,4);
  assert.equal(m.normalizeListing({id:'a',place_id:'p'}).placeId,'p');
});
test('place identity stays stable through matching filters and duplicate inputs',()=>{
  const a=unit('a','p'), b=unit('b','p');
  const full=m.groupListingsByPlace([a,b,b])[0], filtered=m.groupListingsByPlace([b])[0];
  assert.equal(full.count,2); assert.equal(filtered.count,1); assert.equal(full.id,filtered.id);
});
test('density clusters retain separate place leaves and expand at high zoom',()=>{
  const groups=m.groupListingsByPlace([unit('a','p'),unit('b','p'),unit('c','q',{lng:35.4801})]);
  const index=m.buildPinClusterIndex(groups), box=[35,33,36,34];
  const low=m.queryVisibleFeatures(index,box,8);
  assert.equal(low.length,1); assert.equal(low[0].kind,'cluster'); assert.equal(low[0].pointCount,2);
  assert.equal(m.idsInCluster(index,low[0].clusterId).length,2);
  assert.equal(m.queryVisibleFeatures(index,box,18).filter(f=>f.kind==='leaf').length,2);
});

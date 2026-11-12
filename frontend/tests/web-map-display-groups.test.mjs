import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from '../../backend/node_modules/esbuild/lib/main.js';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const result = await build({ stdin: { contents: `
  export { webMapDisplayGroups } from './lib/webMapDisplayGroups.web';
  export { groupListingsByPlace } from './lib/mapPinGroups';
  export { groupsToLayerData } from './lib/webMapLayers.web';
  export { formatClusterListingCount } from './lib/webMapPinImages.web';
`, resolveDir: root, loader: 'ts' }, absWorkingDir: root, bundle: true, write: false, platform: 'node', format: 'esm' });
const { webMapDisplayGroups, groupListingsByPlace, groupsToLayerData, formatClusterListingCount } =
  await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`);
const unit = (id, placeId, posterId, monthlyRentUsd, lng = 35.48, lat = 33.899) =>
  ({ id, placeId, posterId, monthlyRentUsd, lng, lat });
const units = [unit('a3', 'a', 'owner-a', 600), unit('a1', 'a', 'owner-a', 500), unit('a2', 'a', 'owner-a', 400),
  unit('b2', 'b', 'owner-b', 350), unit('b1', 'b', 'owner-b', 300)];

test('3 + 2 at one spot yields one web price pin with five listings and two original owners/places', () => {
  const original = structuredClone(units);
  const places = groupListingsByPlace(units);
  const [display] = webMapDisplayGroups(places);
  assert.equal(display.id, 'coordinate:35.48,33.899');
  assert.equal(display.count, 5);
  assert.equal(display.displayPriceUsd, 300);
  assert.deepEqual(display.placeGroups.map(place => [place.id, place.count, place.listings[0].posterId]),
    [['place:a', 3, 'owner-a'], ['place:b', 2, 'owner-b']]);
  assert.equal(display.placeGroups[0], places[0]);
  assert.equal(display.placeGroups[1], places[1]);
  const data = groupsToLayerData([display]);
  assert.equal(data.features.length, 1);
  assert.equal(data.features[0].properties.label, '$300 · 5');
  assert.equal(data.features[0].properties.memberCount, 5);
  assert.deepEqual(units, original, 'display grouping must not edit listing/place/owner data');
});

test('six-decimal buckets tolerate rounding noise but do not merge adjacent buckets', () => {
  const groups = groupListingsByPlace([
    unit('a', 'a', 'a', 400, 35.4800001), unit('b', 'b', 'b', 300, 35.4800004),
    unit('c', 'c', 'c', 500, 35.4800006),
  ]);
  const display = webMapDisplayGroups(groups);
  assert.equal(display.length, 2);
  assert.equal(display[0].count, 2);
  assert.equal(display[0].lng, 35.48);
  assert.equal(display[1].id, 'place:c');
  assert.equal(display[1].lng, 35.4800006, 'standalone pins retain original coordinates');
  const zero = webMapDisplayGroups(groupListingsByPlace([unit('x', 'x', 'x', 1, -0.0000001), unit('y', 'y', 'y', 2, 0)]));
  assert.equal(zero[0].id, 'coordinate:0,33.899');
  assert.equal(Object.is(zero[0].lng, -0), false);
});

test('composite IDs, representative listings and GL data survive reordered responses', () => {
  const group = webMapDisplayGroups(groupListingsByPlace(units))[0];
  const reordered = webMapDisplayGroups(groupListingsByPlace([...units].reverse()))[0];
  assert.equal(reordered.id, group.id);
  assert.deepEqual(reordered.listings.map(listing => listing.id), group.listings.map(listing => listing.id));
  assert.deepEqual(groupsToLayerData([reordered]), groupsToLayerData([group]));
  const edited = webMapDisplayGroups(groupListingsByPlace(units.map(listing => ({ ...listing, monthlyRentUsd: listing.monthlyRentUsd + 50 }))))[0];
  assert.equal(edited.id, group.id);
  assert.equal(edited.displayPriceUsd, 350);
});

test('same-place grouping and ungrouped single-listing contributions remain intact', () => {
  const places = groupListingsByPlace([units[0], units[1], units[0], unit('legacy', undefined, 'other', 800, 35.49)]);
  const display = webMapDisplayGroups(places);
  assert.equal(display[0].id, 'place:a');
  assert.equal(display[0].count, 2);
  assert.deepEqual(display[0].listings, places[0].listings);
  assert.equal(groupsToLayerData(display).features.find(feature => feature.id === 'unit:legacy').properties.memberCount, 1);
});

test('cluster labels use exact totals below 1000 and readable compact totals above it', () => {
  for (const [count, text] of [[2, '2'], [999, '999'], [1000, '1K'], [1250, '1.3K'], [10000, '10K'], [1000000, '1M']]) {
    assert.equal(formatClusterListingCount(count), text);
  }
});

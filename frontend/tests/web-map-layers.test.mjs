import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from '../../backend/node_modules/esbuild/lib/main.js';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const result = await build({ stdin: { contents: "export { groupsToLayerData } from './lib/webMapLayers.web';", resolveDir: root, loader: 'ts' },
  absWorkingDir: root, bundle: true, write: false, platform: 'node', format: 'esm' });
const { groupsToLayerData } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`);
const group = (id, price, count, lng = 35.48) => ({ id, displayPriceUsd: price, count, lng, lat: 33.899, listings: [] });

test('GL data has one feature per place with stable identity, minimum price and matching-unit count', () => {
  const groups = [group('place:b', 300, 2), group('place:a', 420, 1)];
  const data = groupsToLayerData(groups);
  assert.equal(data.features.length, 2);
  assert.equal(data.features[1].id, 'place:b');
  assert.deepEqual(data.features[1].properties, { groupId: 'place:b', price: 300, memberCount: 2, label: '$300 · 2', image: 'studently-price-image:%24300%20%C2%B7%202', activeImage: 'studently-price-image:highlight:%24300%20%C2%B7%202' });
  assert.deepEqual(data.features[1].geometry.coordinates, [35.48, 33.899]);
  assert.equal(groups[0].id, 'place:b');
  assert.deepEqual(groupsToLayerData([...groups].reverse()), data);
});

test('real price, member-count and coordinate edits reach GL data; preview preserves its count label', () => {
  const initial = groupsToLayerData([group('a', 420, 1)]);
  assert.equal(initial.features[0].properties.label, '$420');
  assert.equal(groupsToLayerData([group('a', 420, 1)], true).features[0].properties.label, '$420 · 1');
  const edited = groupsToLayerData([group('a', 450, 3, 35.49)]);
  assert.equal(edited.features[0].properties.label, '$450 · 3');
  assert.equal(edited.features[0].geometry.coordinates[0], 35.49);
  assert.notEqual(edited.features[0].properties.image, initial.features[0].properties.image);
});

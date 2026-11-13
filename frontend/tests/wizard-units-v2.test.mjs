import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../../backend/node_modules/esbuild/lib/main.js';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const bundle = await build({ stdin: { contents: `export * from './features/listings/create/v2/model';export * from './features/listings/create/v2/examples';`, loader: 'ts', resolveDir: root }, bundle: true, write: false, platform: 'node', format: 'esm' });
const m = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
const origin = 'http://localhost:8082';
const next = s => m.reduceWizard(s, { type: 'next' });
const completed = () => {
  let s = m.exampleWizard('one', origin);
  for (let i = 0; i < 9; i++) s = next(s);
  assert.equal(s.position.screen, 'another');
  return s;
};

test('one unit traverses the five place screens and four unit screens before review', () => {
  let s = m.exampleWizard('one', origin);
  const screens = [];
  for (let i = 0; i < 9; i++) { screens.push(s.position.screen); s = next(s); }
  assert.deepEqual(screens, [...m.PLACE_SCREENS, ...m.UNIT_SCREENS]);
  assert.ok(m.unitComplete(s, s.units[0]));
  s = m.reduceWizard(s, { type: 'review' });
  assert.deepEqual(m.screenErrors(s), []);
  assert.equal(m.reduceWizard(s, { type: 'success' }).position.screen, 'success');
});

test('three units use independent copies, append the suffix, and never copy photos', () => {
  let s = completed();
  for (let i = 2; i <= 3; i++) {
    const source = s.position.unitId;
    s = m.reduceWizard(s, { type: 'add', id: `unit-${i}`, copyFrom: source });
    assert.ok(s.units.at(-1).data.title.endsWith(' (copy)'));
    assert.equal(s.units.at(-1).data.monthlyRentUsd, '650');
    assert.deepEqual(s.units.at(-1).data.photos, []);
    assert.equal(s.units.at(-1).finished, false);
    s = next(s);
    assert.equal(next(s).position.screen, 'photos');
    s = m.reduceWizard(s, { type: 'gallery', id: `unit-${i}`, update: m.examplePhotos(origin, `unit-${i}`) });
    for (let j = 0; j < 3; j++) s = next(s);
    assert.equal(s.position.screen, 'another');
  }
  assert.equal(s.units.length, 3);
  s = m.reduceWizard(s, { type: 'unit', id: 'unit-2', patch: { monthlyRentUsd: '750', title: 'Independent second apartment' } });
  assert.deepEqual(s.units.map(u => u.data.monthlyRentUsd), ['650', '750', '650']);
  assert.equal(s.units[0].data.title, 'Sunny apartment near campus');
  assert.equal(s.units[0].data.photos.length, 3);
  assert.deepEqual(m.screenErrors(m.reduceWizard(s, { type: 'review' })), []);
});

test('copy suffix fits the existing title limit; blank units retain no source values', () => {
  let s = completed();
  s = m.reduceWizard(s, { type: 'unit', id: s.units[0].id, patch: { title: 'a'.repeat(60) } });
  s = m.reduceWizard(s, { type: 'add', id: 'copy', copyFrom: s.units[0].id });
  assert.equal(s.units[1].data.title.length, 60);
  assert.ok(s.units[1].data.title.endsWith(' (copy)'));
  s = m.reduceWizard(s, { type: 'add', id: 'blank' });
  assert.equal(s.units[2].data.title, '');
  assert.equal(s.units[2].data.monthlyRentUsd, '');
  assert.equal(s.units[2].data.furnishingType, null);
  assert.deepEqual(s.units[2].data.photos, []);
});

test('existing place starts at layout, skips all shared screens, and cannot be edited', () => {
  let s = m.exampleWizard('existing', origin);
  assert.equal(s.position.screen, 'layout');
  assert.equal(m.reduceWizard(s, { type: 'back' }).position.screen, 'layout');
  assert.equal(m.reduceWizard(s, { type: 'editPlace' }), s);
  assert.equal(m.reduceWizard(s, { type: 'place', patch: { area: 'Jbeil' } }), s);
  assert.equal(m.reduceWizard(s, { type: 'gallery', id: 'place', update: [] }), s);
  s = m.reduceWizard(s, { type: 'gallery', id: s.position.unitId, update: m.examplePhotos(origin, 'existing') });
  for (let i = 0; i < 4; i++) s = next(s);
  assert.equal(s.position.screen, 'another');
});

test('header and review edits preserve unfinished units and return to their origin', () => {
  let s = completed();
  s = m.reduceWizard(s, { type: 'add', id: 'unfinished' });
  s = m.reduceWizard(s, { type: 'unit', id: 'unfinished', patch: { title: 'Still working on this unit' } });
  s = m.reduceWizard(s, { type: 'editUnit', id: s.units[0].id });
  for (let i = 0; i < 4; i++) s = next(s);
  assert.deepEqual(s.position, { screen: 'layout', unitId: 'unfinished' });
  assert.equal(s.units[1].data.title, 'Still working on this unit');
  s = m.reduceWizard(s, { type: 'remove', id: 'unfinished' });
  s = m.reduceWizard(s, { type: 'editUnit', id: s.units[0].id });
  for (let i = 0; i < 4; i++) s = next(s);
  assert.equal(s.position.screen, 'review');
});

test('Back from a later unit returns to units already added, without asking place questions again', () => {
  let s = completed();
  s = m.reduceWizard(s, { type: 'add', id: 'second' });
  s = m.reduceWizard(s, { type: 'back' });
  assert.equal(s.position.screen, 'another');
  assert.equal(s.units.length, 2);
  assert.equal(s.position.unitId, s.units[0].id);
  s = m.reduceWizard(s, { type: 'editUnit', id: 'second' });
  assert.equal(s.position.screen, 'layout');
  s = m.reduceWizard(s, { type: 'back' });
  assert.equal(s.position.screen, 'another');
});

test('photo bounds and unfinished uploads are enforced separately for place and unit', () => {
  const s = completed();
  const photos = Array.from({ length: 16 }, (_, i) => ({ ...m.examplePhotos(origin, 'p')[0], localId: `p-${i}` }));
  for (const count of [0, 15, 16]) {
    const d = m.reduceWizard(s, { type: 'gallery', id: 'place', update: photos.slice(0, count) });
    assert.equal(m.placeErrors(d, 'building-photos').length === 0, count <= 15);
  }
  for (const count of [2, 3, 15, 16]) {
    const d = m.reduceWizard(s, { type: 'gallery', id: s.units[0].id, update: photos.slice(0, count) });
    assert.equal(m.unitErrors(d, s.units[0].id, 'photos').length === 0, count >= 3 && count <= 15);
  }
  for (const status of ['uploading', 'error']) {
    const d = m.reduceWizard(s, { type: 'gallery', id: s.units[0].id, update: photos.slice(0, 3).map(p => ({ ...p, status })) });
    assert.ok(m.unitErrors(d, s.units[0].id, 'photos').length);
    assert.equal(m.unitComplete(d, d.units[0]), false);
  }
});

test('late photo completions target stable IDs and cannot resurrect removed units', () => {
  let s = completed();
  s = m.reduceWizard(s, { type: 'add', id: 'other' });
  const first = s.units[0].id;
  s = m.reduceWizard(s, { type: 'gallery', id: first, update: prev => prev.map(p => ({ ...p, caption: 'Late caption' })) });
  assert.equal(s.units[0].data.photos[0].caption, 'Late caption');
  assert.deepEqual(s.units[1].data.photos, []);
  s = m.reduceWizard(s, { type: 'remove', id: first });
  s = m.reduceWizard(s, { type: 'gallery', id: first, update: m.examplePhotos(origin, first) });
  assert.equal(s.units.length, 1);
  assert.equal(s.units[0].id, 'other');
  assert.deepEqual(s.units[0].data.photos, []);
});

test('saved drafts restore contact, position and galleries; interrupted blob uploads recover as errors', () => {
  let s = completed();
  s = m.reduceWizard(s, { type: 'add', id: 'uploading' });
  s = m.reduceWizard(s, { type: 'gallery', id: 'uploading', update: [{ localId: 'pending', uri: 'blob:expired', status: 'uploading' }] });
  const restored = m.readSaved(JSON.stringify(m.persistable(s)));
  assert.deepEqual(restored.position, s.position);
  assert.deepEqual(restored.contact, s.contact);
  assert.equal(restored.units[0].data.photos.length, 3);
  assert.equal(restored.units[1].data.photos[0].status, 'error');
  assert.equal(restored.units[1].data.photos[0].uri, '');
  assert.ok(restored.units[1].data.photos[0].error.includes('interrupted'));
  assert.notEqual(m.storageKey('alice'), m.storageKey('bob'));
  assert.notEqual(m.storageKey('alice', 'place-1'), m.storageKey('alice', 'place-2'));
  assert.notEqual(m.storageKey('alice'), 'studently.createListing.checkpoint.v1:alice');
  assert.throws(() => m.readSaved('{"version":22}'));
});

test('invalid batches, an empty review and a 21st unit are blocked', () => {
  let s = completed();
  const id = s.units[0].id;
  s = m.reduceWizard(s, { type: 'unit', id, patch: { spaceType: 'private_room' } });
  assert.ok(m.unitErrors(s, id, 'layout').length);
  assert.equal(m.reduceWizard(m.reduceWizard(s, { type: 'review' }), { type: 'success' }).position.screen, 'review');
  s = m.reduceWizard(s, { type: 'remove', id });
  assert.ok(m.screenErrors(s).includes('Add at least one unit'));
  assert.equal(m.reduceWizard(s, { type: 'success' }).position.screen, 'review');
  s = completed();
  for (let i = 1; i < 20; i++) s = m.reduceWizard(s, { type: 'add', id: `unit-${i}` });
  assert.equal(m.reduceWizard(s, { type: 'add', id: 'too-many' }), s);
});

test('v2 requires development, web, and the exact opt-in flag', () => {
  assert.equal(m.wizardV2Enabled(true, 'web', 'v2'), true);
  for (const [dev, platform, flag] of [[false, 'web', 'v2'], [true, 'ios', 'v2'], [true, 'android', 'v2'], [true, 'web', undefined], [true, 'web', 'v1'], [true, 'web', ['v2']]]) {
    assert.equal(m.wizardV2Enabled(dev, platform, flag), false);
  }
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../lib/webMapData.web.ts', import.meta.url), 'utf8');
const exports = {};
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(compiled, { exports, require: createRequire(new URL('../package.json', import.meta.url)) });
const { reconcileWebMapRecords: reconcile, webMapIdentityKey: identities } = exports;

test('equivalent/reordered JSON records preserve array, item identity and initial server order', () => {
  const input = [{ id: 'b', price: 300, nested: { lat: 1, lng: 2 } }, { id: 'a', price: 400 }];
  const initial = reconcile(null, input);
  const reordered = [{ price: 400, id: 'a' }, { nested: { lng: 2, lat: 1 }, price: 300, id: 'b' }];
  assert.equal(reconcile(initial, reordered), initial);
  assert.equal(initial.records[0], input[0]);
  assert.equal(initial.records[0].id, 'b');
  assert.equal(input[0].id, 'b');
  assert.equal(reordered[0].id, 'a');
  assert.notEqual(initial.records, input);
});

test('price, coordinates, place, nested metadata and ordered photo changes are not hidden', () => {
  const record = { id: 'a', price: 300, lat: 1, placeId: 'old', metadata: { name: 'old' }, photos: ['front', 'inside'] };
  const before = reconcile(null, [record]);
  for (const change of [{ price: 350 }, { lat: 2 }, { placeId: 'new' }, { metadata: { name: 'new' } }, { photos: ['inside', 'front'] }]) {
    const changed = { ...record, ...change };
    const after = reconcile(before, [changed]);
    assert.notEqual(after, before);
    assert.equal(after.records[0], changed);
  }
});

test('empty, added, removed and duplicate records retain their actual membership', () => {
  const a = { id: 'a' };
  const empty = reconcile(null, []);
  assert.equal(reconcile(empty, []), empty);
  const one = reconcile(empty, [a]);
  const two = reconcile(one, [a, a]);
  assert.notEqual(two, one);
  assert.equal(two.records.length, 2);
  assert.notEqual(reconcile(two, [a]), two);
  assert.notEqual(reconcile(one, []), one);
});

test('membership key is order-independent, ignores duplicate IDs, and avoids delimiter collisions', () => {
  assert.equal(identities(['b', 'a', 'a']), identities(['a', 'b']));
  assert.notEqual(identities(['a']), identities(['a', 'b']));
  assert.notEqual(identities(['a,b', 'c']), identities(['a', 'b,c']));
  assert.equal(identities([]), '[]');
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../lib/nearbyCampuses.ts', import.meta.url), 'utf8');
const exports = {};
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports });
const { listingMapCampuses } = exports;
const origin = { lat: 33.9, lng: 35.5 };
const campus = (slug, lat, lng, institutionSlug = 'same-university') => ({
  id: slug, slug, name: slug, lat, lng, institutionSlug,
});

test('nearest default uses exact meter distance, retains separate campuses and all distances', () => {
  const rows = [campus('far', 34.1, 35.5), campus('next', 33.902, 35.5), campus('nearest', 33.901, 35.5)];
  const result = listingMapCampuses({ ...origin, nearestCampusSlug: 'far', distanceMeters: 1 }, rows);
  assert.equal(result.map(row => row.slug).join(','), 'nearest,next,far');
  assert.ok(Math.abs(result[0].meters - 111.195) < 0.01);
  assert.ok(result[2].meters > 8000);
  assert.equal(rows[0].slug, 'far');
});

test('unmapped and invalid campuses cannot become the default or produce a pin', () => {
  const rows = [campus('null', null, 35.5), campus('nan', NaN, 35.5), campus('infinity', 33.9, Infinity),
    campus('invalid-lat', 91, 35.5), campus('invalid-lng', 33.9, 181), campus('valid', 33.901, 35.5)];
  assert.equal(listingMapCampuses(origin, rows).map(row => row.slug).join(','), 'valid');
  assert.equal(listingMapCampuses({ lat: null, lng: 35.5 }, rows).length, 0);
  assert.equal(listingMapCampuses({ lat: NaN, lng: 35.5 }, rows).length, 0);
  assert.equal(listingMapCampuses(origin, []).length, 0);
});

test('zero distance remains selectable and equal distances use stable campus order', () => {
  const result = listingMapCampuses(origin, [campus('z', 33.9, 35.5), campus('a', 33.9, 35.5)]);
  assert.equal(result.map(row => row.slug).join(','), 'a,z');
  assert.equal(result[0].meters, 0);
});

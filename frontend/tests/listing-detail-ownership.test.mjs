import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../../backend/node_modules/esbuild/lib/main.js';
import path from 'node:path';
const bundle = await build({ entryPoints: [path.resolve(import.meta.dirname, '../lib/listingDetailOwnership.ts')], bundle: true, write: false, platform: 'node', format: 'esm' });
const { detailLabels, siblingHeading, filterSiblingUnits, scopedAmenities, scopedFields, utilityFields } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const displayBundle = await build({ entryPoints: [path.resolve(import.meta.dirname, '../lib/listingDetailDisplay.ts')], bundle: true, write: false, platform: 'node', format: 'esm' });
const { elevatorStatus, placeExtras } = await import('data:text/javascript;base64,' + Buffer.from(displayBundle.outputFiles[0].text).toString('base64'));
const room = { id: 'a', unitType: 'private_room', placeKind: 'apartment', monthlyRentUsd: 300, availability: 'available' };
test('headings cover all unit/place combinations without inventing room membership', () => {
  for (const placeKind of ['apartment', 'building']) for (const [unitType, noun] of [['private_room', 'room'], ['shared_bed', 'bed'], ['whole_apartment', 'apartment']]) {
    const unit = { ...room, unitType, placeKind };
    assert.equal(detailLabels(unit).unitTitle, `This ${noun}`);
    const plural = unitType === 'whole_apartment' && placeKind === 'apartment' ? 'units' : noun + 's';
    assert.equal(siblingHeading(unit, [unit, { ...unit, id: 'b' }]), `Other ${plural} in this ${placeKind} (2)`);
  }
  assert.equal(siblingHeading(room, [room, { ...room, unitType: 'shared_bed' }]), 'Other units in this apartment (2)');
  assert.equal(siblingHeading(room, [room]), 'Other room in this apartment (1)');
});
test('type, stored pending availability and one max rent combine with stable price order', () => {
  const units = [room, { ...room, id: 'b', monthlyRentUsd: 200, availability: 'pending' }, { ...room, id: 'c', unitType: 'shared_bed', monthlyRentUsd: 100 }];
  assert.deepEqual(filterSiblingUnits(units, { type: 'all', availability: 'all', maxRent: '' }).map(u => u.id), ['c', 'b', 'a']);
  assert.deepEqual(filterSiblingUnits(units, { type: 'private_room', availability: 'pending', maxRent: '200' }).map(u => u.id), ['b']);
  assert.equal(filterSiblingUnits(units, { type: 'private_room', availability: 'available', maxRent: '200' }).length, 0);
});
test('solar place / generator unit and reset show the effective value in its correct scope', () => {
  const unit = { ...room, electricity: 'generator_24_7', wifiIncluded: false, generatorAmperes: null, placeContext: { defaults: { electricity: 'solar', wifiIncluded: true, generatorAmperes: 10 }, sources: { electricity: 'unit', wifiIncluded: 'unit', generatorAmperes: 'unit' } } };
  let rows = scopedFields(unit, utilityFields, 'unit');
  assert.equal(rows.find(r => r.key === 'electricity').value, '24/7 Generator (Ishtirak)');
  assert.equal(rows.find(r => r.key === 'wifiIncluded').value, 'No');
  assert.equal(rows.find(r => r.key === 'generatorAmperes').value, 'Not specified');
  assert.match(scopedFields(unit, utilityFields, 'place').find(r => r.key === 'electricity').value, /Solar/);
  unit.electricity = 'solar'; unit.placeContext.sources.electricity = 'place';
  assert.ok(!scopedFields(unit, utilityFields, 'unit').some(r => r.key === 'electricity'));
  assert.equal(scopedFields(unit, utilityFields, 'place').find(r => r.key === 'electricity').specific, false);
});
test('shared additions, copied amenities and exclusions do not claim exclusive or unavailable access', () => {
  const unit = { ...room, amenities: ['balcony', 'study_desk'], placeContext: { defaults: { amenities: ['balcony', 'parking'] }, unitAmenities: ['balcony', 'study_desk'], amenityOverrides: { parking: false } } };
  assert.deepEqual(scopedAmenities(unit), { unit: ['study_desk'], shared: [{ key: 'balcony', available: true }, { key: 'parking', available: false }] });
});

test('building visibility ignores removed details and retains each independent extra', () => {
  const unit = { ...room, amenities: ['balcony'], placeContext: { isMultiUnit: true,
    defaults: { electricity: 'solar', wifiIncluded: true, quietHours: true, amenities: ['balcony'], hasSolar: false, conciergeIncluded: false },
    amenityOverrides: {} } };
  assert.equal(placeExtras(unit).visible, false);
  assert.equal(placeExtras({ ...unit, buildingName: '  ' }).visible, false);
  for (const details of [{ buildingName: 'Bliss House' }, { addressLine: '24 Bliss Street' }, { sharedPhotos: [{ url: '/shared.png' }] }]) {
    assert.equal(placeExtras({ ...unit, ...details }).visible, true);
  }
  for (const defaults of [{ hasSolar: true }, { conciergeIncluded: true }, { amenities: ['balcony', 'parking'] }]) {
    assert.equal(placeExtras({ ...unit, placeContext: { ...unit.placeContext, defaults } }).visible, true);
  }
  for (const defaults of [{ hasElevator: false }, { hasElevator: true }, { hasElevator: true, elevator24_7: true }]) {
    assert.equal(placeExtras({ ...unit, placeContext: { ...unit.placeContext, defaults } }).visible, false);
  }
  assert.deepEqual(placeExtras({ ...unit, placeContext: { ...unit.placeContext, defaults: { amenities: ['balcony', 'parking', 'parking'] } } }).unavailableAmenities, ['parking']);
});

test('elevator uses effective availability and cannot create a building section', () => {
  assert.equal(elevatorStatus({ hasElevator: false, elevator24_7: true }), 'Not available');
  assert.equal(elevatorStatus({ hasElevator: true, elevator24_7: false }), 'Available');
  assert.equal(elevatorStatus({ hasElevator: true, elevator24_7: true }), 'Available 24/7');
  const unit = { ...room, hasElevator: false, elevator24_7: false, placeContext: { isMultiUnit: true,
    defaults: { hasElevator: true, elevator24_7: true }, amenityOverrides: {} } };
  assert.equal(elevatorStatus(unit), 'Not available');
  assert.equal(placeExtras(unit).visible, false);
  assert.equal('elevator' in placeExtras(unit), false);
});

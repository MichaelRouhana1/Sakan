import type { Listing, SharedDetailField } from '@/types/listing';
import { labelAudience, labelElectricity, labelWater } from './listingLabels';
import { formatWindowsSummary } from './electricityCuts';

export function detailUnitType(listing: Listing): NonNullable<Listing['unitType']> {
  return listing.unitType ?? (listing.listingType === 'private_room' ? 'private_room'
    : listing.listingType === 'shared_dorm_bed' ? 'shared_bed' : 'whole_apartment');
}

export function detailLabels(listing: Listing) {
  const type = detailUnitType(listing);
  const unit = type === 'private_room' ? 'room' : type === 'shared_bed' ? 'bed' : 'apartment';
  const place = listing.placeKind === 'building' ? 'building' : 'apartment';
  return { unit, place, unitTitle: `This ${unit}`, placeTitle: `The ${place}` };
}

export function siblingHeading(listing: Listing, siblings: Listing[]) {
  const types = new Set(siblings.map(detailUnitType));
  const { place } = detailLabels(listing);
  const type = types.size === 1 ? [...types][0] : null;
  const noun = type === 'private_room' ? 'room' : type === 'shared_bed' ? 'bed'
    : type === 'whole_apartment' && place === 'building' ? 'apartment' : 'unit';
  return `Other ${noun}${siblings.length === 1 ? '' : 's'} in this ${place} (${siblings.length})`;
}

export type SiblingFilters = { type: string; availability: string; maxRent: string };
export function filterSiblingUnits(siblings: Listing[], filters: SiblingFilters) {
  const max = filters.maxRent.trim() === '' ? null : Number(filters.maxRent);
  return siblings.filter(unit =>
    (filters.type === 'all' || detailUnitType(unit) === filters.type) &&
    (filters.availability === 'all' || unit.availability === filters.availability) &&
    (max === null || !Number.isFinite(max) || unit.monthlyRentUsd <= max),
  ).sort((a, b) => a.monthlyRentUsd - b.monthlyRentUsd || a.id.localeCompare(b.id));
}

export function scopedAmenities(listing: Listing) {
  const context = listing.placeContext;
  const shared = [...new Set(context?.defaults.amenities ?? [])];
  const effective = new Set(listing.amenities ?? []);
  return {
    unit: [...effective].filter(key => !shared.includes(key)),
    shared: shared.map(key => ({ key, available: effective.has(key) && context?.amenityOverrides[key] !== false })),
  };
}

type Field = { key: SharedDetailField; label: string; format?: (value: never) => string };
export const utilityFields: Field[] = [
  { key: 'electricity', label: 'Electricity', format: labelElectricity },
  { key: 'generatorAmperes', label: 'Generator limit', format: value => `${value} A` },
  { key: 'hasSolar', label: 'Solar backup' },
  { key: 'electricityCutWindows', label: 'Power cut schedule', format: value => formatWindowsSummary(value) || 'No scheduled cuts' },
  { key: 'electricityHoursOn', label: 'Hours with power', format: value => `${value} / 24 hours` },
  { key: 'electricityCutsStart', label: 'Power cuts start' },
  { key: 'electricityCutsEnd', label: 'Power cuts end' },
  { key: 'water', label: 'Water supply', format: labelWater },
  { key: 'wifiIncluded', label: 'Wi-Fi included in rent' },
  { key: 'routerUps', label: 'Router backup power' },
  { key: 'hasElevator', label: 'Elevator' },
  { key: 'elevator24_7', label: '24/7 elevator power' },
  { key: 'generatorIncluded', label: 'Generator included in rent' },
  { key: 'waterBillIncluded', label: 'Water bill included in rent' },
  { key: 'buildingFeesIncluded', label: 'Building fees included in rent' },
  { key: 'conciergeIncluded', label: 'Concierge included in rent' },
  { key: 'cookingGasIncluded', label: 'Cooking gas included in rent' },
  { key: 'parkingIncludedInRent', label: 'Parking included in rent' },
];
export const ruleFields: Field[] = [
  { key: 'smokingPolicy', label: 'Smoking', format: value => ({ no: 'Not allowed', inside: 'Allowed inside', balcony_only: 'Balcony only' }[value]) },
  { key: 'petsPolicy', label: 'Pets', format: value => ({ no: 'Not allowed', yes: 'Allowed', cats_only: 'Cats only' }[value]) },
  { key: 'guestsPolicy', label: 'Overnight guests', format: value => ({ no: 'Not allowed', yes: 'Allowed', restricted: 'Restricted' }[value]) },
  { key: 'quietHours', label: 'Quiet hours' },
  { key: 'targetAudience', label: 'Who it is for', format: labelAudience },
];

export function scopedFields(listing: Listing, fields: Field[], scope: 'unit' | 'place') {
  const context = listing.placeContext;
  const values = scope === 'unit' ? listing : context?.defaults;
  return fields.flatMap(field => {
    const specific = context?.sources[field.key] === 'unit';
    if (scope === 'unit' && !specific) return [];
    const value = values?.[field.key];
    if (value === undefined || (value === null && !(scope === 'unit' && specific))) return [];
    // Cut windows already carry their start/end. Keep individual fields only for
    // explicit per-field differences, so nullable overrides remain visible.
    if (scope === 'place' && ['electricityCutsStart', 'electricityCutsEnd'].includes(field.key)) return [];
    return [{ key: field.key, label: field.label, specific,
      value: value === null ? 'Not specified' : typeof value === 'boolean' ? (value ? 'Yes' : 'No')
        : field.format ? field.format(value as never) : String(value) }];
  });
}

import type { CreateListingInput } from './listings.schemas.js';
import { resolveCutWindows, hoursWithPowerFromWindows } from '../../lib/electricityCuts.js';

// Explicit API-to-resolver mapping. Location always belongs to the place.
export const sharedFields = {
 electricity:'electricity', powerSources:'power_sources', powerHours:'power_hours', electricityCutsStart:'electricity_cuts_start', electricityCutsEnd:'electricity_cuts_end',
 electricityHoursOn:'electricity_hours_on', electricityCutWindows:'electricity_cut_windows',
 water:'water', waterSources:'water_sources', hotWater:'hot_water', wifiIncluded:'wifi_included', routerUps:'router_ups', elevator24_7:'elevator_24_7',
 hasElevator:'has_elevator', hasSolar:'has_solar', generatorAmperes:'generator_amperes', generatorIncluded:'generator_included',
 conciergeIncluded:'concierge_included', cookingGasIncluded:'cooking_gas_included', waterBillIncluded:'water_bill_included',
 buildingFeesIncluded:'building_fees_included', parkingIncludedInRent:'parking_included_in_rent',
 smokingPolicy:'smoking_policy', petsPolicy:'pets_policy', guestsPolicy:'guests_policy', quietHours:'quiet_hours', targetAudience:'target_audience',
} as const;
export const locationFields = {area:'area', landmark:'landmark', addressLine:'address_line', buildingName:'building_name', primaryCampusId:'primary_campus_id'} as const;
type SharedInput = Pick<CreateListingInput, keyof typeof sharedFields>;
export function normalizedShared(input: SharedInput) {
 const powerSources = input.powerSources?.length
  ? input.powerSources
  : input.electricity === 'scheduled_cuts' ? ['state_power']
  : input.electricity === 'solar' ? ['solar']
  : input.electricity === 'generator_24_7' ? ['generator']
  : [];
 const powerHours = input.powerHours ?? (input.electricity === 'scheduled_cuts' ? 'scheduled_cuts' : input.electricity ? 'always' : null);
 const electricity = powerSources.length && powerHours
  ? (powerHours === 'scheduled_cuts' ? 'scheduled_cuts' : powerSources.includes('solar') && !powerSources.includes('generator') ? 'solar' : 'generator_24_7')
  : input.electricity;
 const windows = electricity === 'scheduled_cuts' ? resolveCutWindows(input) : [];
 const waterSources = input.waterSources?.length
  ? input.waterSources
  : input.water === 'tank_delivery' ? ['tank_delivery'] : ['state_water'];
 const water = waterSources.length === 1 && waterSources[0] === 'tank_delivery' ? 'tank_delivery' : 'state_well_24_7';
 return {...input, electricity, powerSources, powerHours, hasSolar: powerSources.length ? powerSources.includes('solar') : input.hasSolar, water, waterSources, hotWater: input.hotWater ?? null, electricityCutWindows:windows, electricityCutsStart:windows[0]?.start ?? null,
  electricityCutsEnd:windows[0]?.end ?? null, electricityHoursOn:hoursWithPowerFromWindows(windows)};
}
export function sharedSqlValues(input: SharedInput) {
 const values = normalizedShared(input);
 return Object.fromEntries(Object.entries(sharedFields).map(([key,col])=>[col,values[key as keyof typeof values] ?? null]));
}

function sameJson(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function sameStringSet(a: unknown, b: unknown) {
  const left = Array.isArray(a) ? [...a].map(String).sort() : [];
  const right = Array.isArray(b) ? [...b].map(String).sort() : [];
  return sameJson(left, right);
}

/** Keep an override only when the unit value differs from the place. Equal copies inherit. */
export function retainedDifferentFields(
  fields: readonly string[],
  unit: Record<string, unknown>,
  place: Record<string, unknown>,
) {
  return fields.filter((key) => {
    if (key === 'amenities') return !sameStringSet(unit.amenities, place.amenities);
    if (!(key in sharedFields)) return false;
    return !sameJson(unit[key], place[key]);
  });
}

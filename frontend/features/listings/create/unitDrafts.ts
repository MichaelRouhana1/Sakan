import { type CreateListingDraft } from './draft';

export const SHARED_GROUPS = {
 electricity:['electricity','electricityCutsStart','electricityCutsEnd','electricityHoursOn','electricityCutWindows','generatorAmperes','hasSolar','generatorIncluded'],
 water:['water','waterBillIncluded'],
 comforts:['wifiIncluded','routerUps','hasElevator','elevator24_7','conciergeIncluded','cookingGasIncluded','buildingFeesIncluded','parkingIncludedInRent','amenities'],
 rules:['smokingPolicy','petsPolicy','guestsPolicy','quietHours','targetAudience'],
} as const;
/** Mark only the fields the host changed. Absent keys keep inheriting the place. */
export function patchOverride(
  draft: CreateListingDraft,
  patch: (next: Partial<CreateListingDraft>) => void,
  values: Partial<CreateListingDraft>,
  keys: readonly string[],
) {
  if (!draft.sharedValues) {
    patch(values);
    return;
  }
  const next = new Set([...(draft.differentFields ?? []), ...keys]);
  patch({ ...values, differentFields: [...next] });
}

export function resetOverride(
  draft: CreateListingDraft,
  patch: (next: Partial<CreateListingDraft>) => void,
  keys: readonly string[],
) {
  if (!draft.sharedValues) return;
  const restored: Partial<CreateListingDraft> = {};
  for (const key of keys) {
    (restored as Record<string, unknown>)[key] = draft.sharedValues[key as keyof CreateListingDraft];
  }
  patch({
    ...restored,
    differentFields: (draft.differentFields ?? []).filter((key) => !keys.includes(key)),
  });
}

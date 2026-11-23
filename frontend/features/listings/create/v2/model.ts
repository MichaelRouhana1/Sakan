import { INITIAL_DRAFT, type CreateListingDraft } from '../draft';
import type { DraftPhoto } from '@/components/listings/PhotoPickerGrid';
import { COPY_TITLE_MAX, isPhotoReady, stepFieldErrors } from '../validators';
import { nextParkingIncludedInRent } from '../parkingIncluded';

export const PLACE_SCREENS = ['place-type', 'location', 'utilities', 'rules', 'building-photos'] as const;
export const UNIT_SCREENS = ['layout', 'photos', 'rent', 'copy'] as const;
export type PlaceScreen = typeof PLACE_SCREENS[number];
export type UnitScreen = typeof UNIT_SCREENS[number];
export type Screen = PlaceScreen | UnitScreen | 'another' | 'review' | 'success';
export type Position = { screen: Screen; unitId: string };
export type Unit = { id: string; data: Partial<CreateListingDraft>; finished: boolean };
export type WizardV2Draft = {
  version: 2;
  place: { id?: string; kind: 'apartment' | 'building' | null; data: Partial<CreateListingDraft>; photos: DraftPhoto[] };
  contact: Partial<CreateListingDraft>;
  units: Unit[];
  position: Position;
  completedPlace: PlaceScreen[];
  returnTo: Position | null;
  reviewVisited: boolean;
  pendingAttempt?: { requestId: string; body: Record<string, unknown> };
};

const UNIT_KEYS = ['spaceType', 'propertyType', 'priceBasis', 'bathroomPrivacy', 'bedsAvailable',
  'bedrooms', 'beds', 'bathrooms', 'maxOccupancy', 'furnishingType', 'floorNumber', 'areaSqm',
  'genderRestriction', 'photos', 'monthlyRentUsd', 'depositPreset', 'securityDepositUsd',
  'leaseTerm', 'availableImmediate', 'availableFrom', 'paymentModality', 'title', 'description',
  'highlightTags', 'cardBadges'] as const;

export function unitData(source: Partial<CreateListingDraft> = INITIAL_DRAFT): Partial<CreateListingDraft> {
  return JSON.parse(JSON.stringify(Object.fromEntries(UNIT_KEYS.filter(k => source[k] !== undefined).map(k => [k, source[k]]))));
}

function safeUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const n = Math.floor(Math.random() * 16);
    return (c === 'x' ? n : (n & 3) | 8).toString(16);
  });
}

export function ensureWizardUnit(state: WizardV2Draft): WizardV2Draft {
  if (state.units.some(unit => unit.id === state.position.unitId)) return state;
  if (state.units.length) return { ...state, position: { ...state.position, unitId: state.units[0].id } };
  const id = safeUuid();
  return { ...state, units: [{ id, data: unitData(), finished: false }], position: { ...state.position, unitId: id } };
}

export function newWizard(unitId: string, placeId?: string): WizardV2Draft {
  return { version: 2, place: { id: placeId, kind: null, data: {}, photos: [] }, contact: {},
    units: [{ id: unitId, data: unitData(), finished: false }],
    position: { screen: placeId ? 'layout' : 'place-type', unitId },
    completedPlace: [], returnTo: null, reviewVisited: false };
}

export function formDraft(state: WizardV2Draft, id = state.position.unitId): CreateListingDraft {
  return { ...INITIAL_DRAFT, ...state.place.data, ...state.units.find(u => u.id === id)?.data,
    ...state.contact, placeKind: state.place.kind ?? undefined, existingPlaceId: state.place.id,
    sharedValues: undefined, sharedPhotos: state.place.photos };
}

export function unitErrors(state: WizardV2Draft, id: string, screen: UnitScreen): string[] {
  const draft = formDraft(state, id);
  if (screen === 'layout') return [
    ...stepFieldErrors(draft, 0, true), ...stepFieldErrors(draft, 2, true),
    ...(state.place.kind === 'building' && draft.spaceType !== 'entire_place' ? ['A building contains whole apartments'] : []),
  ];
  return stepFieldErrors(draft, { photos: 5, rent: 6, copy: 7 }[screen], true);
}
export function unitComplete(state: WizardV2Draft, unit: Unit): boolean {
  return unit.finished && UNIT_SCREENS.every(s => unitErrors(state, unit.id, s).length === 0);
}
export function placeErrors(state: WizardV2Draft, screen: PlaceScreen): string[] {
  if (state.place.id) return [];
  if (screen === 'place-type') return state.place.kind ? [] : ['Choose an apartment or building'];
  if (screen === 'building-photos') return state.place.photos.length > 15 || state.place.photos.some(p => !isPhotoReady(p)) ? ['sharedPhotos'] : [];
  return stepFieldErrors(formDraft(state), { location: 1, utilities: 3, rules: 4 }[screen], true);
}
export function screenErrors(state: WizardV2Draft): string[] {
  const screen = state.position.screen;
  if (PLACE_SCREENS.includes(screen as PlaceScreen)) return placeErrors(state, screen as PlaceScreen);
  if (screen === 'copy') return UNIT_SCREENS.flatMap(s => unitErrors(state, state.position.unitId, s));
  if (UNIT_SCREENS.includes(screen as UnitScreen)) return unitErrors(state, state.position.unitId, screen as UnitScreen);
  if (screen === 'another') return state.units.flatMap((u, i) => {
    const errors = UNIT_SCREENS.flatMap(s => unitErrors(state, u.id, s));
    return !errors.length && !u.finished ? [`Finish Unit ${i + 1} before reviewing`] : errors;
  });
  if (screen === 'review') return [
    ...(state.units.length ? [] : ['Add at least one unit']),
    ...PLACE_SCREENS.flatMap(s => placeErrors(state, s)),
    ...state.units.flatMap((u, i) => UNIT_SCREENS.flatMap(s => unitErrors(state, u.id, s)).map(e => `Unit ${i + 1}: ${e}`)),
    ...stepFieldErrors(formDraft(state), 8, true),
  ];
  return [];
}

export type Action =
  | { type: 'attempt'; attempt?: WizardV2Draft['pendingAttempt'] }
  | { type: 'place'; patch: Partial<CreateListingDraft> }
  | { type: 'kind'; kind: 'apartment' | 'building' }
  | { type: 'contact'; patch: Partial<CreateListingDraft> }
  | { type: 'unit'; id: string; patch: Partial<CreateListingDraft> }
  | { type: 'gallery'; id: string | 'place'; update: DraftPhoto[] | ((photos: DraftPhoto[]) => DraftPhoto[]) }
  | { type: 'loadedPlace'; data: Partial<CreateListingDraft> }
  | { type: 'next' } | { type: 'back' } | { type: 'review' }
  | { type: 'add'; id: string; copyFrom?: string }
  | { type: 'editUnit'; id: string } | { type: 'editPlace' }
  | { type: 'remove'; id: string } | { type: 'success' };

export function reduceWizard(state: WizardV2Draft, action: Action): WizardV2Draft {
  switch (action.type) {
    case 'attempt': return { ...state, pendingAttempt: action.attempt };
    case 'kind': return { ...state, place: { ...state.place, kind: action.kind } };
    case 'place': {
      if (state.place.id) return state;
      const data = { ...state.place.data, ...action.patch };
      if (action.patch.amenities) data.parkingIncludedInRent = nextParkingIncludedInRent({
        previousAmenities: state.place.data.amenities ?? INITIAL_DRAFT.amenities,
        nextAmenities: action.patch.amenities,
        previousIncluded: state.place.data.parkingIncludedInRent ?? INITIAL_DRAFT.parkingIncludedInRent,
        explicit: action.patch.parkingIncludedInRent,
      });
      return { ...state, place: { ...state.place, data } };
    }
    case 'loadedPlace': return { ...state, place: { ...state.place, kind: action.data.placeKind ?? 'apartment', data: action.data, photos: action.data.sharedPhotos ?? [] }, completedPlace: [...PLACE_SCREENS] };
    case 'contact': return { ...state, contact: { ...state.contact, ...action.patch } };
    case 'unit': return { ...state, units: state.units.map(u => u.id === action.id ? { ...u, data: { ...u.data, ...unitData(action.patch) } } : u) };
    case 'gallery': {
      const update = (photos: DraftPhoto[]) => typeof action.update === 'function' ? action.update(photos) : action.update;
      if (action.id === 'place') return state.place.id ? state : { ...state, place: { ...state.place, photos: update(state.place.photos) } };
      return { ...state, units: state.units.map(u => u.id === action.id ? { ...u, data: { ...u.data, photos: update(u.data.photos ?? []) } } : u) };
    }
    case 'next': {
      if (screenErrors(state).length) return state;
      const placeIndex = PLACE_SCREENS.indexOf(state.position.screen as PlaceScreen);
      if (placeIndex >= 0) {
        const completedPlace = [...new Set([...state.completedPlace, PLACE_SCREENS[placeIndex]])];
        if (placeIndex < PLACE_SCREENS.length - 1) return { ...state, completedPlace, position: { ...state.position, screen: PLACE_SCREENS[placeIndex + 1] } };
        return { ...state, completedPlace, position: state.returnTo ?? { ...state.position, screen: 'layout' }, returnTo: null };
      }
      const unitIndex = UNIT_SCREENS.indexOf(state.position.screen as UnitScreen);
      if (unitIndex >= 0) {
        if (unitIndex < UNIT_SCREENS.length - 1) return { ...state, position: { ...state.position, screen: UNIT_SCREENS[unitIndex + 1] } };
        // Finish only this unit. Earlier screens may have been invalidated by an edit.
        if (UNIT_SCREENS.some(s => unitErrors(state, state.position.unitId, s).length)) return state;
        return { ...state, units: state.units.map(u => u.id === state.position.unitId ? { ...u, finished: true } : u),
          position: state.returnTo ?? { ...state.position, screen: 'another' }, returnTo: null };
      }
      return state;
    }
    case 'back': {
      const pi = PLACE_SCREENS.indexOf(state.position.screen as PlaceScreen);
      const ui = UNIT_SCREENS.indexOf(state.position.screen as UnitScreen);
      if (ui === 0 && state.returnTo) return { ...state, position: state.returnTo, returnTo: null };
      if (pi > 0) return { ...state, position: { ...state.position, screen: PLACE_SCREENS[pi - 1] } };
      if (ui > 0) return { ...state, position: { ...state.position, screen: UNIT_SCREENS[ui - 1] } };
      if (state.position.screen === 'another') return { ...state, position: { ...state.position, screen: 'copy' } };
      if (state.position.screen === 'review' && state.units.length) return { ...state, position: { screen: 'another', unitId: state.units.at(-1)!.id } };
      if (state.position.screen === 'review') {
        const id = safeUuid();
        return { ...state, units: [{ id, data: unitData(), finished: false }], position: { screen: 'layout', unitId: id }, returnTo: null };
      }
      const unitIndex = state.units.findIndex(u => u.id === state.position.unitId);
      if (ui === 0 && unitIndex > 0) return { ...state, position: { screen: 'another', unitId: state.units[unitIndex - 1].id } };
      if (ui === 0 && !state.place.id) return { ...state, position: { ...state.position, screen: 'building-photos' } };
      return state;
    }
    case 'add': {
      if (state.units.length >= 20) return state;
      const original = state.units.find(u => u.id === action.copyFrom);
      const data = original ? unitData(original.data) : unitData();
      if (original) {
        // Leave room for the suffix even when the original is at the title limit.
        data.title = `${(data.title ?? '').trim().slice(0, COPY_TITLE_MAX - 7).trimEnd()} (copy)`;
        data.photos = [];
        data.cardBadges = null;
      }
      return { ...state, units: [...state.units, { id: action.id, data, finished: false }],
        position: { screen: 'layout', unitId: action.id }, returnTo: state.position.screen === 'review' ? state.position : null };
    }
    case 'review': return { ...state, position: { ...state.position, screen: 'review' }, reviewVisited: true, returnTo: null };
    case 'editUnit': return state.units.some(u => u.id === action.id) ? { ...state,
      returnTo: state.returnTo ?? state.position, position: { screen: 'layout', unitId: action.id } } : state;
    case 'editPlace': {
      if (state.place.id) return state;
      const ready = ensureWizardUnit(state);
      return { ...ready, returnTo: state.returnTo ?? state.position, position: { ...ready.position, screen: 'place-type' } };
    }
    case 'remove': {
      const units = state.units.filter(u => u.id !== action.id);
      return { ...state, units, position: { screen: 'review', unitId: units[0]?.id ?? '' }, returnTo: null };
    }
    case 'success': return screenErrors({ ...state, position: { ...state.position, screen: 'review' } }).length ? state : { ...state, position: { ...state.position, screen: 'success' } };
  }
}

export function persistablePhotos(photos: DraftPhoto[]): DraftPhoto[] {
  return photos.map(p => {
    const uri = p.url || (p.uri.startsWith('blob:') ? '' : p.uri);
    const ready = p.status === 'ready' && Boolean(uri);
    return { ...p, uri, status: ready ? 'ready' : 'error', error: ready ? undefined : 'Upload interrupted — retry or add this photo again.' };
  });
}
export function persistable(state: WizardV2Draft): WizardV2Draft {
  return { ...state, place: { ...state.place, photos: persistablePhotos(state.place.photos) },
    units: state.units.map(u => ({ ...u, data: { ...u.data, photos: persistablePhotos(u.data.photos ?? []) } })) };
}

import type { CreateListingDraft } from '../draft';
import { newWizard, PLACE_SCREENS, unitData, type WizardV2Draft } from './model';

export type Example = 'one' | 'three' | 'existing';
export function examplePhotos(origin: string, unitId: string) {
  return [1, 2, 3].map((n) => ({ localId: `${unitId}-example-${n}`, uri: `${origin}/wizard-v2-demo/room-${n}.jpg`,
    url: `${origin}/wizard-v2-demo/room-${n}.jpg`, status: 'ready' as const, caption: ['Bedroom', 'Kitchen', 'Living room'][n - 1] }));
}
export function exampleWizard(example: Example, origin: string): WizardV2Draft {
  const state = newWizard('example-unit-1', example === 'existing' ? 'example-cedar-house' : undefined);
  state.place = { ...state.place, kind: 'building', data: {
    area: 'Hamra', buildingName: 'Cedar House', addressLine: 'Hamra Street, Beirut',
    pin: { lat: 33.899, lng: 35.482, confirmed: true, source: 'pin', landmarkId: null, landmarkLabel: '' },
    primaryCampusId: '10000000-0000-4000-8000-000000000001', electricity: 'solar', water: 'state_well_24_7',
    hasElevator: true, elevator24_7: true, wifiIncluded: true, amenities: ['study_desk', 'balcony'],
  }, photos: [] };
  const first: Partial<CreateListingDraft> = { ...unitData(), spaceType: 'entire_place', propertyType: 'apartment',
    furnishingType: 'furnished', bathroomPrivacy: 'private', bedrooms: 1, beds: 1, bathrooms: 1, maxOccupancy: 2,
    floorNumber: 2, areaSqm: '65', monthlyRentUsd: '650', title: 'Sunny apartment near campus',
    description: 'A bright furnished apartment with a quiet bedroom, a private balcony and a desk for studying. Close to campus and everyday essentials.',
    photos: examplePhotos(origin, 'example-unit-1') };
  state.units[0].data = first;
  state.contact = { listingPosterRole: 'landlord', contactName: 'Example Host',
    contactNumbers: [{ kind: 'mobile', prefix: '71', subscriber: '123456', calls: true, whatsapp: true }] };
  if (example === 'three') {
    state.completedPlace = [...PLACE_SCREENS];
    state.units[0].finished = true;
    state.position.screen = 'another';
  }
  if (example === 'existing') {
    state.completedPlace = [...PLACE_SCREENS];
    state.position.screen = 'layout';
    state.units[0].data = { ...first, title: 'New apartment at Cedar House', photos: [] };
  }
  return state;
}

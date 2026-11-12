import type { Listing } from '@/types/listing';
import { scopedAmenities } from './listingDetailOwnership';

type Elevator = Pick<Listing, 'hasElevator' | 'elevator24_7'>;

export function elevatorStatus(values: Partial<Elevator>): string {
  if (values.hasElevator === false) return 'Not available';
  if (values.elevator24_7 === true) return 'Available 24/7';
  return values.hasElevator === true ? 'Available' : 'Not available';
}

/** Display-only building context; the listing itself already contains effective unit values. */
export function placeExtras(listing: Listing) {
  const defaults = listing.placeContext?.defaults;
  const address = [listing.buildingName?.trim(), listing.addressLine?.trim()].filter(Boolean).join(' · ');
  const solar = defaults?.hasSolar === true;
  const concierge = defaults?.conciergeIncluded === true;
  const unavailableAmenities = scopedAmenities(listing).shared.filter(item => !item.available).map(item => item.key);
  const visible = listing.placeContext?.isMultiUnit === true && Boolean(
    address || listing.sharedPhotos?.length || solar || concierge || unavailableAmenities.length,
  );
  return { address, solar, concierge, unavailableAmenities, visible };
}

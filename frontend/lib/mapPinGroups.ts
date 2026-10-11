import type { Listing } from "@/types/listing";

export type ListingWithCoords = Listing & { lng: number; lat: number };
export type MapPinGroup = {
  id: string; listings: ListingWithCoords[]; lat: number; lng: number;
  displayPriceUsd: number; count: number;
};

/** Place membership only. Zoom-based density clustering stays in mapClusters.ts. */
export function groupListingsByPlace(listings: ListingWithCoords[]): MapPinGroup[] {
  const buckets = new Map<string, ListingWithCoords[]>();
  for (const listing of listings) {
    // Missing legacy identity must never merge unrelated owners at the same pin.
    const key = listing.placeId ? `place:${listing.placeId}` : `unit:${listing.id}`;
    const members = buckets.get(key) ?? [];
    if (!members.some(member => member.id === listing.id)) members.push(listing);
    buckets.set(key, members);
  }
  return [...buckets].map(([id, members]) => ({
    id, listings: members, lat: members[0]!.lat, lng: members[0]!.lng,
    displayPriceUsd: Math.min(...members.map(m => m.monthlyRentUsd)), count: members.length,
  }));
}

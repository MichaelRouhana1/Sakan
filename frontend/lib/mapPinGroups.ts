import type { Listing } from "@/types/listing";

/**
 * Listings within this distance share one visual map pin.
 * Real GPS on each listing is unchanged (distance / polylines use selected row).
 */
export const MAP_PIN_GROUP_METERS = 10;

export type ListingWithCoords = Listing & { lng: number; lat: number };

export type MapPinGroup = {
  id: string;
  listings: ListingWithCoords[];
  /** Visual marker only — mean of member coords. */
  lat: number;
  lng: number;
  /**
   * Price shown on the pill: cheapest rent in the group.
   * Multi groups append “ · N” in the marker UI.
   */
  displayPriceUsd: number;
  count: number;
};

function metersBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Collapse coincident / near-duplicate pins for map display only.
 * Greedy: join a listing to the first group with any member ≤ MAP_PIN_GROUP_METERS.
 */
export function groupListingsByProximity(
  listings: ListingWithCoords[],
): MapPinGroup[] {
  const buckets: ListingWithCoords[][] = [];

  for (const listing of listings) {
    let placed = false;
    for (const bucket of buckets) {
      if (
        bucket.some(
          (member) => metersBetween(member, listing) <= MAP_PIN_GROUP_METERS,
        )
      ) {
        bucket.push(listing);
        placed = true;
        break;
      }
    }
    if (!placed) buckets.push([listing]);
  }

  return buckets.map((members) => {
    const sorted = [...members].sort(
      (a, b) => a.monthlyRentUsd - b.monthlyRentUsd,
    );
    const lat =
      sorted.reduce((sum, m) => sum + m.lat, 0) / Math.max(sorted.length, 1);
    const lng =
      sorted.reduce((sum, m) => sum + m.lng, 0) / Math.max(sorted.length, 1);
    const ids = sorted
      .map((m) => m.id)
      .sort()
      .join("|");

    return {
      id: `pin-group:${ids}`,
      listings: sorted,
      lat,
      lng,
      displayPriceUsd: sorted[0]?.monthlyRentUsd ?? 0,
      count: sorted.length,
    };
  });
}

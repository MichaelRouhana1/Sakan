import type { MapPinGroup } from "@/lib/mapPinGroups";

/** A web presentation only: the original places and listing identities survive. */
export type WebMapDisplayGroup = MapPinGroup & { placeGroups: readonly MapPinGroup[] };

function roundedCoordinate(value: number): number {
  const rounded = Number(value.toFixed(6));
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function webMapDisplayGroups(groups: readonly MapPinGroup[]): WebMapDisplayGroup[] {
  const buckets = new Map<string, { lat: number; lng: number; places: MapPinGroup[] }>();
  for (const group of groups) {
    const lat = roundedCoordinate(group.lat);
    const lng = roundedCoordinate(group.lng);
    const key = `${lng},${lat}`;
    const bucket = buckets.get(key) ?? { lat, lng, places: [] };
    bucket.places.push(group);
    buckets.set(key, bucket);
  }
  return [...buckets].map(([key, { lat, lng, places }]) => {
    if (places.length === 1) return { ...places[0]!, placeGroups: places };
    const placeGroups = [...places].sort((a, b) => a.id.localeCompare(b.id));
    return {
      id: `coordinate:${key}`, lat, lng, placeGroups,
      listings: placeGroups.flatMap(place => [...place.listings].sort((a, b) => a.id.localeCompare(b.id))),
      displayPriceUsd: Math.min(...placeGroups.map(place => place.displayPriceUsd)),
      count: placeGroups.reduce((sum, place) => sum + place.count, 0),
    };
  });
}

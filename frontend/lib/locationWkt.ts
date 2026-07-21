/** Lebanon bounding box (WGS84) — rejects junk coords at publish. */
export const LEBANON_BBOX = {
  minLng: 35.05,
  maxLng: 36.65,
  minLat: 33.05,
  maxLat: 34.7,
} as const;

export type LatLng = { lat: number; lng: number };

export function toWkt({ lng, lat }: LatLng): string {
  return `POINT(${lng} ${lat})`;
}

export function parseWkt(wkt: string): LatLng | null {
  const match = wkt
    .trim()
    .match(/^POINT\((-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\)$/i);
  if (!match) return null;
  const lng = Number(match[1]);
  const lat = Number(match[2]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lng, lat };
}

export function isInLebanon({ lng, lat }: LatLng): boolean {
  return (
    lng >= LEBANON_BBOX.minLng &&
    lng <= LEBANON_BBOX.maxLng &&
    lat >= LEBANON_BBOX.minLat &&
    lat <= LEBANON_BBOX.maxLat
  );
}

export function formatCoordLabel({ lng, lat }: LatLng): string {
  return `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
}

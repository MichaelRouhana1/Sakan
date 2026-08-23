import type MapView from "react-native-maps";

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type EdgePadding = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type MapViewRef = MapView | null;

/** Minimum span when fitting a single point (≈ zoom 14 on a typical phone). */
const MIN_FIT_ZOOM = 14;

/**
 * Asymmetric chrome-safe fit: expand bbox by pad fractions of span, then
 * center = padded bbox midpoint (so bottom pad shifts center north).
 */
export function regionForFitCoords(
  coords: { latitude: number; longitude: number }[],
  padding: EdgePadding,
  viewportWidthPx: number,
  viewportHeightPx: number,
): MapRegion | null {
  if (coords.length === 0) return null;

  let minLat = coords[0].latitude;
  let maxLat = minLat;
  let minLng = coords[0].longitude;
  let maxLng = minLng;
  for (const c of coords) {
    minLat = Math.min(minLat, c.latitude);
    maxLat = Math.max(maxLat, c.latitude);
    minLng = Math.min(minLng, c.longitude);
    maxLng = Math.max(maxLng, c.longitude);
  }

  let latSpan = maxLat - minLat;
  let lngSpan = maxLng - minLng;

  if (latSpan < 1e-8 || lngSpan < 1e-8) {
    const w = Math.max(viewportWidthPx, 1);
    const h = Math.max(viewportHeightPx, 1);
    const longitudeDelta =
      (360 * w) / (Math.pow(2, MIN_FIT_ZOOM) * 256);
    const latitudeDelta = longitudeDelta * (h / w);
    if (latSpan < 1e-8) {
      const mid = (minLat + maxLat) / 2;
      minLat = mid - latitudeDelta / 2;
      maxLat = mid + latitudeDelta / 2;
      latSpan = maxLat - minLat;
    }
    if (lngSpan < 1e-8) {
      const mid = (minLng + maxLng) / 2;
      minLng = mid - longitudeDelta / 2;
      maxLng = mid + longitudeDelta / 2;
      lngSpan = maxLng - minLng;
    }
  }

  const vh = Math.max(viewportHeightPx, 1);
  const vw = Math.max(viewportWidthPx, 1);
  const padLatTop = (padding.top / vh) * latSpan;
  const padLatBottom = (padding.bottom / vh) * latSpan;
  const padLngLeft = (padding.left / vw) * lngSpan;
  const padLngRight = (padding.right / vw) * lngSpan;

  const north = maxLat + padLatTop;
  const south = minLat - padLatBottom;
  const east = maxLng + padLngRight;
  const west = minLng - padLngLeft;

  return {
    latitude: (north + south) / 2,
    longitude: (east + west) / 2,
    latitudeDelta: Math.max(north - south, 1e-6),
    longitudeDelta: Math.max(east - west, 1e-6),
  };
}

export function fitCoords(
  map: MapViewRef,
  coords: { latitude: number; longitude: number }[],
  padding: EdgePadding,
  durationMs: number,
  viewportWidthPx: number,
  viewportHeightPx: number,
): void {
  if (!map || coords.length === 0) return;
  const region = regionForFitCoords(
    coords,
    padding,
    viewportWidthPx,
    viewportHeightPx,
  );
  if (!region) return;
  animateRegion(map, region, durationMs);
}

export function animateRegion(
  map: MapViewRef,
  region: MapRegion,
  durationMs: number,
): void {
  if (!map) return;
  map.animateToRegion(region, Math.max(0, durationMs));
}

/** Region centered at lat/lng for a given mercator-ish zoom. */
export function regionFromZoom(
  latitude: number,
  longitude: number,
  zoom: number,
  viewportWidthPx: number,
  viewportHeightPx: number,
): MapRegion {
  const w = Math.max(viewportWidthPx, 1);
  const h = Math.max(viewportHeightPx, 1);
  const longitudeDelta = (360 * w) / (Math.pow(2, zoom) * 256);
  return {
    latitude,
    longitude,
    longitudeDelta,
    latitudeDelta: longitudeDelta * (h / w),
  };
}

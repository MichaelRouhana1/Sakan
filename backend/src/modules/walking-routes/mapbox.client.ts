export type LngLat = { lng: number; lat: number };

export type MapboxWalkingOk = {
  coords: LngLat[];
  distanceM: number;
  durationS: number;
};

type DirectionsJson = {
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: { type?: string; coordinates?: [number, number][] };
  }>;
};

const MAPBOX_TIMEOUT_MS = 8_000;
const DIRECTIONS_URL = "https://api.mapbox.com/directions/v5/mapbox/walking";

/**
 * Walking Directions. Returns null on timeout / non-OK / bad geometry —
 * callers must not persist a fallback.
 */
export async function fetchMapboxWalkingRoute(
  from: LngLat,
  to: LngLat,
  token: string,
): Promise<MapboxWalkingOk | null> {
  const path = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `${DIRECTIONS_URL}/${path}?geometries=geojson&overview=full&access_token=${encodeURIComponent(token)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MAPBOX_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      console.warn(
        `[walking-route] Mapbox HTTP ${response.status} from=${from.lng},${from.lat} to=${to.lng},${to.lat}`,
      );
      return null;
    }
    const json = (await response.json()) as DirectionsJson;
    const route = json.routes?.[0];
    const raw = route?.geometry?.coordinates;
    if (!raw || raw.length < 2) {
      console.warn("[walking-route] Mapbox returned no usable geometry");
      return null;
    }
    return {
      coords: raw.map(([lng, lat]) => ({ lng, lat })),
      distanceM: Math.round(route.distance ?? 0),
      durationS: Math.round(route.duration ?? 0),
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    console.warn(
      aborted
        ? "[walking-route] Mapbox timed out"
        : "[walking-route] Mapbox network error",
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

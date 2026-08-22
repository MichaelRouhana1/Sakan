import { getMapboxToken } from "@/lib/mapboxEnv";

export type LngLat = { lng: number; lat: number };

export type WalkingRouteResult = {
  coords: LngLat[];
  distanceM: number;
  durationS: number;
  status: "ok" | "fallback";
};

const cache = new Map<string, WalkingRouteResult>();
const inflight = new Map<string, AbortController>();

export function walkingRouteKey(
  listingId: string,
  campusSlug: string,
): string {
  return `${listingId}|${campusSlug}`;
}

function straightFallback(from: LngLat, to: LngLat, distanceM: number): WalkingRouteResult {
  return {
    coords: [from, to],
    distanceM,
    durationS: 0,
    status: "fallback",
  };
}

function haversineM(a: LngLat, b: LngLat): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}

type DirectionsJson = {
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: { type?: string; coordinates?: [number, number][] };
  }>;
};

export async function fetchWalkingRoute(
  from: LngLat,
  to: LngLat,
  key: string,
  signal?: AbortSignal,
): Promise<WalkingRouteResult> {
  const hit = cache.get(key);
  if (hit) {
    return hit;
  }

  const fallback = straightFallback(from, to, haversineM(from, to));
  const token = getMapboxToken();
  if (!token) {
    cache.set(key, fallback);
    return fallback;
  }

  const prev = inflight.get(key);
  prev?.abort();
  const controller = new AbortController();
  inflight.set(key, controller);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  const path = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${path}?geometries=geojson&overview=full&access_token=${encodeURIComponent(token)}`;

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      cache.set(key, fallback);
      return fallback;
    }
    const json = (await res.json()) as DirectionsJson;
    const route = json.routes?.[0];
    const coords = route?.geometry?.coordinates;
    if (!coords || coords.length < 2) {
      cache.set(key, fallback);
      return fallback;
    }
    const result: WalkingRouteResult = {
      coords: coords.map(([lng, lat]) => ({ lng, lat })),
      distanceM: Math.round(route.distance ?? fallback.distanceM),
      durationS: Math.round(route.duration ?? 0),
      status: "ok",
    };
    cache.set(key, result);
    return result;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw err;
    }
    cache.set(key, fallback);
    return fallback;
  } finally {
    inflight.delete(key);
    signal?.removeEventListener("abort", onAbort);
  }
}

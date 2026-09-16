import axios from "axios";
import { api } from "@/lib/api";

export type LngLat = { lng: number; lat: number };

export type WalkingRouteResult = {
  coords: LngLat[];
  distanceM: number;
  durationS: number;
  status: "ok" | "fallback";
};

type WalkingRouteResponse = { data: WalkingRouteResult };

const cache = new Map<string, WalkingRouteResult>();

function roundCoord(n: number): string {
  return n.toFixed(5);
}

export function walkingRouteKey(
  listingId: string,
  campusSlug: string,
  from?: LngLat,
  to?: LngLat,
): string {
  if (!from || !to) return `${listingId}|${campusSlug}`;
  return `${listingId}|${campusSlug}|${roundCoord(from.lng)}|${roundCoord(from.lat)}|${roundCoord(to.lng)}|${roundCoord(to.lat)}`;
}

function straightFallback(from: LngLat, to: LngLat): WalkingRouteResult {
  return {
    coords: [from, to],
    distanceM: haversineM(from, to),
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

function isAbortError(err: unknown): boolean {
  if (axios.isCancel(err)) return true;
  if (axios.isAxiosError(err) && err.code === "ERR_CANCELED") return true;
  return err instanceof Error && (err.name === "AbortError" || err.name === "CanceledError");
}

function toAbortError(err: unknown): Error {
  if (err instanceof Error && err.name === "AbortError") return err;
  const abort = new Error("Aborted");
  abort.name = "AbortError";
  return abort;
}

function isOkRoute(value: unknown): value is WalkingRouteResult {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<WalkingRouteResult>;
  return (
    row.status === "ok" &&
    Array.isArray(row.coords) &&
    row.coords.length >= 2 &&
    typeof row.distanceM === "number" &&
    typeof row.durationS === "number"
  );
}

export async function fetchWalkingRoute(
  listingId: string,
  campusSlug: string,
  from: LngLat,
  to: LngLat,
  signal?: AbortSignal,
): Promise<WalkingRouteResult> {
  const key = walkingRouteKey(listingId, campusSlug, from, to);
  const hit = cache.get(key);
  if (hit) return hit;

  const fallback = straightFallback(from, to);
  try {
    const { data } = await api.get<WalkingRouteResponse>(
      `/api/listings/${listingId}/walking-route`,
      { params: { campusSlug }, signal },
    );
    if (isOkRoute(data.data)) {
      cache.set(key, data.data);
      return data.data;
    }
    return fallback;
  } catch (err) {
    if (isAbortError(err)) {
      throw toAbortError(err);
    }
    return fallback;
  }
}

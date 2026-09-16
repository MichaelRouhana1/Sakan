import { loadEnv } from "../../config/env.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { universitiesRepository } from "../universities/universities.repository.js";
import { fetchMapboxWalkingRoute } from "./mapbox.client.js";
import {
  walkingRoutesRepository,
  type CachedWalkingRoute,
} from "./walking-routes.repository.js";
import type {
  WalkingRouteLngLat,
  WalkingRouteResult,
} from "./walking-routes.schemas.js";

const PIN_EPSILON_M = 5;
const NEGATIVE_TTL_MS = 30_000;

type Pin = WalkingRouteLngLat;

const inflight = new Map<string, Promise<WalkingRouteResult>>();
const negativeUntil = new Map<string, number>();

function haversineM(a: Pin, b: Pin): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function pinsMatch(cached: CachedWalkingRoute, listing: Pin, campus: Pin): boolean {
  return (
    haversineM(
      { lng: cached.listingLng, lat: cached.listingLat },
      listing,
    ) <= PIN_EPSILON_M &&
    haversineM(
      { lng: cached.campusLng, lat: cached.campusLat },
      campus,
    ) <= PIN_EPSILON_M
  );
}

function straightFallback(from: Pin, to: Pin): WalkingRouteResult {
  return {
    coords: [from, to],
    distanceM: Math.round(haversineM(from, to)),
    durationS: 0,
    status: "fallback",
  };
}

function coalesceKey(listingId: string, campusId: string): string {
  return `${listingId}|${campusId}|walking`;
}

function rememberNegative(key: string): void {
  negativeUntil.set(key, Date.now() + NEGATIVE_TTL_MS);
}

function isNegative(key: string): boolean {
  const until = negativeUntil.get(key);
  if (until == null) return false;
  if (until <= Date.now()) {
    negativeUntil.delete(key);
    return false;
  }
  return true;
}

export class WalkingRoutesService {
  async getWalkingRoute(
    listingId: string,
    campusSlug: string,
  ): Promise<WalkingRouteResult> {
    const listing = await walkingRoutesRepository.findListingPin(listingId);
    if (!listing) {
      throw new NotFoundError("Listing not found");
    }
    if (listing.status === "archived" || listing.status === "removed") {
      throw new NotFoundError("Listing not found");
    }
    if (listing.lng == null || listing.lat == null) {
      throw new ValidationError("Listing has no location");
    }

    const campus = await universitiesRepository.findBySlug(campusSlug);
    if (!campus) {
      throw new NotFoundError("Campus not found");
    }
    if (campus.lng == null || campus.lat == null) {
      throw new ValidationError("Campus has no location");
    }

    const listingPin: Pin = { lng: listing.lng, lat: listing.lat };
    const campusPin: Pin = { lng: campus.lng, lat: campus.lat };

    const cached = await walkingRoutesRepository.findWalking(
      listing.id,
      campus.id,
    );
    if (cached && pinsMatch(cached, listingPin, campusPin)) {
      return {
        coords: cached.coords,
        distanceM: cached.distanceM,
        durationS: cached.durationS,
        status: "ok",
      };
    }

    const key = coalesceKey(listing.id, campus.id);
    if (isNegative(key)) {
      return straightFallback(campusPin, listingPin);
    }

    const pending = inflight.get(key);
    if (pending) return pending;

    const promise = this.fetchPersist(
      listing.id,
      campus.id,
      campusSlug,
      campusPin,
      listingPin,
      key,
    ).finally(() => {
      inflight.delete(key);
    });
    inflight.set(key, promise);
    return promise;
  }

  async deleteByListingId(listingId: string): Promise<void> {
    await walkingRoutesRepository.deleteByListingId(listingId);
  }

  async deleteByCampusId(campusId: string): Promise<void> {
    await walkingRoutesRepository.deleteByCampusId(campusId);
  }

  private async fetchPersist(
    listingId: string,
    campusId: string,
    campusSlug: string,
    campusPin: Pin,
    listingPin: Pin,
    key: string,
  ): Promise<WalkingRouteResult> {
    const fallback = straightFallback(campusPin, listingPin);
    const token = loadEnv().MAPBOX_ACCESS_TOKEN;
    if (!token) {
      console.warn("[walking-route] MAPBOX_ACCESS_TOKEN unset — returning fallback");
      rememberNegative(key);
      return fallback;
    }

    console.log(
      `[walking-route] Mapbox miss listing=${listingId} campus=${campusSlug}`,
    );
    const routed = await fetchMapboxWalkingRoute(campusPin, listingPin, token);
    if (!routed || routed.coords.length < 2) {
      rememberNegative(key);
      return fallback;
    }

    const result: WalkingRouteResult = {
      coords: routed.coords,
      distanceM: routed.distanceM || fallback.distanceM,
      durationS: routed.durationS,
      status: "ok",
    };

    try {
      await walkingRoutesRepository.upsertWalking({
        listingId,
        campusId,
        listingLng: listingPin.lng,
        listingLat: listingPin.lat,
        campusLng: campusPin.lng,
        campusLat: campusPin.lat,
        distanceM: result.distanceM,
        durationS: result.durationS,
        coords: result.coords,
      });
    } catch (err) {
      console.warn("[walking-route] failed to persist cache row", err);
    }
    negativeUntil.delete(key);
    return result;
  }
}

export const walkingRoutesService = new WalkingRoutesService();

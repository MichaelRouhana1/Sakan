import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  listingCampusRoutes,
  listings,
  type RouteLngLat,
} from "../../db/schema/index.js";

export const WALKING_PROFILE = "walking";

export type ListingPin = {
  id: string;
  status: string;
  lng: number | null;
  lat: number | null;
};

export type CachedWalkingRoute = {
  listingId: string;
  campusId: string;
  profile: string;
  listingLng: number;
  listingLat: number;
  campusLng: number;
  campusLat: number;
  distanceM: number;
  durationS: number;
  coords: RouteLngLat[];
};

export type UpsertWalkingRouteInput = {
  listingId: string;
  campusId: string;
  listingLng: number;
  listingLat: number;
  campusLng: number;
  campusLat: number;
  distanceM: number;
  durationS: number;
  coords: RouteLngLat[];
};

function parseCoord(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseCoords(value: unknown): RouteLngLat[] {
  if (!Array.isArray(value)) return [];
  const out: RouteLngLat[] = [];
  for (const point of value) {
    if (!point || typeof point !== "object") continue;
    const lng = Number((point as { lng?: unknown }).lng);
    const lat = Number((point as { lat?: unknown }).lat);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    out.push({ lng, lat });
  }
  return out;
}

export class WalkingRoutesRepository {
  async findListingPin(listingId: string): Promise<ListingPin | null> {
    const [row] = await db
      .select({
        id: listings.id,
        status: listings.status,
        lng: sql<number | null>`ST_X(${listings.location}::geometry)`.as("lng"),
        lat: sql<number | null>`ST_Y(${listings.location}::geometry)`.as("lat"),
      })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);
    if (!row) return null;
    return {
      id: row.id,
      status: String(row.status),
      lng: parseCoord(row.lng),
      lat: parseCoord(row.lat),
    };
  }

  async findWalking(
    listingId: string,
    campusId: string,
  ): Promise<CachedWalkingRoute | null> {
    const [row] = await db
      .select({
        listingId: listingCampusRoutes.listingId,
        campusId: listingCampusRoutes.campusId,
        profile: listingCampusRoutes.profile,
        listingLng: listingCampusRoutes.listingLng,
        listingLat: listingCampusRoutes.listingLat,
        campusLng: listingCampusRoutes.campusLng,
        campusLat: listingCampusRoutes.campusLat,
        distanceM: listingCampusRoutes.distanceM,
        durationS: listingCampusRoutes.durationS,
        coords: listingCampusRoutes.coords,
      })
      .from(listingCampusRoutes)
      .where(
        and(
          eq(listingCampusRoutes.listingId, listingId),
          eq(listingCampusRoutes.campusId, campusId),
          eq(listingCampusRoutes.profile, WALKING_PROFILE),
        ),
      )
      .limit(1);
    if (!row) return null;
    const coords = parseCoords(row.coords);
    if (coords.length < 2) return null;
    return { ...row, coords };
  }

  async upsertWalking(input: UpsertWalkingRouteInput): Promise<void> {
    await db
      .insert(listingCampusRoutes)
      .values({
        listingId: input.listingId,
        campusId: input.campusId,
        profile: WALKING_PROFILE,
        listingLng: input.listingLng,
        listingLat: input.listingLat,
        campusLng: input.campusLng,
        campusLat: input.campusLat,
        distanceM: input.distanceM,
        durationS: input.durationS,
        coords: input.coords,
      })
      .onConflictDoUpdate({
        target: [
          listingCampusRoutes.listingId,
          listingCampusRoutes.campusId,
          listingCampusRoutes.profile,
        ],
        set: {
          listingLng: input.listingLng,
          listingLat: input.listingLat,
          campusLng: input.campusLng,
          campusLat: input.campusLat,
          distanceM: input.distanceM,
          durationS: input.durationS,
          coords: input.coords,
          updatedAt: new Date(),
        },
      });
  }

  async deleteByListingId(listingId: string): Promise<void> {
    await db
      .delete(listingCampusRoutes)
      .where(eq(listingCampusRoutes.listingId, listingId));
  }

  async deleteByCampusId(campusId: string): Promise<void> {
    await db
      .delete(listingCampusRoutes)
      .where(eq(listingCampusRoutes.campusId, campusId));
  }
}

export const walkingRoutesRepository = new WalkingRoutesRepository();

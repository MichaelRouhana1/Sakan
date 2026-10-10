import { and, eq, sql } from "drizzle-orm";
import { db, type Database } from "../../db/index.js";
import { listingCampusRoutes, placeCampusRoutes, places, listings, type RouteLngLat } from "../../db/schema/index.js";

export const WALKING_PROFILE = "walking";
export type ListingPin = { id: string; placeId: string; status: string; lng: number | null; lat: number | null };
export type CachedWalkingRoute = {
 listingId: string; campusId: string; profile: string;
 listingLng: number; listingLat: number; campusLng: number; campusLat: number;
 distanceM: number; durationS: number; coords: RouteLngLat[];
};
export type UpsertWalkingRouteInput = Omit<CachedWalkingRoute,"profile">;
type RouteDatabase = Pick<Database,"select"|"insert"|"delete"|"execute">;
function parseCoord(value: unknown): number | null {
 if (value == null || value === "") return null;
 const n=Number(value); return Number.isFinite(n)?n:null;
}
function parseCoords(value: unknown): RouteLngLat[] {
 if(!Array.isArray(value))return [];
 const coords: RouteLngLat[] = [];
 for (const point of value) {
  if (!point || typeof point !== "object") continue;
  const lng = Number((point as { lng?: unknown }).lng);
  const lat = Number((point as { lat?: unknown }).lat);
  if (Number.isFinite(lng) && Number.isFinite(lat)) coords.push({ lng, lat });
 }
 return coords;
}
export class WalkingRoutesRepository {
 constructor(private readonly database: RouteDatabase = db) {}

 // Transaction-scoped database lock also coalesces misses across API processes.
 async withPlaceLock<T>(placeId: string, campusId: string, action: (repository: WalkingRoutesRepository)=>Promise<T>): Promise<T> {
  return db.transaction(async tx=>{
   await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${placeId + "|" + campusId + "|walking"}, 0))`);
   return action(new WalkingRoutesRepository(tx));
  });
 }
 async findListingPin(listingId: string): Promise<ListingPin|null> {
  const [row]=await this.database.select({
   id:listings.id,placeId:places.id,status:listings.status,
   lng:sql<number|null>`ST_X(${places.location}::geometry)`,lat:sql<number|null>`ST_Y(${places.location}::geometry)`,
  }).from(listings).innerJoin(places,eq(places.id,listings.placeId)).where(eq(listings.id,listingId)).limit(1);
  return row?{...row,lng:parseCoord(row.lng),lat:parseCoord(row.lat)}:null;
 }
 async findWalking(listingId: string,campusId: string): Promise<CachedWalkingRoute|null> {
  const [row]=await this.database.select({
   listingId:listings.id,campusId:placeCampusRoutes.campusId,profile:placeCampusRoutes.profile,
   listingLng:placeCampusRoutes.placeLng,listingLat:placeCampusRoutes.placeLat,
   campusLng:placeCampusRoutes.campusLng,campusLat:placeCampusRoutes.campusLat,
   distanceM:placeCampusRoutes.distanceM,durationS:placeCampusRoutes.durationS,coords:placeCampusRoutes.coords,
  }).from(placeCampusRoutes).innerJoin(listings,eq(listings.placeId,placeCampusRoutes.placeId))
  .where(and(eq(listings.id,listingId),eq(placeCampusRoutes.campusId,campusId),eq(placeCampusRoutes.profile,WALKING_PROFILE))).limit(1);
  if(!row)return null;const coords=parseCoords(row.coords);
  return coords.length<2?null:{...row,coords};
 }
 async upsertWalking(input: UpsertWalkingRouteInput): Promise<void> {
  // Compare the current pins in the INSERT itself. A route fetched before a
  // concurrent location edit must not repopulate the cache with stale geometry.
  await this.database.execute(sql`
   INSERT INTO place_campus_routes(place_id,campus_id,profile,place_lng,place_lat,campus_lng,campus_lat,distance_m,duration_s,coords)
   SELECT p.id,u.id,'walking',${input.listingLng},${input.listingLat},${input.campusLng},${input.campusLat},${input.distanceM},${input.durationS},${JSON.stringify(input.coords)}::jsonb
   FROM listings l JOIN places p ON p.id=l.place_id JOIN universities u ON u.id=${input.campusId}::uuid
   WHERE l.id=${input.listingId}::uuid
     AND ST_X(p.location::geometry)=${input.listingLng} AND ST_Y(p.location::geometry)=${input.listingLat}
     AND ST_X(u.location::geometry)=${input.campusLng} AND ST_Y(u.location::geometry)=${input.campusLat}
   ON CONFLICT(place_id,campus_id,profile) DO UPDATE SET
    place_lng=EXCLUDED.place_lng,place_lat=EXCLUDED.place_lat,campus_lng=EXCLUDED.campus_lng,campus_lat=EXCLUDED.campus_lat,
    distance_m=EXCLUDED.distance_m,duration_s=EXCLUDED.duration_s,coords=EXCLUDED.coords,updated_at=now()
  `);
 }
 async deleteByListingId(listingId: string): Promise<void> {
  await this.database.delete(placeCampusRoutes).where(sql`${placeCampusRoutes.placeId} IN (SELECT place_id FROM listings WHERE id=${listingId}::uuid)`);
  await this.database.delete(listingCampusRoutes).where(sql`${listingCampusRoutes.listingId} IN (SELECT id FROM listings WHERE place_id IN (SELECT place_id FROM listings WHERE id=${listingId}::uuid))`);
 }
 async deleteByCampusId(campusId: string): Promise<void> {
  await this.database.delete(placeCampusRoutes).where(eq(placeCampusRoutes.campusId,campusId));
  await this.database.delete(listingCampusRoutes).where(eq(listingCampusRoutes.campusId,campusId));
 }
}
export const walkingRoutesRepository = new WalkingRoutesRepository();

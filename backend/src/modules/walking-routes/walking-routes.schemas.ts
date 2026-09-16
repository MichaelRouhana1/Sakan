import { z } from "zod";

export const walkingRouteParamsSchema = z.object({
  id: z.string().uuid(),
});

export const walkingRouteQuerySchema = z.object({
  campusSlug: z.string().trim().min(1).max(64),
});

export type WalkingRouteLngLat = { lng: number; lat: number };

export type WalkingRouteResult = {
  coords: WalkingRouteLngLat[];
  distanceM: number;
  durationS: number;
  status: "ok" | "fallback";
};

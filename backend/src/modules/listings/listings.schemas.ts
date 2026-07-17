import { z } from "zod";

export const createListingSchema = z.object({
  listingType: z.enum([
    "entire_apartment",
    "studio",
    "private_room",
    "shared_dorm_bed",
  ]),
  targetAudience: z.enum(["anyone", "students_only"]).default("anyone"),
  monthlyRentUsd: z.number().int().positive(),
  electricity: z.enum(["solar", "generator_24_7", "scheduled_cuts"]),
  water: z.enum(["state_well_24_7", "tank_delivery"]),
  wifiIncluded: z.boolean().default(false),
  routerUps: z.boolean().default(false),
  elevator24_7: z.boolean().default(false),
  area: z.string().min(1).max(128),
  landmark: z.string().max(256).optional(),
  /** WKT POINT(lng lat) — optional on draft */
  locationWkt: z.string().optional(),
  photoUrls: z.array(z.string().url()).max(8).default([]),
});

export const listListingsQuerySchema = z.object({
  area: z.string().optional(),
  universitySlug: z.string().optional(),
  status: z.enum(["draft", "active", "archived", "removed"]).optional(),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;

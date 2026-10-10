import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgTable, timestamp, unique, uuid, varchar, doublePrecision } from "drizzle-orm/pg-core";
import { geographyPoint } from "../types/geography.js";
import { electricityStatusEnum, waterStatusEnum, smokingPolicyEnum, petsPolicyEnum, guestsPolicyEnum, targetAudienceEnum, placeKindEnum } from "./enums.js";
import { users } from "./users.js";
import { universities } from "./universities.js";
import type { RouteLngLat } from "./listing-campus-routes.js";

export const places = pgTable("places", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: placeKindEnum("kind").notNull().default("apartment"),
  city: varchar("city", { length: 128 }),
  area: varchar('area', { length: 128 }).notNull(),
  landmark: varchar('landmark', { length: 256 }),
  addressLine: varchar('address_line', { length: 256 }),
  buildingName: varchar('building_name', { length: 128 }),
  primaryCampusId: uuid('primary_campus_id').references(() => universities.id, { onDelete: 'set null' }),
  location: geographyPoint('location'),
  electricity: electricityStatusEnum('electricity').notNull(),
  electricityCutsStart: varchar('electricity_cuts_start', { length: 5 }),
  electricityCutsEnd: varchar('electricity_cuts_end', { length: 5 }),
  electricityHoursOn: integer('electricity_hours_on'),
  electricityCutWindows: jsonb('electricity_cut_windows').$type<{ start: string; end: string }[]>().notNull().default(sql`'[]'::jsonb`),
  water: waterStatusEnum('water').notNull(),
  wifiIncluded: boolean('wifi_included').notNull().default(false),
  routerUps: boolean('router_ups').notNull().default(false),
  elevator247: boolean('elevator_24_7').notNull().default(false),
  hasElevator: boolean('has_elevator').notNull().default(false),
  hasSolar: boolean('has_solar').notNull().default(false),
  generatorAmperes: integer('generator_amperes'),
  generatorIncluded: boolean('generator_included').notNull().default(false),
  conciergeIncluded: boolean('concierge_included').notNull().default(false),
  cookingGasIncluded: boolean('cooking_gas_included').notNull().default(false),
  waterBillIncluded: boolean('water_bill_included').notNull().default(false),
  buildingFeesIncluded: boolean('building_fees_included').notNull().default(false),
  parkingIncludedInRent: boolean('parking_included_in_rent').notNull().default(false),
  amenities: jsonb('amenities').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  smokingPolicy: smokingPolicyEnum('smoking_policy').notNull().default('no'),
  petsPolicy: petsPolicyEnum('pets_policy').notNull().default('no'),
  guestsPolicy: guestsPolicyEnum('guests_policy').notNull().default('restricted'),
  quietHours: boolean('quiet_hours').notNull().default(false),
  targetAudience: targetAudienceEnum('target_audience').notNull().default('anyone'),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  unique("places_id_owner_uq").on(t.id, t.ownerId),
  index("places_owner_idx").on(t.ownerId),
  index("places_location_gist").using("gist", t.location),
]);

// Keys are SQL field names, shared with the resolver. Presence means override;
// JSON null explicitly clears a nullable value; removing a key restores inheritance.
export type PlaceOverrides = Partial<{
  electricity: typeof places.$inferSelect["electricity"];
  electricity_cuts_start: typeof places.$inferSelect["electricityCutsStart"];
  electricity_cuts_end: typeof places.$inferSelect["electricityCutsEnd"];
  electricity_hours_on: typeof places.$inferSelect["electricityHoursOn"];
  electricity_cut_windows: typeof places.$inferSelect["electricityCutWindows"];
  water: typeof places.$inferSelect["water"];
  wifi_included: typeof places.$inferSelect["wifiIncluded"];
  router_ups: typeof places.$inferSelect["routerUps"];
  elevator_24_7: typeof places.$inferSelect["elevator247"];
  has_elevator: typeof places.$inferSelect["hasElevator"];
  has_solar: typeof places.$inferSelect["hasSolar"];
  generator_amperes: typeof places.$inferSelect["generatorAmperes"];
  generator_included: typeof places.$inferSelect["generatorIncluded"];
  concierge_included: typeof places.$inferSelect["conciergeIncluded"];
  cooking_gas_included: typeof places.$inferSelect["cookingGasIncluded"];
  water_bill_included: typeof places.$inferSelect["waterBillIncluded"];
  building_fees_included: typeof places.$inferSelect["buildingFeesIncluded"];
  parking_included_in_rent: typeof places.$inferSelect["parkingIncludedInRent"];
  smoking_policy: typeof places.$inferSelect["smokingPolicy"];
  pets_policy: typeof places.$inferSelect["petsPolicy"];
  guests_policy: typeof places.$inferSelect["guestsPolicy"];
  quiet_hours: typeof places.$inferSelect["quietHours"];
  target_audience: typeof places.$inferSelect["targetAudience"];
}>;

export const placePhotos = pgTable("place_photos", {
  id: uuid("id").defaultRandom().primaryKey(),
  placeId: uuid("place_id").notNull().references(() => places.id, { onDelete: "cascade" }),
  url: varchar("url", { length: 2048 }).notNull(),
  caption: varchar("caption", { length: 48 }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("place_photos_place_order_idx").on(t.placeId, t.sortOrder, t.id)]);

export const placeCampusRoutes = pgTable("place_campus_routes", {
  id: uuid("id").defaultRandom().primaryKey(),
  placeId: uuid("place_id").notNull().references(() => places.id, { onDelete: "cascade" }),
  campusId: uuid("campus_id").notNull().references(() => universities.id, { onDelete: "cascade" }),
  profile: varchar("profile", { length: 16 }).notNull().default("walking"),
  placeLng: doublePrecision("place_lng").notNull(),
  placeLat: doublePrecision("place_lat").notNull(),
  campusLng: doublePrecision("campus_lng").notNull(),
  campusLat: doublePrecision("campus_lat").notNull(),
  distanceM: integer("distance_m").notNull(),
  durationS: integer("duration_s").notNull(),
  coords: jsonb("coords").$type<RouteLngLat[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  unique("place_campus_routes_place_campus_profile_uq").on(t.placeId, t.campusId, t.profile),
  check("place_routes_nonnegative", sql`${t.distanceM} >= 0 AND ${t.durationS} >= 0`),
]);


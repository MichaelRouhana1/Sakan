import {
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { listings } from "./listings.js";
import { universities } from "./universities.js";

export type RouteLngLat = { lng: number; lat: number };

/**
 * Cached Mapbox route polylines (listing pin ↔ campus gate).
 * `profile` is `walking` today; a later `driving` row can share this table.
 */
export const listingCampusRoutes = pgTable(
  "listing_campus_routes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    campusId: uuid("campus_id")
      .notNull()
      .references(() => universities.id, { onDelete: "cascade" }),
    profile: varchar("profile", { length: 16 }).notNull().default("walking"),
    listingLng: doublePrecision("listing_lng").notNull(),
    listingLat: doublePrecision("listing_lat").notNull(),
    campusLng: doublePrecision("campus_lng").notNull(),
    campusLat: doublePrecision("campus_lat").notNull(),
    distanceM: integer("distance_m").notNull(),
    durationS: integer("duration_s").notNull(),
    coords: jsonb("coords").$type<RouteLngLat[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("listing_campus_routes_listing_campus_profile_uidx").on(
      table.listingId,
      table.campusId,
      table.profile,
    ),
  ],
);

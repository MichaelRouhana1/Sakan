import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { geographyPoint } from "../types/geography.js";
import {
  electricityStatusEnum,
  listingStatusEnum,
  listingTypeEnum,
  targetAudienceEnum,
  waterStatusEnum,
} from "./enums.js";
import { users } from "./users.js";

export const listings = pgTable("listings", {
  id: uuid("id").defaultRandom().primaryKey(),
  posterId: uuid("poster_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: listingStatusEnum("status").notNull().default("draft"),
  listingType: listingTypeEnum("listing_type").notNull(),
  targetAudience: targetAudienceEnum("target_audience")
    .notNull()
    .default("anyone"),
  /** Whole Fresh USD dollars (no cents). */
  monthlyRentUsd: integer("monthly_rent_usd").notNull(),
  electricity: electricityStatusEnum("electricity").notNull(),
  water: waterStatusEnum("water").notNull(),
  wifiIncluded: boolean("wifi_included").notNull().default(false),
  routerUps: boolean("router_ups").notNull().default(false),
  elevator24_7: boolean("elevator_24_7").notNull().default(false),
  area: varchar("area", { length: 128 }).notNull(),
  landmark: varchar("landmark", { length: 256 }),
  /** Nullable while draft; required before publish (enforced in Service). */
  location: geographyPoint("location"),
  viewCount: integer("view_count").notNull().default(0),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  boostedUntil: timestamp("boosted_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const listingPhotos = pgTable("listing_photos", {
  id: uuid("id").defaultRandom().primaryKey(),
  listingId: uuid("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  url: varchar("url", { length: 2048 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

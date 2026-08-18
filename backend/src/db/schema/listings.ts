import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { geographyPoint } from "../types/geography.js";
import {
  electricityStatusEnum,
  furnishingTypeEnum,
  genderRestrictionEnum,
  guestsPolicyEnum,
  leaseTermEnum,
  listingPosterRoleEnum,
  listingPropertyTypeEnum,
  listingStatusEnum,
  listingTypeEnum,
  paymentModalityEnum,
  petsPolicyEnum,
  priceBasisEnum,
  smokingPolicyEnum,
  spaceTypeEnum,
  targetAudienceEnum,
  waterStatusEnum,
} from "./enums.js";
import { universities } from "./universities.js";
import { users } from "./users.js";

export const listings = pgTable("listings", {
  id: uuid("id").defaultRandom().primaryKey(),
  posterId: uuid("poster_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: listingStatusEnum("status").notNull().default("draft"),
  listingType: listingTypeEnum("listing_type").notNull(),
  spaceType: spaceTypeEnum("space_type").notNull().default("entire_place"),
  propertyType: listingPropertyTypeEnum("property_type")
    .notNull()
    .default("apartment"),
  priceBasis: priceBasisEnum("price_basis")
    .notNull()
    .default("per_unit_month"),
  targetAudience: targetAudienceEnum("target_audience")
    .notNull()
    .default("anyone"),
  genderRestriction: genderRestrictionEnum("gender_restriction")
    .notNull()
    .default("anyone"),
  /** Whole Fresh USD dollars (no cents). */
  monthlyRentUsd: integer("monthly_rent_usd").notNull(),
  securityDepositUsd: integer("security_deposit_usd").notNull().default(0),
  leaseTerm: leaseTermEnum("lease_term").notNull().default("flexible"),
  availableFrom: date("available_from"),
  paymentModality: paymentModalityEnum("payment_modality")
    .notNull()
    .default("monthly"),
  electricity: electricityStatusEnum("electricity").notNull(),
  water: waterStatusEnum("water").notNull(),
  wifiIncluded: boolean("wifi_included").notNull().default(false),
  routerUps: boolean("router_ups").notNull().default(false),
  elevator24_7: boolean("elevator_24_7").notNull().default(false),
  hasElevator: boolean("has_elevator").notNull().default(false),
  hasSolar: boolean("has_solar").notNull().default(false),
  generatorAmperes: integer("generator_amperes"),
  generatorIncluded: boolean("generator_included").notNull().default(false),
  conciergeIncluded: boolean("concierge_included").notNull().default(false),
  cookingGasIncluded: boolean("cooking_gas_included").notNull().default(false),
  amenities: jsonb("amenities")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  lookingForRoommate: boolean("looking_for_roommate").notNull().default(false),
  bedrooms: integer("bedrooms").notNull().default(1),
  beds: integer("beds").notNull().default(1),
  bathrooms: real("bathrooms").notNull().default(1),
  maxOccupancy: integer("max_occupancy").notNull().default(1),
  furnishingType: furnishingTypeEnum("furnishing_type")
    .notNull()
    .default("furnished"),
  floorNumber: integer("floor_number").notNull().default(0),
  areaSqm: integer("area_sqm"),
  smokingPolicy: smokingPolicyEnum("smoking_policy").notNull().default("no"),
  petsPolicy: petsPolicyEnum("pets_policy").notNull().default("no"),
  guestsPolicy: guestsPolicyEnum("guests_policy").notNull().default("restricted"),
  quietHours: boolean("quiet_hours").notNull().default(false),
  title: varchar("title", { length: 60 }).notNull().default(""),
  description: text("description").notNull().default(""),
  highlightTags: jsonb("highlight_tags")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  listingPosterRole: listingPosterRoleEnum("listing_poster_role")
    .notNull()
    .default("landlord"),
  contactName: varchar("contact_name", { length: 80 }).notNull().default(""),
  contactPhone: varchar("contact_phone", { length: 32 }),
  whatsappNumber: varchar("whatsapp_number", { length: 32 }),
  area: varchar("area", { length: 128 }).notNull(),
  landmark: varchar("landmark", { length: 256 }),
  addressLine: varchar("address_line", { length: 256 }),
  buildingName: varchar("building_name", { length: 128 }),
  primaryCampusId: uuid("primary_campus_id").references(() => universities.id, {
    onDelete: "set null",
  }),
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
  caption: varchar("caption", { length: 48 }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

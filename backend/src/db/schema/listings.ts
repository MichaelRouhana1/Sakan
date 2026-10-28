import {
  boolean,
  check,
  foreignKey,
  index,
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
import {
  furnishingTypeEnum,
  leaseTermEnum,
  listingPosterRoleEnum,
  listingPropertyTypeEnum,
  listingAvailabilityEnum,
  listingStatusEnum,
  paymentModalityEnum,
  priceBasisEnum,
  spaceTypeEnum,
} from "./enums.js";
import { users } from "./users.js";
import { places, type PlaceOverrides } from "./places.js";
import { unitTypeEnum, bathroomPrivacyEnum, unitGenderRuleEnum } from "./enums.js";

export const listings = pgTable("listings", {
  id: uuid("id").defaultRandom().primaryKey(),
  placeId: uuid("place_id").notNull().default(sql`NULL`),
  unitType: unitTypeEnum("unit_type").notNull().default(sql`NULL`),
  bathroomPrivacy: bathroomPrivacyEnum("bathroom_privacy"),
  unitAmenities: jsonb("unit_amenities").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  placeOverrides: jsonb("place_overrides").$type<PlaceOverrides>().notNull().default(sql`'{}'::jsonb`),
  amenityOverrides: jsonb("amenity_overrides").$type<Record<string, boolean>>().notNull().default(sql`'{}'::jsonb`),
  bedsTotal: integer("beds_total"),
  bedsAvailable: integer("beds_available"),
  inventoryNeedsConfirmation: boolean("inventory_needs_confirmation").notNull().default(false),
  genderRule: unitGenderRuleEnum("gender_rule").notNull().default(sql`NULL`),
  hidden: boolean("hidden").notNull().default(false),
  inventoryVersion: integer("inventory_version").notNull().default(0),
  posterId: uuid("poster_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: listingStatusEnum("status").notNull().default("draft"),
  /** Offer state while the listing is live. Rented leaves public search immediately. */
  availability: listingAvailabilityEnum("availability")
    .notNull()
    .default("available"),
  spaceType: spaceTypeEnum("space_type").notNull().default("entire_place"),
  propertyType: listingPropertyTypeEnum("property_type")
    .notNull()
    .default("apartment"),
  priceBasis: priceBasisEnum("price_basis")
    .notNull()
    .default("per_unit_month"),
  /** Whole Fresh USD dollars (no cents). */
  monthlyRentUsd: integer("monthly_rent_usd").notNull(),
  securityDepositUsd: integer("security_deposit_usd").notNull().default(0),
  leaseTerm: leaseTermEnum("lease_term").notNull().default("flexible"),
  availableFrom: date("available_from"),
  paymentModality: paymentModalityEnum("payment_modality")
    .notNull()
    .default("monthly"),
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
  title: varchar("title", { length: 60 }).notNull().default(""),
  description: text("description").notNull().default(""),
  highlightTags: jsonb("highlight_tags")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  /** Ordered browse-card badge keys. null = automatic pills. */
  cardBadges: jsonb("card_badges").$type<string[] | null>(),
  listingPosterRole: listingPosterRoleEnum("listing_poster_role")
    .notNull()
    .default("landlord"),
  contactName: varchar("contact_name", { length: 80 }).notNull().default(""),
  contactPhone: varchar("contact_phone", { length: 32 }),
  whatsappNumber: varchar("whatsapp_number", { length: 32 }),
  contactNumbers: jsonb("contact_numbers")
    .$type<
      {
        kind: "mobile" | "landline";
        prefix: string;
        subscriber: string;
        e164: string;
        calls: boolean;
        whatsapp: boolean;
      }[]
    >()
    .notNull()
    .default(sql`'[]'::jsonb`),
  viewCount: integer("view_count").notNull().default(0),
  /**
   * Lifetime WhatsApp contact taps for this listing id.
   * Counts only while status is active. Renewals keep the same id and total.
   * Not replies, and not share-link opens.
   */
  contactTapCount: integer("contact_tap_count").notNull().default(0),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  boostedUntil: timestamp("boosted_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, t => [
  foreignKey({ name: "listings_place_owner_fk", columns: [t.placeId, t.posterId], foreignColumns: [places.id, places.ownerId] }),
  index("listings_place_idx").on(t.placeId),
  check("listing_unit_beds_check", sql`(${t.unitType} <> 'shared_bed' AND ${t.bedsTotal} IS NULL AND ${t.bedsAvailable} IS NULL AND NOT ${t.inventoryNeedsConfirmation}) OR (${t.unitType} = 'shared_bed' AND ${t.bedsTotal} IS NOT NULL AND ${t.bedsTotal} > 0 AND ((${t.bedsAvailable} IS NULL AND ${t.inventoryNeedsConfirmation}) OR (${t.bedsAvailable} IS NOT NULL AND ${t.bedsAvailable} BETWEEN 0 AND ${t.bedsTotal} AND NOT ${t.inventoryNeedsConfirmation})))`),
]);

export const listingPhotos = pgTable("listing_photos", {
  flagged: boolean("flagged").notNull().default(false),
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

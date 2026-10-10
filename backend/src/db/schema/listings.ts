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
import { geographyPoint } from "../types/geography.js";
import {
  electricityStatusEnum,
  furnishingTypeEnum,
  genderRestrictionEnum,
  guestsPolicyEnum,
  leaseTermEnum,
  listingPosterRoleEnum,
  listingPropertyTypeEnum,
  listingAvailabilityEnum,
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
import { places, type PlaceOverrides } from "./places.js";
import { unitTypeEnum, bathroomPrivacyEnum, unitGenderRuleEnum } from "./enums.js";

export const listings = pgTable("listings", {
  id: uuid("id").defaultRandom().primaryKey(),
  // A BEFORE INSERT bridge supplies these for the unchanged legacy API.
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
  electricityCutsStart: varchar("electricity_cuts_start", { length: 5 }),
  electricityCutsEnd: varchar("electricity_cuts_end", { length: 5 }),
  electricityHoursOn: integer("electricity_hours_on"),
  electricityCutWindows: jsonb("electricity_cut_windows")
    .$type<{ start: string; end: string }[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
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
  /** Municipality, tanker, or overage. False = renter pays it outside the USD rent. */
  waterBillIncluded: boolean("water_bill_included").notNull().default(false),
  /** Syndic, elevator fund, shared generator share. Distinct from concierge. */
  buildingFeesIncluded: boolean("building_fees_included").notNull().default(false),
  /** Meaningful when the parking amenity is on. False = parking is extra. */
  parkingIncludedInRent: boolean("parking_included_in_rent")
    .notNull()
    .default(false),
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

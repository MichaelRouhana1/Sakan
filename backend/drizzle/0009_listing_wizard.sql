CREATE TYPE "public"."space_type" AS ENUM('entire_place', 'private_room', 'shared_room');--> statement-breakpoint
CREATE TYPE "public"."listing_property_type" AS ENUM('apartment', 'studio', 'dormitory', 'house');--> statement-breakpoint
CREATE TYPE "public"."price_basis" AS ENUM('per_unit_month', 'per_bed_month', 'per_room_month');--> statement-breakpoint
CREATE TYPE "public"."furnishing_type" AS ENUM('furnished', 'semi', 'unfurnished');--> statement-breakpoint
CREATE TYPE "public"."smoking_policy" AS ENUM('inside', 'balcony_only', 'no');--> statement-breakpoint
CREATE TYPE "public"."pets_policy" AS ENUM('yes', 'cats_only', 'no');--> statement-breakpoint
CREATE TYPE "public"."guests_policy" AS ENUM('yes', 'no', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."lease_term" AS ENUM('semester', 'months_6', 'months_9', 'year', 'flexible');--> statement-breakpoint
CREATE TYPE "public"."payment_modality" AS ENUM('monthly', 'semester', 'quarterly');--> statement-breakpoint
CREATE TYPE "public"."listing_poster_role" AS ENUM('landlord', 'student_sublet', 'agent');--> statement-breakpoint
ALTER TYPE "public"."target_audience" ADD VALUE 'students_professionals';--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "space_type" "space_type" DEFAULT 'entire_place' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "property_type" "listing_property_type" DEFAULT 'apartment' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "price_basis" "price_basis" DEFAULT 'per_unit_month' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "security_deposit_usd" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "lease_term" "lease_term" DEFAULT 'flexible' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "available_from" date;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "payment_modality" "payment_modality" DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "has_elevator" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "has_solar" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "generator_amperes" integer;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "generator_included" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "concierge_included" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "cooking_gas_included" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "amenities" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "bedrooms" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "beds" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "bathrooms" real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "max_occupancy" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "furnishing_type" "furnishing_type" DEFAULT 'furnished' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "floor_number" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "area_sqm" integer;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "smoking_policy" "smoking_policy" DEFAULT 'no' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "pets_policy" "pets_policy" DEFAULT 'no' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "guests_policy" "guests_policy" DEFAULT 'restricted' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "quiet_hours" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "title" varchar(60) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "highlight_tags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "listing_poster_role" "listing_poster_role" DEFAULT 'landlord' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "contact_name" varchar(80) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "contact_phone" varchar(32);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "whatsapp_number" varchar(32);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "address_line" varchar(256);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "building_name" varchar(128);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "primary_campus_id" uuid;--> statement-breakpoint
ALTER TABLE "listing_photos" ADD COLUMN "caption" varchar(48);--> statement-breakpoint
UPDATE "listings" SET
  "space_type" = CASE "listing_type"
    WHEN 'private_room' THEN 'private_room'::"space_type"
    WHEN 'shared_dorm_bed' THEN 'shared_room'::"space_type"
    ELSE 'entire_place'::"space_type"
  END,
  "property_type" = CASE "listing_type"
    WHEN 'studio' THEN 'studio'::"listing_property_type"
    WHEN 'shared_dorm_bed' THEN 'dormitory'::"listing_property_type"
    ELSE 'apartment'::"listing_property_type"
  END,
  "price_basis" = CASE "listing_type"
    WHEN 'shared_dorm_bed' THEN 'per_bed_month'::"price_basis"
    WHEN 'private_room' THEN 'per_room_month'::"price_basis"
    ELSE 'per_unit_month'::"price_basis"
  END,
  "has_solar" = ("electricity" = 'solar'),
  "has_elevator" = "elevator_24_7",
  "title" = COALESCE(NULLIF("landmark", ''), 'Listing'),
  "bedrooms" = CASE "listing_type"
    WHEN 'studio' THEN 0
    WHEN 'entire_apartment' THEN 2
    ELSE 1
  END,
  "beds" = CASE "listing_type" WHEN 'shared_dorm_bed' THEN 2 ELSE 1 END,
  "max_occupancy" = CASE "listing_type" WHEN 'shared_dorm_bed' THEN 2 ELSE 1 END;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_primary_campus_id_universities_id_fk" FOREIGN KEY ("primary_campus_id") REFERENCES "public"."universities"("id") ON DELETE set null ON UPDATE no action;

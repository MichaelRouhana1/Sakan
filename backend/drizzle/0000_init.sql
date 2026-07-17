CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE "public"."user_role" AS ENUM('renter', 'poster');
CREATE TYPE "public"."user_account_status" AS ENUM('active', 'restricted', 'banned');
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'active', 'archived', 'removed');
CREATE TYPE "public"."listing_type" AS ENUM('entire_apartment', 'studio', 'private_room', 'shared_dorm_bed');
CREATE TYPE "public"."target_audience" AS ENUM('anyone', 'students_only');
CREATE TYPE "public"."electricity_status" AS ENUM('solar', 'generator_24_7', 'scheduled_cuts');
CREATE TYPE "public"."water_status" AS ENUM('state_well_24_7', 'tank_delivery');
CREATE TYPE "public"."credit_tx_status" AS ENUM('pending', 'approved', 'rejected', 'expired');
CREATE TYPE "public"."credit_bundle_type" AS ENUM('starter', 'bundle_5', 'boost_pack', 'custom');
CREATE TYPE "public"."payment_channel" AS ENUM('whish', 'omt');

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "phone" varchar(32) NOT NULL,
  "role" "user_role" NOT NULL,
  "post_credits" integer DEFAULT 0 NOT NULL,
  "boost_credits" integer DEFAULT 0 NOT NULL,
  "free_credit_claimed" boolean DEFAULT false NOT NULL,
  "account_status" "user_account_status" DEFAULT 'active' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "users_phone_unique" UNIQUE("phone")
);

CREATE TABLE IF NOT EXISTS "listings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "poster_id" uuid NOT NULL,
  "status" "listing_status" DEFAULT 'draft' NOT NULL,
  "listing_type" "listing_type" NOT NULL,
  "target_audience" "target_audience" DEFAULT 'anyone' NOT NULL,
  "monthly_rent_usd" integer NOT NULL,
  "electricity" "electricity_status" NOT NULL,
  "water" "water_status" NOT NULL,
  "wifi_included" boolean DEFAULT false NOT NULL,
  "router_ups" boolean DEFAULT false NOT NULL,
  "elevator_24_7" boolean DEFAULT false NOT NULL,
  "area" varchar(128) NOT NULL,
  "landmark" varchar(256),
  "location" geography(Point, 4326),
  "view_count" integer DEFAULT 0 NOT NULL,
  "published_at" timestamptz,
  "expires_at" timestamptz,
  "boosted_until" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "listing_photos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "listing_id" uuid NOT NULL,
  "url" varchar(2048) NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "universities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" varchar(64) NOT NULL,
  "location" geography(Point, 4326) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "universities_slug_unique" UNIQUE("slug")
);

CREATE TABLE IF NOT EXISTS "credit_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "reference_id" varchar(32) NOT NULL,
  "status" "credit_tx_status" DEFAULT 'pending' NOT NULL,
  "bundle_type" "credit_bundle_type" NOT NULL,
  "post_credits_delta" integer DEFAULT 0 NOT NULL,
  "boost_credits_delta" integer DEFAULT 0 NOT NULL,
  "amount_usd_cents" integer NOT NULL,
  "channel" "payment_channel" NOT NULL,
  "admin_note" text,
  "approved_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "credit_transactions_reference_id_unique" UNIQUE("reference_id")
);

ALTER TABLE "listings"
  ADD CONSTRAINT "listings_poster_id_users_id_fk"
  FOREIGN KEY ("poster_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "listing_photos"
  ADD CONSTRAINT "listing_photos_listing_id_listings_id_fk"
  FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "credit_transactions"
  ADD CONSTRAINT "credit_transactions_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "listings_location_gix" ON "listings" USING GIST ("location");
CREATE INDEX IF NOT EXISTS "universities_location_gix" ON "universities" USING GIST ("location");
CREATE INDEX IF NOT EXISTS "listings_status_area_idx" ON "listings" ("status", "area");
CREATE INDEX IF NOT EXISTS "listings_status_expires_at_idx" ON "listings" ("status", "expires_at");
CREATE INDEX IF NOT EXISTS "listings_poster_id_idx" ON "listings" ("poster_id");
CREATE INDEX IF NOT EXISTS "credit_transactions_status_idx" ON "credit_transactions" ("status");

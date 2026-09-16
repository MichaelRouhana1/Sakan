CREATE TABLE IF NOT EXISTS "listing_campus_routes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "listing_id" uuid NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
  "campus_id" uuid NOT NULL REFERENCES "universities"("id") ON DELETE CASCADE,
  "profile" varchar(16) DEFAULT 'walking' NOT NULL,
  "listing_lng" double precision NOT NULL,
  "listing_lat" double precision NOT NULL,
  "campus_lng" double precision NOT NULL,
  "campus_lat" double precision NOT NULL,
  "distance_m" integer NOT NULL,
  "duration_s" integer NOT NULL,
  "coords" jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "listing_campus_routes_listing_campus_profile_uidx"
    UNIQUE ("listing_id", "campus_id", "profile")
);

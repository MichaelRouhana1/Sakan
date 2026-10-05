DO $$ BEGIN
  CREATE TYPE "listing_availability" AS ENUM ('available', 'pending', 'rented');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "listings"
  ADD COLUMN IF NOT EXISTS "availability" "listing_availability" DEFAULT 'available' NOT NULL;

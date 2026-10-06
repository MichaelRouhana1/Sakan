ALTER TABLE "listings"
  ADD COLUMN IF NOT EXISTS "water_bill_included" boolean DEFAULT false NOT NULL;

ALTER TABLE "listings"
  ADD COLUMN IF NOT EXISTS "building_fees_included" boolean DEFAULT false NOT NULL;

ALTER TABLE "listings"
  ADD COLUMN IF NOT EXISTS "parking_included_in_rent" boolean DEFAULT false NOT NULL;

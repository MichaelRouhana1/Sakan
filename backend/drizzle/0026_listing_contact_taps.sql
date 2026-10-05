ALTER TABLE "listings"
  ADD COLUMN IF NOT EXISTS "contact_tap_count" integer DEFAULT 0 NOT NULL;

CREATE TABLE IF NOT EXISTS "listing_wizard_drafts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "slot" varchar(16) NOT NULL,
  "payload" jsonb NOT NULL,
  "saved_at" timestamptz NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "listing_wizard_drafts_slot_check" CHECK ("slot" IN ('main', 'working')),
  CONSTRAINT "listing_wizard_drafts_user_slot_uidx" UNIQUE ("user_id", "slot")
);

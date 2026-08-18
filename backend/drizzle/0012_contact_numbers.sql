ALTER TABLE "listings" ADD COLUMN "contact_numbers" jsonb DEFAULT '[]'::jsonb NOT NULL;

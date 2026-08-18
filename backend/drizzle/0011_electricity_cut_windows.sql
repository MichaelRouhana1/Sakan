ALTER TABLE "listings" ADD COLUMN "electricity_cut_windows" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "listings"
SET "electricity_cut_windows" = jsonb_build_array(
  jsonb_build_object('start', "electricity_cuts_start", 'end', "electricity_cuts_end")
)
WHERE "electricity_cuts_start" IS NOT NULL AND "electricity_cuts_end" IS NOT NULL;

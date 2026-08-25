CREATE TYPE "public"."listing_report_status" AS ENUM('open', 'dismissed', 'actioned');--> statement-breakpoint
ALTER TABLE "listing_reports" ADD COLUMN "status" "listing_report_status" DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "listing_reports" ADD COLUMN "reviewed_at" timestamptz;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listing_reports_status_listing_idx" ON "listing_reports" ("status", "listing_id");

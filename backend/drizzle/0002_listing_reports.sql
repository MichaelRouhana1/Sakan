CREATE TYPE "public"."listing_report_reason" AS ENUM('fake', 'inaccurate_utilities', 'already_rented');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listing_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"reporter_user_id" uuid NOT NULL,
	"reason" "listing_report_reason" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listing_reports_reporter_listing_uidx" UNIQUE("reporter_user_id","listing_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

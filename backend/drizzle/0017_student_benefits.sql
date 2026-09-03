DO $$ BEGIN
  CREATE TYPE "public"."benefit_category" AS ENUM('tech', 'food', 'services', 'entertainment', 'finance', 'telecom');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."benefit_redemption_type" AS ENUM('link', 'promo_code', 'show_id');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "student_benefits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_name" varchar(160) NOT NULL,
  "title" varchar(200) NOT NULL,
  "category" "benefit_category" NOT NULL,
  "description" text NOT NULL,
  "eligibility" text NOT NULL,
  "redemption_type" "benefit_redemption_type" NOT NULL,
  "redemption_data" text NOT NULL,
  "is_global" boolean DEFAULT false NOT NULL,
  "applicable_universities" text[] NOT NULL,
  "location_or_area" varchar(256),
  "source_url" varchar(1024),
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "student_benefits_company_title" UNIQUE("company_name", "title")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "student_benefits_category_idx" ON "student_benefits" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "student_benefits_universities_idx" ON "student_benefits" USING gin ("applicable_universities");

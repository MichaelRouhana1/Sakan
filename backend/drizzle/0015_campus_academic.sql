CREATE TYPE "public"."degree_level" AS ENUM('bachelor', 'master');--> statement-breakpoint
CREATE TYPE "public"."billing_model" AS ENUM('per_credit', 'flat_term');--> statement-breakpoint
CREATE TYPE "public"."credit_system" AS ENUM('us', 'ects');--> statement-breakpoint
CREATE TYPE "public"."fee_period" AS ENUM('term', 'year');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "faculties" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "institution_id" uuid NOT NULL REFERENCES "institutions"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "slug" varchar(80) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "faculties_institution_slug" UNIQUE("institution_id", "slug")
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "programs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "faculty_id" uuid NOT NULL REFERENCES "faculties"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "slug" varchar(80) NOT NULL,
  "degree_level" "degree_level" DEFAULT 'bachelor' NOT NULL,
  "billing_model" "billing_model" DEFAULT 'per_credit' NOT NULL,
  "credit_system" "credit_system" DEFAULT 'us' NOT NULL,
  "default_credits" integer DEFAULT 15 NOT NULL,
  "max_billed_credits" integer,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "programs_faculty_slug" UNIQUE("faculty_id", "slug")
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tuition_rates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "program_id" uuid NOT NULL REFERENCES "programs"("id") ON DELETE CASCADE,
  "academic_year" varchar(16) NOT NULL,
  "amount_usd" integer NOT NULL,
  "source_url" varchar(1024) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "tuition_rates_program_year" UNIQUE("program_id", "academic_year")
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fee_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "institution_id" uuid NOT NULL REFERENCES "institutions"("id") ON DELETE CASCADE,
  "faculty_id" uuid REFERENCES "faculties"("id") ON DELETE CASCADE,
  "program_id" uuid REFERENCES "programs"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "amount_usd" integer NOT NULL,
  "period" "fee_period" DEFAULT 'year' NOT NULL,
  "academic_year" varchar(16) NOT NULL,
  "source_url" varchar(1024) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TYPE "public"."gender_restriction" AS ENUM('anyone', 'boys_only', 'girls_only');--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "gender_restriction" "gender_restriction" DEFAULT 'anyone' NOT NULL;

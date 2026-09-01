ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "total_credits" integer DEFAULT 120 NOT NULL;--> statement-breakpoint
UPDATE "programs" SET "total_credits" = 180 WHERE "credit_system" = 'ects';

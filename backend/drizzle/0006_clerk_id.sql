ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "clerk_id" varchar(255);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

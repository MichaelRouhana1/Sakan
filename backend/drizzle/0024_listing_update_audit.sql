ALTER TYPE "public"."admin_actor_kind" ADD VALUE 'poster';--> statement-breakpoint
ALTER TYPE "public"."admin_actor_kind" ADD VALUE 'system';--> statement-breakpoint
ALTER TABLE "admin_audit_events" ADD COLUMN IF NOT EXISTS "actor_user_id" uuid;

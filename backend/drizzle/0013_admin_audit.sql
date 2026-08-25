CREATE TYPE "public"."admin_actor_kind" AS ENUM('clerk', 'api_key');--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD COLUMN "reviewed_by_kind" "admin_actor_kind";--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD COLUMN "reviewed_by_clerk_id" varchar(255);--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD COLUMN "reviewed_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD COLUMN "reviewed_at" timestamptz;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_audit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_kind" "admin_actor_kind" NOT NULL,
  "actor_clerk_id" varchar(255),
  "action" varchar(64) NOT NULL,
  "entity_type" varchar(64) NOT NULL,
  "entity_id" uuid NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_audit_events_entity_idx" ON "admin_audit_events" ("entity_type", "entity_id");

DO $$ BEGIN
  CREATE TYPE "listing_lifecycle_event_type" AS ENUM (
    'expired', 'renew_intent', 'improve_intent', 'rented', 'renewed',
    'archived', 'admin_contacted'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "listing_outcome" AS ENUM ('rented', 'renewed', 'archived', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "listing_outcome_source" AS ENUM ('host', 'system', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "notification_kind" AS ENUM ('pre_expiry', 'expiry_prompt', 'admin_escalation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "notification_channel" AS ENUM ('push', 'email', 'admin_inbox');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "notification_delivery_status" AS ENUM ('pending', 'sent', 'skipped', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "expiry_push_enabled" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "expiry_email_enabled" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listing_lifecycle_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "listing_id" uuid NOT NULL REFERENCES "listings"("id") ON DELETE cascade,
  "cycle_expires_at" timestamptz NOT NULL,
  "event_type" "listing_lifecycle_event_type" NOT NULL,
  "outcome" "listing_outcome",
  "source" "listing_outcome_source" NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "listing_lifecycle_cycle_event_uq"
  ON "listing_lifecycle_events" ("listing_id", "cycle_expires_at", "event_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listing_lifecycle_listing_cycle_idx"
  ON "listing_lifecycle_events" ("listing_id", "cycle_expires_at", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_deliveries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "listing_id" uuid NOT NULL REFERENCES "listings"("id") ON DELETE cascade,
  "cycle_expires_at" timestamptz NOT NULL,
  "kind" "notification_kind" NOT NULL,
  "channel" "notification_channel" NOT NULL,
  "recipient_key" varchar(512) NOT NULL,
  "status" "notification_delivery_status" DEFAULT 'pending' NOT NULL,
  "provider_message_id" varchar(255),
  "attempts" integer DEFAULT 0 NOT NULL,
  "last_error" varchar(2000),
  "sent_at" timestamptz,
  "receipt_checked_at" timestamptz,
  "next_attempt_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_delivery_dedupe_uq"
  ON "notification_deliveries" ("listing_id", "cycle_expires_at", "kind", "channel", "recipient_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_delivery_retry_idx"
  ON "notification_deliveries" ("status", "next_attempt_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_push_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "token" varchar(512) NOT NULL,
  "platform" varchar(16) NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "last_seen_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_push_tokens_token_uq" ON "user_push_tokens" ("token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_push_tokens_user_idx" ON "user_push_tokens" ("user_id");

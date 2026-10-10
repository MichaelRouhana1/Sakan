-- Phase 1. Run after 0029, before enabling promotion sales.
ALTER TABLE users ADD COLUMN IF NOT EXISTS boost_credit_units_version integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS legacy_boost_credit_unit_rate integer;
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS catalog_pack_id text;
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS catalog_version text;
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS boost_credit_units_version integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS promotion_settings (key text PRIMARY KEY, value jsonb NOT NULL);
-- Immutable legacy purchasing-power rate. Change during the audited cutover only,
-- before any wallet conversion; publishing later prices must never change it.
INSERT INTO promotion_settings(key,value) VALUES ('legacy_credit_unit_rate','{"creditUnits":1200}') ON CONFLICT DO NOTHING;
CREATE TABLE promotion_campaigns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES users(id),
 listing_id uuid REFERENCES listings(id) ON DELETE SET NULL, listing_id_snapshot uuid NOT NULL, listing_title text NOT NULL, listing_published_at timestamptz,
 type text NOT NULL CHECK(type IN ('featured','bump')), product_id text NOT NULL, catalog_version text NOT NULL,
 duration_days integer NOT NULL CHECK(duration_days IN (3,7,14,30)), pausable boolean NOT NULL DEFAULT false,
 credit_units integer NOT NULL CHECK(credit_units > 0), spent_units integer NOT NULL DEFAULT 0,
 refunded_units integer NOT NULL DEFAULT 0 CHECK(refunded_units >= 0 AND refunded_units <= spent_units),
 status text NOT NULL CHECK(status IN ('queued','active','paused','action_needed','completed','stopped','refunded','cancelled')),
 market_key text NOT NULL, market_label text NOT NULL, slot_index integer CHECK(slot_index BETWEEN 1 AND 3),
 remaining_seconds integer NOT NULL CHECK(remaining_seconds >= 0), started_at timestamptz,
 active_since timestamptz, ends_at timestamptz, undo_until timestamptz,
 last_bumped_at timestamptz, next_bump_at timestamptz, queued_at timestamptz,
 auto_renew boolean NOT NULL DEFAULT false, stop_reason text, idempotency_key text NOT NULL,
 renewed_from_id uuid REFERENCES promotion_campaigns(id), renewal_notified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (status <> 'active' OR (active_since IS NOT NULL AND ends_at IS NOT NULL)),
 CHECK (status <> 'active' OR type <> 'featured' OR slot_index IS NOT NULL)
);
CREATE UNIQUE INDEX promotion_request_uq ON promotion_campaigns(owner_id,idempotency_key);
CREATE UNIQUE INDEX promotion_open_listing_uq ON promotion_campaigns(listing_id) WHERE status IN ('active','queued','paused','action_needed');
CREATE UNIQUE INDEX promotion_active_slot_uq ON promotion_campaigns(market_key,slot_index) WHERE status='active' AND type='featured';
CREATE UNIQUE INDEX promotion_renewed_from_uq ON promotion_campaigns(renewed_from_id);
CREATE INDEX promotion_market_queue_idx ON promotion_campaigns(market_key,status,queued_at);
CREATE TABLE promotion_service_intervals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id uuid NOT NULL REFERENCES promotion_campaigns(id),
 started_at timestamptz NOT NULL, ended_at timestamptz, CHECK(ended_at IS NULL OR ended_at >= started_at)
);
CREATE UNIQUE INDEX promotion_open_interval_uq ON promotion_service_intervals(campaign_id) WHERE ended_at IS NULL;
CREATE TABLE promotion_wallet_ledger (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id),
 campaign_id uuid REFERENCES promotion_campaigns(id), operation_key text NOT NULL UNIQUE,
 delta_units integer NOT NULL, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE promotion_bump_executions (
 campaign_id uuid NOT NULL REFERENCES promotion_campaigns(id), local_date text NOT NULL,
 executed_at timestamptz NOT NULL, UNIQUE(campaign_id,local_date)
);
CREATE TABLE promotion_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES users(id),
 campaign_id uuid NOT NULL REFERENCES promotion_campaigns(id), kind text NOT NULL,
 message text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(campaign_id,kind)
);

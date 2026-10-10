CREATE TABLE IF NOT EXISTS listing_activity_coverage (
  id text PRIMARY KEY DEFAULT 'listing_activity',
  started_at timestamptz NOT NULL DEFAULT now()
);
-- Coverage starts with the first recorded activity, not ahead of the API rollout.
CREATE TABLE IF NOT EXISTS listing_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE,
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  listing_id_snapshot uuid NOT NULL,
  boost_id uuid,
  kind text NOT NULL CHECK (kind IN ('view','contact_tap','featured_impression')),
  actor_key text NOT NULL,
  session_id uuid,
  platform text NOT NULL CHECK (platform IN ('web','ios','android','unknown')),
  measurement text,
  dedupe_key text UNIQUE,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS listing_activity_listing_time_idx ON listing_activity_events(listing_id_snapshot,occurred_at);
CREATE INDEX IF NOT EXISTS listing_activity_boost_time_idx ON listing_activity_events(boost_id,occurred_at);
CREATE INDEX IF NOT EXISTS listing_activity_actor_time_idx ON listing_activity_events(listing_id_snapshot,actor_key,kind,occurred_at);
CREATE TABLE IF NOT EXISTS promotion_search_allocations (
  session_id uuid NOT NULL,
  cohort_key text NOT NULL,
  campaign_ids jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(session_id,cohort_key)
);
CREATE TABLE IF NOT EXISTS promotion_rotation_counters (
  cohort_key text PRIMARY KEY,
  next_offset bigint NOT NULL DEFAULT 0
);

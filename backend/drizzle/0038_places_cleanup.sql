-- Finalize places/units on the guarded local development database.
-- Housing deletion is driven only by IDs already stored in studently_ops.
DO $$
BEGIN
  IF current_database() <> 'studently_dev' THEN
    RAISE EXCEPTION 'Slice 5 cleanup is restricted to studently_dev';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM studently_ops.environment_guard
    WHERE singleton AND environment = 'local' AND database_name = current_database()
  ) THEN
    RAISE EXCEPTION 'Missing local studently_dev environment guard';
  END IF;
END $$;
--> statement-breakpoint
CREATE TEMP TABLE slice5_cleanup_manifest (
  entity text NOT NULL,
  id uuid NOT NULL,
  PRIMARY KEY (entity, id)
) ON COMMIT DROP;

INSERT INTO slice5_cleanup_manifest(entity, id)
SELECT entity, id
FROM studently_ops.housing_seed_manifest
WHERE entity IN (
  'listing', 'listing_photo', 'place', 'place_photo',
  'promotion', 'promotion_interval', 'promotion_ledger'
);

-- A manifest can contain unrelated users. Only the owner of a manifest-backed
-- housing listing is part of this cleanup.
INSERT INTO slice5_cleanup_manifest(entity, id)
SELECT DISTINCT 'user', l.poster_id
FROM listings l
JOIN studently_ops.housing_seed_manifest m
  ON m.entity = 'listing' AND m.id = l.id
JOIN studently_ops.housing_seed_manifest owner_manifest
  ON owner_manifest.entity = 'user' AND owner_manifest.id = l.poster_id;
--> statement-breakpoint
DO $$
DECLARE counts jsonb;
BEGIN
  SELECT jsonb_object_agg(entity, n) INTO counts
  FROM (
    SELECT entity, count(*)::int AS n
    FROM slice5_cleanup_manifest
    GROUP BY entity
  ) c;

  IF counts IS DISTINCT FROM '{
    "listing": 17,
    "listing_photo": 51,
    "place": 10,
    "place_photo": 20,
    "promotion": 2,
    "promotion_interval": 2,
    "promotion_ledger": 4,
    "user": 1
  }'::jsonb THEN
    RAISE EXCEPTION 'Housing cleanup manifest changed: %', counts;
  END IF;

  IF EXISTS (
    SELECT 1 FROM listings l
    WHERE l.place_id IN (SELECT id FROM slice5_cleanup_manifest WHERE entity = 'place')
      AND l.id NOT IN (SELECT id FROM slice5_cleanup_manifest WHERE entity = 'listing')
  ) THEN
    RAISE EXCEPTION 'A doomed place contains a non-manifest listing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM listing_photos p
    WHERE p.listing_id IN (SELECT id FROM slice5_cleanup_manifest WHERE entity = 'listing')
      AND p.id NOT IN (SELECT id FROM slice5_cleanup_manifest WHERE entity = 'listing_photo')
  ) OR EXISTS (
    SELECT 1 FROM place_photos p
    WHERE p.place_id IN (SELECT id FROM slice5_cleanup_manifest WHERE entity = 'place')
      AND p.id NOT IN (SELECT id FROM slice5_cleanup_manifest WHERE entity = 'place_photo')
  ) OR EXISTS (
    SELECT 1 FROM promotion_campaigns c
    WHERE c.listing_id IN (SELECT id FROM slice5_cleanup_manifest WHERE entity = 'listing')
      AND c.id NOT IN (SELECT id FROM slice5_cleanup_manifest WHERE entity = 'promotion')
  ) THEN
    RAISE EXCEPTION 'A doomed housing entity has an unmanifested dependent row';
  END IF;

  IF (SELECT count(*) FROM listings WHERE id IN (SELECT id FROM slice5_cleanup_manifest WHERE entity='listing')) <> 17
     OR (SELECT count(*) FROM listing_photos WHERE id IN (SELECT id FROM slice5_cleanup_manifest WHERE entity='listing_photo')) <> 51
     OR (SELECT count(*) FROM places WHERE id IN (SELECT id FROM slice5_cleanup_manifest WHERE entity='place')) <> 10
     OR (SELECT count(*) FROM place_photos WHERE id IN (SELECT id FROM slice5_cleanup_manifest WHERE entity='place_photo')) <> 20
     OR (SELECT count(*) FROM promotion_campaigns WHERE id IN (SELECT id FROM slice5_cleanup_manifest WHERE entity='promotion')) <> 2
     OR (SELECT count(*) FROM promotion_service_intervals WHERE id IN (SELECT id FROM slice5_cleanup_manifest WHERE entity='promotion_interval')) <> 2
     OR (SELECT count(*) FROM promotion_wallet_ledger WHERE id IN (SELECT id FROM slice5_cleanup_manifest WHERE entity='promotion_ledger')) <> 4
     OR (SELECT count(*) FROM users WHERE id IN (SELECT id FROM slice5_cleanup_manifest WHERE entity='user')) <> 1 THEN
    RAISE EXCEPTION 'A manifest-backed housing row is missing';
  END IF;
END $$;
--> statement-breakpoint
-- Remove only analytics rows whose listing identity is manifest-backed.
DELETE FROM listing_activity_events
WHERE listing_id IN (SELECT id FROM slice5_cleanup_manifest WHERE entity='listing')
   OR listing_id_snapshot IN (SELECT id FROM slice5_cleanup_manifest WHERE entity='listing');

DELETE FROM promotion_search_allocations a
WHERE EXISTS (
  SELECT 1 FROM slice5_cleanup_manifest m
  WHERE m.entity='promotion' AND a.campaign_ids ? m.id::text
);
DELETE FROM promotion_bump_executions
WHERE campaign_id IN (SELECT id FROM slice5_cleanup_manifest WHERE entity='promotion');
DELETE FROM promotion_notifications
WHERE campaign_id IN (SELECT id FROM slice5_cleanup_manifest WHERE entity='promotion');
DELETE FROM promotion_service_intervals
WHERE id IN (SELECT id FROM slice5_cleanup_manifest WHERE entity='promotion_interval');
DELETE FROM promotion_wallet_ledger
WHERE id IN (SELECT id FROM slice5_cleanup_manifest WHERE entity='promotion_ledger');
DELETE FROM promotion_campaigns
WHERE id IN (SELECT id FROM slice5_cleanup_manifest WHERE entity='promotion');
DELETE FROM listings
WHERE id IN (SELECT id FROM slice5_cleanup_manifest WHERE entity='listing');
DELETE FROM places
WHERE id IN (SELECT id FROM slice5_cleanup_manifest WHERE entity='place')
  AND NOT EXISTS (SELECT 1 FROM listings WHERE listings.place_id=places.id);
DELETE FROM users
WHERE id IN (SELECT id FROM slice5_cleanup_manifest WHERE entity='user')
  AND NOT EXISTS (SELECT 1 FROM listings WHERE listings.poster_id=users.id)
  AND NOT EXISTS (SELECT 1 FROM places WHERE places.owner_id=users.id);
DELETE FROM studently_ops.housing_seed_manifest m
USING slice5_cleanup_manifest doomed
WHERE m.entity=doomed.entity AND m.id=doomed.id;
--> statement-breakpoint
-- Remove the listing compatibility bridges and duplicated route cache.
DROP VIEW listing_resolved;
DROP TRIGGER listings_place_bridge ON listings;
DROP TRIGGER places_legacy_projection ON places;
DROP TRIGGER place_routes_legacy_mirror ON place_campus_routes;
DROP TRIGGER legacy_routes_place_mirror ON listing_campus_routes;
DROP TRIGGER y_unit_gender_version ON listings;
DROP FUNCTION bridge_legacy_listing_place();
DROP FUNCTION project_place_to_legacy_listings();
DROP FUNCTION mirror_place_route_to_listings();
DROP FUNCTION mirror_legacy_route_to_place();
DROP TABLE listing_campus_routes;
--> statement-breakpoint
-- Location invalidation now owns only the canonical place cache.
CREATE OR REPLACE FUNCTION invalidate_place_routes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM place_campus_routes WHERE place_id=NEW.id;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION invalidate_campus_place_routes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM place_campus_routes WHERE campus_id=NEW.id;
  RETURN NEW;
END $$;
--> statement-breakpoint
ALTER TABLE listings
  DROP COLUMN listing_type,
  DROP COLUMN gender_restriction,
  DROP COLUMN target_audience,
  DROP COLUMN electricity,
  DROP COLUMN electricity_cuts_start,
  DROP COLUMN electricity_cuts_end,
  DROP COLUMN electricity_hours_on,
  DROP COLUMN electricity_cut_windows,
  DROP COLUMN water,
  DROP COLUMN wifi_included,
  DROP COLUMN router_ups,
  DROP COLUMN elevator_24_7,
  DROP COLUMN area,
  DROP COLUMN landmark,
  DROP COLUMN location,
  DROP COLUMN has_elevator,
  DROP COLUMN has_solar,
  DROP COLUMN generator_amperes,
  DROP COLUMN generator_included,
  DROP COLUMN concierge_included,
  DROP COLUMN cooking_gas_included,
  DROP COLUMN amenities,
  DROP COLUMN smoking_policy,
  DROP COLUMN pets_policy,
  DROP COLUMN guests_policy,
  DROP COLUMN quiet_hours,
  DROP COLUMN address_line,
  DROP COLUMN building_name,
  DROP COLUMN primary_campus_id,
  DROP COLUMN water_bill_included,
  DROP COLUMN building_fees_included,
  DROP COLUMN parking_included_in_rent;

DROP TYPE listing_type;
DROP TYPE gender_restriction;
--> statement-breakpoint
CREATE TRIGGER y_unit_gender_version BEFORE UPDATE OF gender_rule ON listings
 FOR EACH ROW WHEN (NEW.gender_rule IS DISTINCT FROM OLD.gender_rule)
 EXECUTE FUNCTION bump_unit_gender_version();
--> statement-breakpoint
-- Public/API compatibility is now a read projection only. No duplicated values
-- are stored on listings and no trigger writes through this view.
CREATE VIEW listing_resolved AS
SELECT
  l.*,
  CASE l.unit_type
    WHEN 'shared_bed' THEN 'shared_dorm_bed'
    WHEN 'private_room' THEN 'private_room'
    WHEN 'whole_apartment' THEN CASE WHEN l.property_type='studio' THEN 'studio' ELSE 'entire_apartment' END
  END AS listing_type,
  CASE l.gender_rule
    WHEN 'female_only' THEN 'girls_only'
    WHEN 'male_only' THEN 'boys_only'
    ELSE 'anyone'
  END AS gender_restriction,
  r.area,
  r.landmark,
  r.address_line,
  r.building_name,
  r.primary_campus_id,
  r.location,
  r.electricity,
  r.electricity_cuts_start,
  r.electricity_cuts_end,
  r.electricity_hours_on,
  r.electricity_cut_windows,
  r.water,
  r.wifi_included,
  r.router_ups,
  r.elevator_24_7,
  r.has_elevator,
  r.has_solar,
  r.generator_amperes,
  r.generator_included,
  r.concierge_included,
  r.cooking_gas_included,
  r.water_bill_included,
  r.building_fees_included,
  r.parking_included_in_rent,
  r.amenities,
  r.smoking_policy,
  r.pets_policy,
  r.guests_policy,
  r.quiet_hours,
  r.target_audience,
  p.kind AS place_kind,
  p.city,
  p.updated_at AS place_updated_at,
  resolve_place_sources(p,l.place_overrides,l.unit_amenities,l.amenity_overrides) AS effective_sources,
  unit_hidden_reason(l) AS hidden_reason
FROM listings l
JOIN places p ON p.id=l.place_id
CROSS JOIN LATERAL jsonb_populate_record(
  NULL::places,
  resolve_place_values(p,l.place_overrides,l.unit_amenities,l.amenity_overrides)
) r;

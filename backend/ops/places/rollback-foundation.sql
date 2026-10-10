-- Only for the untouched 1:1 foundation, after deploying the old route code.
-- Execute in a maintenance window. This script refuses to discard richer data.
BEGIN;
LOCK TABLE listings,places IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
 IF EXISTS(SELECT FROM places p WHERE p.kind<>'apartment' OR p.city IS NOT NULL)
 OR EXISTS(SELECT FROM listings WHERE place_id<>id OR place_overrides<>'{}' OR unit_amenities<>'[]' OR amenity_overrides<>'{}' OR bathroom_privacy IS NOT NULL OR beds_available IS NOT NULL OR inventory_version<>0)
 OR EXISTS(SELECT FROM place_photos) THEN
   RAISE EXCEPTION 'Rollback blocked: place/unit data has evolved; keep the additive schema and roll back application code only';
 END IF;
 IF EXISTS(SELECT FROM drizzle.__drizzle_migrations WHERE created_at>1791700004000) THEN
   RAISE EXCEPTION 'Rollback blocked: later migrations exist';
 END IF;
END $$;
DROP VIEW listing_resolved;
DROP TRIGGER listings_place_bridge ON listings;
DROP TRIGGER places_legacy_projection ON places;
DROP TRIGGER places_route_invalidation ON places;
DROP TRIGGER campuses_place_route_invalidation ON universities;
DROP TRIGGER place_routes_legacy_mirror ON place_campus_routes;
DROP TRIGGER legacy_routes_place_mirror ON listing_campus_routes;
DROP FUNCTION bridge_legacy_listing_place();
DROP FUNCTION project_place_to_legacy_listings();
DROP FUNCTION invalidate_place_routes();
DROP FUNCTION invalidate_campus_place_routes();
DROP FUNCTION mirror_place_route_to_listings();
DROP FUNCTION mirror_legacy_route_to_place();
DROP FUNCTION resolve_place_sources(places,jsonb,jsonb,jsonb);
DROP FUNCTION resolve_place_values(places,jsonb,jsonb,jsonb);
ALTER TABLE listings
 DROP CONSTRAINT listings_place_owner_fk,
 DROP CONSTRAINT listing_unit_beds_check,
 DROP COLUMN place_id,DROP COLUMN unit_type,DROP COLUMN bathroom_privacy,
 DROP COLUMN unit_amenities,DROP COLUMN place_overrides,DROP COLUMN amenity_overrides,
 DROP COLUMN beds_total,DROP COLUMN beds_available,DROP COLUMN inventory_needs_confirmation,
 DROP COLUMN gender_rule,DROP COLUMN inventory_version;
DROP TABLE place_photos,place_campus_routes,places;
DROP TYPE place_kind,unit_type,bathroom_privacy,unit_gender_rule;
DELETE FROM drizzle.__drizzle_migrations WHERE created_at IN (1791700002000,1791700003000,1791700004000);
COMMIT;


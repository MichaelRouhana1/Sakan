-- Transitional cache mirrors for rollback/old readers. Mapbox is called once
-- per place; these rows only copy that result and never invoke the provider.
CREATE FUNCTION mirror_place_route_to_listings() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF pg_trigger_depth()>1 THEN RETURN NEW; END IF;
 INSERT INTO listing_campus_routes(listing_id,campus_id,profile,listing_lng,listing_lat,campus_lng,campus_lat,distance_m,duration_s,coords,created_at,updated_at)
 SELECT id,NEW.campus_id,NEW.profile,NEW.place_lng,NEW.place_lat,NEW.campus_lng,NEW.campus_lat,NEW.distance_m,NEW.duration_s,NEW.coords,NEW.created_at,NEW.updated_at
 FROM listings WHERE place_id=NEW.place_id
 ON CONFLICT(listing_id,campus_id,profile) DO UPDATE SET
 listing_lng=EXCLUDED.listing_lng,listing_lat=EXCLUDED.listing_lat,campus_lng=EXCLUDED.campus_lng,campus_lat=EXCLUDED.campus_lat,
 distance_m=EXCLUDED.distance_m,duration_s=EXCLUDED.duration_s,coords=EXCLUDED.coords,updated_at=EXCLUDED.updated_at;
 RETURN NEW;
END $$;
CREATE TRIGGER place_routes_legacy_mirror AFTER INSERT OR UPDATE ON place_campus_routes
FOR EACH ROW EXECUTE FUNCTION mirror_place_route_to_listings();

CREATE FUNCTION mirror_legacy_route_to_place() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF pg_trigger_depth()>1 THEN RETURN NEW; END IF;
 INSERT INTO place_campus_routes(place_id,campus_id,profile,place_lng,place_lat,campus_lng,campus_lat,distance_m,duration_s,coords,created_at,updated_at)
 SELECT place_id,NEW.campus_id,NEW.profile,NEW.listing_lng,NEW.listing_lat,NEW.campus_lng,NEW.campus_lat,NEW.distance_m,NEW.duration_s,NEW.coords,NEW.created_at,NEW.updated_at
 FROM listings WHERE id=NEW.listing_id
 ON CONFLICT(place_id,campus_id,profile) DO UPDATE SET
 place_lng=EXCLUDED.place_lng,place_lat=EXCLUDED.place_lat,campus_lng=EXCLUDED.campus_lng,campus_lat=EXCLUDED.campus_lat,
 distance_m=EXCLUDED.distance_m,duration_s=EXCLUDED.duration_s,coords=EXCLUDED.coords,updated_at=EXCLUDED.updated_at;
 RETURN NEW;
END $$;
CREATE TRIGGER legacy_routes_place_mirror AFTER INSERT OR UPDATE ON listing_campus_routes
FOR EACH ROW EXECUTE FUNCTION mirror_legacy_route_to_place();


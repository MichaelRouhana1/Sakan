-- One place per legacy listing. Do not infer vacant beds or reclassify photos.
DO $$
BEGIN
 IF EXISTS(SELECT FROM listings WHERE monthly_rent_usd<=0 OR (listing_type='shared_dorm_bed' AND beds<1) OR (status='active' AND location IS NULL)) THEN
   RAISE EXCEPTION 'Places preflight blocked: invalid price, bed total, or active listing pin';
 END IF;
END $$;
INSERT INTO places(id,owner_id,area, landmark, address_line, building_name, primary_campus_id, location, electricity, electricity_cuts_start, electricity_cuts_end, electricity_hours_on, electricity_cut_windows, water, wifi_included, router_ups, elevator_24_7, has_elevator, has_solar, generator_amperes, generator_included, concierge_included, cooking_gas_included, water_bill_included, building_fees_included, parking_included_in_rent, amenities, smoking_policy, pets_policy, guests_policy, quiet_hours, target_audience,created_at,updated_at)
SELECT id,poster_id,area, landmark, address_line, building_name, primary_campus_id, location, electricity, electricity_cuts_start, electricity_cuts_end, electricity_hours_on, electricity_cut_windows, water, wifi_included, router_ups, elevator_24_7, has_elevator, has_solar, generator_amperes, generator_included, concierge_included, cooking_gas_included, water_bill_included, building_fees_included, parking_included_in_rent, amenities, smoking_policy, pets_policy, guests_policy, quiet_hours, target_audience,created_at,updated_at FROM listings;
UPDATE listings SET
 place_id=id,
 unit_type=CASE listing_type WHEN 'shared_dorm_bed' THEN 'shared_bed'::unit_type WHEN 'private_room' THEN 'private_room'::unit_type ELSE 'whole_apartment'::unit_type END,
 beds_total=CASE WHEN listing_type='shared_dorm_bed' THEN beds ELSE NULL END,
 beds_available=NULL,
 inventory_needs_confirmation=(listing_type='shared_dorm_bed'),
 gender_rule=CASE gender_restriction WHEN 'girls_only' THEN 'female_only'::unit_gender_rule WHEN 'boys_only' THEN 'male_only'::unit_gender_rule ELSE 'any'::unit_gender_rule END;
INSERT INTO place_campus_routes(id,place_id,campus_id,profile,place_lng,place_lat,campus_lng,campus_lat,distance_m,duration_s,coords,created_at,updated_at)
SELECT r.id,l.place_id,r.campus_id,r.profile,r.listing_lng,r.listing_lat,r.campus_lng,r.campus_lat,r.distance_m,r.duration_s,r.coords,r.created_at,r.updated_at
FROM listing_campus_routes r JOIN listings l ON l.id=r.listing_id;

ALTER TABLE listings
 ALTER COLUMN place_id SET NOT NULL, ALTER COLUMN place_id SET DEFAULT NULL,
 ALTER COLUMN unit_type SET NOT NULL, ALTER COLUMN unit_type SET DEFAULT NULL,
 ALTER COLUMN gender_rule SET NOT NULL, ALTER COLUMN gender_rule SET DEFAULT NULL,
 ADD CONSTRAINT listings_place_owner_fk FOREIGN KEY(place_id,poster_id) REFERENCES places(id,owner_id),
 ADD CONSTRAINT listing_unit_beds_check CHECK (
   (unit_type <> 'shared_bed' AND beds_total IS NULL AND beds_available IS NULL AND NOT inventory_needs_confirmation)
   OR (unit_type = 'shared_bed' AND beds_total IS NOT NULL AND beds_total > 0 AND
     ((beds_available IS NULL AND inventory_needs_confirmation) OR
      (beds_available IS NOT NULL AND beds_available BETWEEN 0 AND beds_total AND NOT inventory_needs_confirmation)))
 );

-- The same resolver is used by the view and the compatibility projections.
-- Presence, not truthiness/COALESCE, chooses overrides, preserving false and null.
CREATE FUNCTION resolve_place_values(p places, overrides jsonb, additions jsonb, amenity_flags jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE result jsonb; entry record; value_type text;
BEGIN
 IF jsonb_typeof(overrides) IS DISTINCT FROM 'object' OR jsonb_typeof(amenity_flags) IS DISTINCT FROM 'object'
    OR jsonb_typeof(additions) IS DISTINCT FROM 'array' THEN
   RAISE EXCEPTION 'Invalid unit override containers' USING ERRCODE='23514';
 END IF;
 FOR entry IN SELECT * FROM jsonb_each(overrides) LOOP
   IF NOT entry.key = ANY(ARRAY['electricity','electricity_cuts_start','electricity_cuts_end','electricity_hours_on','electricity_cut_windows','water','wifi_included','router_ups','elevator_24_7','has_elevator','has_solar','generator_amperes','generator_included','concierge_included','cooking_gas_included','water_bill_included','building_fees_included','parking_included_in_rent','smoking_policy','pets_policy','guests_policy','quiet_hours','target_audience']::text[]) THEN
     RAISE EXCEPTION 'Unsupported place override: %',entry.key USING ERRCODE='23514';
   END IF;
   value_type := jsonb_typeof(entry.value);
   IF value_type='null' THEN
     IF NOT entry.key = ANY(ARRAY['electricity_cuts_start','electricity_cuts_end','electricity_hours_on','generator_amperes']::text[]) THEN
       RAISE EXCEPTION 'Cannot clear required place field: %',entry.key USING ERRCODE='23514';
     END IF;
   ELSIF entry.key = ANY(ARRAY['wifi_included','router_ups','elevator_24_7','has_elevator','has_solar','generator_included','concierge_included','cooking_gas_included','water_bill_included','building_fees_included','parking_included_in_rent','quiet_hours']::text[]) THEN
     IF value_type <> 'boolean' THEN RAISE EXCEPTION 'Expected boolean override: %',entry.key USING ERRCODE='23514'; END IF;
   ELSIF entry.key = ANY(ARRAY['generator_amperes','electricity_hours_on']) THEN
     IF value_type <> 'number' OR entry.value::text !~ '^-?[0-9]+$' THEN RAISE EXCEPTION 'Expected integer override' USING ERRCODE='23514'; END IF;
   ELSIF entry.key='electricity_cut_windows' THEN
     IF value_type <> 'array' THEN RAISE EXCEPTION 'Expected cut windows array' USING ERRCODE='23514'; END IF;
   ELSIF value_type <> 'string' THEN RAISE EXCEPTION 'Expected string override: %',entry.key USING ERRCODE='23514';
   END IF;
 END LOOP;
 IF EXISTS(SELECT FROM jsonb_array_elements(additions) v WHERE jsonb_typeof(v)<>'string')
    OR EXISTS(SELECT FROM jsonb_each(amenity_flags) WHERE jsonb_typeof(value)<>'boolean') THEN
   RAISE EXCEPTION 'Invalid unit amenities' USING ERRCODE='23514';
 END IF;
 result := to_jsonb(p) || overrides;
 -- Validate enum and integer casts in this one place.
 PERFORM jsonb_populate_record(NULL::places, result);
 IF additions <> '[]'::jsonb OR amenity_flags <> '{}'::jsonb THEN
   result := jsonb_set(result,'{amenities}',(
     SELECT coalesce(jsonb_agg(key ORDER BY ordinal,key),'[]') FROM (
       SELECT key,min(ordinal) ordinal FROM (
         SELECT value #>> '{}' key,ordinality ordinal
         FROM jsonb_array_elements(p.amenities || additions) WITH ORDINALITY
         WHERE coalesce(amenity_flags->>(value #>> '{}'),'true')='true'
         UNION ALL
         SELECT key,2147483647::bigint FROM jsonb_each(amenity_flags) WHERE value='true'::jsonb
       ) candidates GROUP BY key
     ) unique_amenities
   ));
 END IF;
 RETURN result;
END $$;

-- Keep the old write paths working during the staged rollout. No API accepts
-- place_id/overrides yet. Backfill runs before these triggers are installed.
CREATE FUNCTION bridge_legacy_listing_place() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p places; effective places; key text; old_json jsonb; new_json jsonb;
BEGIN
 IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' AND NEW.place_id IS NULL THEN
   INSERT INTO places(id,owner_id,area, landmark, address_line, building_name, primary_campus_id, location, electricity, electricity_cuts_start, electricity_cuts_end, electricity_hours_on, electricity_cut_windows, water, wifi_included, router_ups, elevator_24_7, has_elevator, has_solar, generator_amperes, generator_included, concierge_included, cooking_gas_included, water_bill_included, building_fees_included, parking_included_in_rent, amenities, smoking_policy, pets_policy, guests_policy, quiet_hours, target_audience,created_at,updated_at)
   VALUES(NEW.id,NEW.poster_id,NEW.area, NEW.landmark, NEW.address_line, NEW.building_name, NEW.primary_campus_id, NEW.location, NEW.electricity, NEW.electricity_cuts_start, NEW.electricity_cuts_end, NEW.electricity_hours_on, NEW.electricity_cut_windows, NEW.water, NEW.wifi_included, NEW.router_ups, NEW.elevator_24_7, NEW.has_elevator, NEW.has_solar, NEW.generator_amperes, NEW.generator_included, NEW.concierge_included, NEW.cooking_gas_included, NEW.water_bill_included, NEW.building_fees_included, NEW.parking_included_in_rent, NEW.amenities, NEW.smoking_policy, NEW.pets_policy, NEW.guests_policy, NEW.quiet_hours, NEW.target_audience,NEW.created_at,NEW.updated_at)
   RETURNING * INTO p;
   NEW.place_id:=p.id;
 ELSE
   SELECT * INTO STRICT p FROM places WHERE id=NEW.place_id;
 END IF;
 IF p.owner_id <> NEW.poster_id THEN RAISE EXCEPTION 'Place and unit owners differ' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' THEN
   old_json:=to_jsonb(OLD); new_json:=to_jsonb(NEW);
   -- Old flat edits become explicit unit overrides. They never change siblings.
   FOREACH key IN ARRAY ARRAY['electricity','electricity_cuts_start','electricity_cuts_end','electricity_hours_on','electricity_cut_windows','water','wifi_included','router_ups','elevator_24_7','has_elevator','has_solar','generator_amperes','generator_included','concierge_included','cooking_gas_included','water_bill_included','building_fees_included','parking_included_in_rent','smoking_policy','pets_policy','guests_policy','quiet_hours','target_audience']::text[] LOOP
     IF old_json->key IS DISTINCT FROM new_json->key THEN
       NEW.place_overrides:=NEW.place_overrides || jsonb_build_object(key,new_json->key);
     END IF;
   END LOOP;
   IF OLD.amenities IS DISTINCT FROM NEW.amenities THEN
     NEW.unit_amenities:=NEW.amenities;
     SELECT coalesce(jsonb_object_agg(value,false),'{}') INTO NEW.amenity_overrides
       FROM jsonb_array_elements_text(p.amenities) WHERE NOT NEW.amenities ? value;
   END IF;
   IF (OLD.area IS DISTINCT FROM NEW.area OR OLD.landmark IS DISTINCT FROM NEW.landmark OR OLD.address_line IS DISTINCT FROM NEW.address_line OR OLD.building_name IS DISTINCT FROM NEW.building_name OR OLD.primary_campus_id IS DISTINCT FROM NEW.primary_campus_id OR OLD.location IS DISTINCT FROM NEW.location) THEN
     -- Legacy location edits are single-unit operations. Detach a shared unit
     -- rather than relocating other units through an old edit screen.
     IF EXISTS(SELECT FROM listings WHERE place_id=NEW.place_id AND id<>NEW.id) THEN
       p.id:=gen_random_uuid();
       p.created_at:=NEW.updated_at;
       INSERT INTO places SELECT p.*;
       NEW.place_id:=p.id;
     END IF;
     UPDATE places SET area=NEW.area, landmark=NEW.landmark, address_line=NEW.address_line, building_name=NEW.building_name, primary_campus_id=NEW.primary_campus_id, location=NEW.location,updated_at=NEW.updated_at WHERE id=NEW.place_id RETURNING * INTO p;
   END IF;
 END IF;
 SELECT * INTO effective FROM jsonb_populate_record(NULL::places,
   resolve_place_values(p,NEW.place_overrides,NEW.unit_amenities,NEW.amenity_overrides));
 NEW.area:=effective.area;
 NEW.landmark:=effective.landmark;
 NEW.address_line:=effective.address_line;
 NEW.building_name:=effective.building_name;
 NEW.primary_campus_id:=effective.primary_campus_id;
 NEW.location:=effective.location;
 NEW.electricity:=effective.electricity;
 NEW.electricity_cuts_start:=effective.electricity_cuts_start;
 NEW.electricity_cuts_end:=effective.electricity_cuts_end;
 NEW.electricity_hours_on:=effective.electricity_hours_on;
 NEW.electricity_cut_windows:=effective.electricity_cut_windows;
 NEW.water:=effective.water;
 NEW.wifi_included:=effective.wifi_included;
 NEW.router_ups:=effective.router_ups;
 NEW.elevator_24_7:=effective.elevator_24_7;
 NEW.has_elevator:=effective.has_elevator;
 NEW.has_solar:=effective.has_solar;
 NEW.generator_amperes:=effective.generator_amperes;
 NEW.generator_included:=effective.generator_included;
 NEW.concierge_included:=effective.concierge_included;
 NEW.cooking_gas_included:=effective.cooking_gas_included;
 NEW.water_bill_included:=effective.water_bill_included;
 NEW.building_fees_included:=effective.building_fees_included;
 NEW.parking_included_in_rent:=effective.parking_included_in_rent;
 NEW.amenities:=effective.amenities;
 NEW.smoking_policy:=effective.smoking_policy;
 NEW.pets_policy:=effective.pets_policy;
 NEW.guests_policy:=effective.guests_policy;
 NEW.quiet_hours:=effective.quiet_hours;
 NEW.target_audience:=effective.target_audience;
 IF TG_OP='INSERT' OR NEW.listing_type IS DISTINCT FROM OLD.listing_type THEN
   NEW.unit_type:=CASE NEW.listing_type WHEN 'shared_dorm_bed' THEN 'shared_bed'::unit_type WHEN 'private_room' THEN 'private_room'::unit_type ELSE 'whole_apartment'::unit_type END;
 END IF;
 IF NEW.unit_type='shared_bed' THEN
   NEW.beds_total:=coalesce(NEW.beds_total,NEW.beds);
   IF TG_OP='UPDATE' AND NEW.beds IS DISTINCT FROM OLD.beds THEN
     NEW.beds_total:=NEW.beds; NEW.beds_available:=NULL;
   END IF;
   NEW.inventory_needs_confirmation:=(NEW.beds_available IS NULL);
 ELSE
   NEW.beds_total:=NULL; NEW.beds_available:=NULL; NEW.inventory_needs_confirmation:=false;
 END IF;
 IF TG_OP='INSERT' OR NEW.gender_restriction IS DISTINCT FROM OLD.gender_restriction THEN
   NEW.gender_rule:=CASE NEW.gender_restriction WHEN 'girls_only' THEN 'female_only'::unit_gender_rule WHEN 'boys_only' THEN 'male_only'::unit_gender_rule ELSE 'any'::unit_gender_rule END;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER listings_place_bridge BEFORE INSERT OR UPDATE ON listings
FOR EACH ROW EXECUTE FUNCTION bridge_legacy_listing_place();

-- A place edit updates only the compatibility copies; unit dates and counters
-- remain untouched. Field overrides still win. No public place editor in slice 1.
CREATE FUNCTION project_place_to_legacy_listings() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
 UPDATE listings l SET (area, landmark, address_line, building_name, primary_campus_id, location, electricity, electricity_cuts_start, electricity_cuts_end, electricity_hours_on, electricity_cut_windows, water, wifi_included, router_ups, elevator_24_7, has_elevator, has_solar, generator_amperes, generator_included, concierge_included, cooking_gas_included, water_bill_included, building_fees_included, parking_included_in_rent, amenities, smoking_policy, pets_policy, guests_policy, quiet_hours, target_audience)=(
   SELECT r.area, r.landmark, r.address_line, r.building_name, r.primary_campus_id, r.location, r.electricity, r.electricity_cuts_start, r.electricity_cuts_end, r.electricity_hours_on, r.electricity_cut_windows, r.water, r.wifi_included, r.router_ups, r.elevator_24_7, r.has_elevator, r.has_solar, r.generator_amperes, r.generator_included, r.concierge_included, r.cooking_gas_included, r.water_bill_included, r.building_fees_included, r.parking_included_in_rent, r.amenities, r.smoking_policy, r.pets_policy, r.guests_policy, r.quiet_hours, r.target_audience FROM jsonb_populate_record(NULL::places,
     resolve_place_values(NEW,l.place_overrides,l.unit_amenities,l.amenity_overrides)) r
 ) WHERE l.place_id=NEW.id;
 IF OLD.location IS DISTINCT FROM NEW.location THEN
   DELETE FROM place_campus_routes WHERE place_id=NEW.id;
   DELETE FROM listing_campus_routes WHERE listing_id IN (SELECT id FROM listings WHERE place_id=NEW.id);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER places_legacy_projection AFTER UPDATE ON places
FOR EACH ROW EXECUTE FUNCTION project_place_to_legacy_listings();

-- A legacy pin write occurs inside a trigger; invalidate there as well.
CREATE FUNCTION invalidate_place_routes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 DELETE FROM place_campus_routes WHERE place_id=NEW.id;
 DELETE FROM listing_campus_routes WHERE listing_id IN (SELECT id FROM listings WHERE place_id=NEW.id);
 RETURN NEW;
END $$;
CREATE TRIGGER places_route_invalidation AFTER UPDATE OF location ON places
FOR EACH ROW WHEN (OLD.location IS DISTINCT FROM NEW.location) EXECUTE FUNCTION invalidate_place_routes();

CREATE FUNCTION invalidate_campus_place_routes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 DELETE FROM place_campus_routes WHERE campus_id=NEW.id;
 DELETE FROM listing_campus_routes WHERE campus_id=NEW.id;
 RETURN NEW;
END $$;
CREATE TRIGGER campuses_place_route_invalidation AFTER UPDATE OF location ON universities
FOR EACH ROW WHEN (OLD.location IS DISTINCT FROM NEW.location) EXECUTE FUNCTION invalidate_campus_place_routes();

CREATE FUNCTION resolve_place_sources(p places, overrides jsonb, additions jsonb, flags jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
 SELECT jsonb_object_agg(key,CASE WHEN overrides ? key THEN 'unit' ELSE 'place' END)
 || jsonb_build_object('city','place','place_kind','place','amenities',(
   SELECT coalesce(jsonb_object_agg(key,CASE WHEN flags ? key OR additions ? key THEN 'unit' ELSE 'place' END),'{}')
   FROM (SELECT DISTINCT value key FROM jsonb_array_elements_text(p.amenities || additions)
         UNION SELECT jsonb_object_keys(flags)) keys
 ))
 FROM unnest(ARRAY['area','landmark','address_line','building_name','primary_campus_id','location','electricity','electricity_cuts_start','electricity_cuts_end','electricity_hours_on','electricity_cut_windows','water','wifi_included','router_ups','elevator_24_7','has_elevator','has_solar','generator_amperes','generator_included','concierge_included','cooking_gas_included','water_bill_included','building_fees_included','parking_included_in_rent','smoking_policy','pets_policy','guests_policy','quiet_hours','target_audience']) key
$$;

-- Explicit columns captured at migration time. Public reads remain unchanged.
DO $$
DECLARE cols text;
BEGIN
 SELECT string_agg(
   CASE WHEN column_name = ANY(ARRAY['area','landmark','address_line','building_name','primary_campus_id','location','electricity','electricity_cuts_start','electricity_cuts_end','electricity_hours_on','electricity_cut_windows','water','wifi_included','router_ups','elevator_24_7','has_elevator','has_solar','generator_amperes','generator_included','concierge_included','cooking_gas_included','water_bill_included','building_fees_included','parking_included_in_rent','amenities','smoking_policy','pets_policy','guests_policy','quiet_hours','target_audience']::text[]) THEN format('r.%I',column_name) ELSE format('l.%I',column_name) END,
   ', ' ORDER BY ordinal_position)
 INTO cols FROM information_schema.columns WHERE table_schema='public' AND table_name='listings';
 EXECUTE 'CREATE VIEW listing_resolved AS SELECT ' || cols ||
 ', p.kind AS place_kind, p.city, resolve_place_sources(p,l.place_overrides,l.unit_amenities,l.amenity_overrides) AS effective_sources
 FROM listings l JOIN places p ON p.id=l.place_id
 CROSS JOIN LATERAL jsonb_populate_record(NULL::places,resolve_place_values(p,l.place_overrides,l.unit_amenities,l.amenity_overrides)) r';
END $$;


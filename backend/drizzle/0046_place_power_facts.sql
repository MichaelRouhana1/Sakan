ALTER TABLE places
  ADD COLUMN IF NOT EXISTS power_sources text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS power_hours varchar(16);
--> statement-breakpoint
UPDATE places SET
  power_sources = CASE
    WHEN electricity = 'generator_24_7' AND has_solar THEN ARRAY['generator','solar']::text[]
    WHEN electricity = 'generator_24_7' THEN ARRAY['generator']::text[]
    WHEN electricity = 'scheduled_cuts' AND has_solar THEN ARRAY['state_power','solar']::text[]
    WHEN electricity = 'scheduled_cuts' THEN ARRAY['state_power']::text[]
    WHEN electricity = 'solar' THEN ARRAY['solar']::text[]
    ELSE power_sources
  END,
  power_hours = CASE WHEN electricity = 'scheduled_cuts' THEN 'scheduled_cuts' ELSE 'always' END,
  has_solar = CASE WHEN electricity = 'solar' THEN true ELSE has_solar END
WHERE power_sources = '{}';
--> statement-breakpoint
ALTER TABLE places DROP CONSTRAINT IF EXISTS places_power_sources_ck;
ALTER TABLE places ADD CONSTRAINT places_power_sources_ck CHECK (
  power_sources <@ ARRAY['state_power','generator','solar']::text[]
);
ALTER TABLE places DROP CONSTRAINT IF EXISTS places_power_hours_ck;
ALTER TABLE places ADD CONSTRAINT places_power_hours_ck CHECK (
  power_hours IS NULL OR power_hours IN ('always','scheduled_cuts')
);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION resolve_place_values(p places, overrides jsonb, additions jsonb, amenity_flags jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE result jsonb; entry record; value_type text;
BEGIN
 IF jsonb_typeof(overrides) IS DISTINCT FROM 'object' OR jsonb_typeof(amenity_flags) IS DISTINCT FROM 'object'
    OR jsonb_typeof(additions) IS DISTINCT FROM 'array' THEN
   RAISE EXCEPTION 'Invalid unit override containers' USING ERRCODE='23514';
 END IF;
 FOR entry IN SELECT * FROM jsonb_each(overrides) LOOP
   IF NOT entry.key = ANY(ARRAY['electricity','power_sources','power_hours','electricity_cuts_start','electricity_cuts_end','electricity_hours_on','electricity_cut_windows','water','water_sources','hot_water','wifi_included','router_ups','elevator_24_7','has_elevator','has_solar','generator_amperes','generator_included','concierge_included','cooking_gas_included','water_bill_included','building_fees_included','parking_included_in_rent','smoking_policy','pets_policy','guests_policy','quiet_hours','target_audience']::text[]) THEN
     RAISE EXCEPTION 'Unsupported place override: %',entry.key USING ERRCODE='23514';
   END IF;
   value_type := jsonb_typeof(entry.value);
   IF value_type='null' THEN
     IF NOT entry.key = ANY(ARRAY['electricity_cuts_start','electricity_cuts_end','electricity_hours_on','generator_amperes','hot_water','power_hours']::text[]) THEN
       RAISE EXCEPTION 'Cannot clear required place field: %',entry.key USING ERRCODE='23514';
     END IF;
   ELSIF entry.key = ANY(ARRAY['wifi_included','router_ups','elevator_24_7','has_elevator','has_solar','generator_included','concierge_included','cooking_gas_included','water_bill_included','building_fees_included','parking_included_in_rent','quiet_hours']::text[]) THEN
     IF value_type <> 'boolean' THEN RAISE EXCEPTION 'Expected boolean override: %',entry.key USING ERRCODE='23514'; END IF;
   ELSIF entry.key = ANY(ARRAY['generator_amperes','electricity_hours_on']) THEN
     IF value_type <> 'number' OR entry.value::text !~ '^-?[0-9]+$' THEN RAISE EXCEPTION 'Expected integer override' USING ERRCODE='23514'; END IF;
   ELSIF entry.key = ANY(ARRAY['electricity_cut_windows','water_sources','power_sources']) THEN
     IF value_type <> 'array' THEN RAISE EXCEPTION 'Expected array override: %',entry.key USING ERRCODE='23514'; END IF;
   ELSIF value_type <> 'string' THEN RAISE EXCEPTION 'Expected string override: %',entry.key USING ERRCODE='23514';
   END IF;
 END LOOP;
 IF EXISTS(SELECT FROM jsonb_array_elements(additions) v WHERE jsonb_typeof(v)<>'string')
    OR EXISTS(SELECT FROM jsonb_each(amenity_flags) WHERE jsonb_typeof(value)<>'boolean') THEN
   RAISE EXCEPTION 'Invalid unit amenities' USING ERRCODE='23514';
 END IF;
 result := to_jsonb(p);
 FOR entry IN SELECT * FROM jsonb_each(overrides) LOOP
   IF entry.value IS DISTINCT FROM to_jsonb(p)->entry.key THEN
     result := result || jsonb_build_object(entry.key, entry.value);
   END IF;
 END LOOP;
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
--> statement-breakpoint
CREATE OR REPLACE FUNCTION resolve_place_sources(p places, overrides jsonb, additions jsonb, flags jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
 SELECT jsonb_object_agg(key,CASE
   WHEN overrides ? key AND overrides->key IS DISTINCT FROM to_jsonb(p)->key THEN 'unit'
   ELSE 'place' END)
 || jsonb_build_object('city','place','place_kind','place','amenities',(
   SELECT coalesce(jsonb_object_agg(key,CASE WHEN flags ? key OR additions ? key THEN 'unit' ELSE 'place' END),'{}')
   FROM (SELECT DISTINCT value key FROM jsonb_array_elements_text(p.amenities || additions)
         UNION SELECT jsonb_object_keys(flags)) keys
 ))
 FROM unnest(ARRAY['area','landmark','address_line','building_name','primary_campus_id','location','electricity','power_sources','power_hours','electricity_cuts_start','electricity_cuts_end','electricity_hours_on','electricity_cut_windows','water','water_sources','hot_water','wifi_included','router_ups','elevator_24_7','has_elevator','has_solar','generator_amperes','generator_included','concierge_included','cooking_gas_included','water_bill_included','building_fees_included','parking_included_in_rent','smoking_policy','pets_policy','guests_policy','quiet_hours','target_audience']) key
$$;
--> statement-breakpoint
DROP VIEW IF EXISTS listing_resolved;
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
  r.power_sources,
  r.power_hours,
  r.electricity_cuts_start,
  r.electricity_cuts_end,
  r.electricity_hours_on,
  r.electricity_cut_windows,
  r.water,
  r.water_sources,
  r.hot_water,
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

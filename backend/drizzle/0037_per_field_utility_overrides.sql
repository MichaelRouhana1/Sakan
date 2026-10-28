-- Per-field utility inheritance. An override equal to the place value is not an override.
CREATE OR REPLACE FUNCTION resolve_place_values(p places, overrides jsonb, additions jsonb, amenity_flags jsonb)
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
 FROM unnest(ARRAY['area','landmark','address_line','building_name','primary_campus_id','location','electricity','electricity_cuts_start','electricity_cuts_end','electricity_hours_on','electricity_cut_windows','water','wifi_included','router_ups','elevator_24_7','has_elevator','has_solar','generator_amperes','generator_included','concierge_included','cooking_gas_included','water_bill_included','building_fees_included','parking_included_in_rent','smoking_policy','pets_policy','guests_policy','quiet_hours','target_audience']) key
$$;
--> statement-breakpoint
UPDATE listings l
SET place_overrides = s.pruned
FROM (
  SELECT l2.id,
    COALESCE((
      SELECT jsonb_object_agg(e.key, e.value)
      FROM jsonb_each(l2.place_overrides) e
      JOIN places p ON p.id = l2.place_id
      WHERE e.value IS DISTINCT FROM to_jsonb(p)->e.key
    ), '{}'::jsonb) AS pruned
  FROM listings l2
  WHERE l2.place_overrides <> '{}'::jsonb
) s
WHERE l.id = s.id AND l.place_overrides IS DISTINCT FROM s.pruned;
--> statement-breakpoint
UPDATE listings l
SET unit_amenities = '[]'::jsonb
FROM places p
WHERE l.place_id = p.id
  AND l.amenity_overrides = '{}'::jsonb
  AND l.unit_amenities <> '[]'::jsonb
  AND (
    SELECT coalesce(jsonb_agg(value ORDER BY value), '[]'::jsonb)
    FROM jsonb_array_elements_text(l.unit_amenities)
  ) = (
    SELECT coalesce(jsonb_agg(value ORDER BY value), '[]'::jsonb)
    FROM jsonb_array_elements_text(p.amenities)
  );

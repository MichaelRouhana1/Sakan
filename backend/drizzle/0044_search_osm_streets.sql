-- search_normalize v2: IMMUTABLE, static Latin fold (no unaccent), Arabic folds,
-- final hamza drop, generic street words ignored. "st" is deliberately NOT generic
-- (St Joseph / St Nicolas). Generic words are dropped only if another token remains.
CREATE OR REPLACE FUNCTION search_normalize(value text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = pg_catalog AS $fn$
  SELECT coalesce(
    nullif(btrim(regexp_replace(' ' || t.s || ' ',
      '\s(?:street|rue|road|rd|avenue|av|شارع|طريق)(?=\s)', '', 'g')), ''),
    t.s)
  FROM (SELECT btrim(regexp_replace(
      regexp_replace(
        regexp_replace(
          translate(
            replace(replace(replace(lower(regexp_replace(normalize(coalesce(value, ''), NFKC),
              U&'[\0300-\036f\0610-\061a\064b-\065f\0670\06d6-\06ed\0640\200b-\200f\202a-\202e\2066-\2069\feff]', '', 'g')),
              'æ', 'ae'), 'œ', 'oe'), 'ß', 'ss'),
            'àáâãäåçèéêëìíîïñòóôõöùúûüýÿāăąćĉċčďēĕėęěĝğġģĥĩīĭįĵķĺļľńņňōŏőŕŗřśŝşšţťũūŭůűųŵŷźżžơưǎǐǒǔǖǘǚǜǟǡǧǩǫǭǰǵǹǻȁȃȅȇȉȋȍȏȑȓȕȗșțȟȧȩȫȭȯȱȳḁḃḅḇḉḋḍḏḑḓḕḗḙḛḝḟḡḣḥḧḩḫḭḯḱḳḵḷḹḻḽḿṁṃṅṇṉṋṍṏṑṓṕṗṙṛṝṟṡṣṥṧṩṫṭṯṱṳṵṷṹṻṽṿẁẃẅẇẉẋẍẏẑẓẕẖẗẘẙạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹøđłıðħŧأإآٱىیكکة٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', 'aaaaaaceeeeiiiinooooouuuuyyaaaccccdeeeeegggghiiiijklllnnnooorrrssssttuuuuuuwyzzzouaiouuuuuaagkoojgnaaaeeiioorruusthaeooooyabbbcdddddeeeeefghhhhhiikkkllllmmmnnnnoooopprrrrsssssttttuuuuuvvwwwwwxxyzzzhtwyaaaaaaaaaaaaeeeeeeeeiioooooooooooouuuuuuuyyyyodlidhtااااييككه01234567890123456789'),
          '[^[:alnum:]]+', ' ', 'g'),
        'ء+(\s|$)', '\1', 'g'),
      '\s+', ' ', 'g')) AS s) t
$fn$;
--> statement-breakpoint
-- Derived values only: alias text is never rewritten.
UPDATE search_aliases SET normalized=search_normalize(alias) WHERE normalized IS DISTINCT FROM search_normalize(alias);
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS postgis;
ALTER TABLE search_locations
  ADD COLUMN IF NOT EXISTS source varchar(8) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS radius_m integer NOT NULL DEFAULT 800,
  ADD COLUMN IF NOT EXISTS parent_area_id text,
  ADD COLUMN IF NOT EXISTS parent_area_kind varchar(8) GENERATED ALWAYS AS (CASE WHEN parent_area_id IS NOT NULL THEN 'area' END) STORED,
  ADD COLUMN IF NOT EXISTS geom geography(MultiLineString,4326),
  ADD COLUMN IF NOT EXISTS osm_ids text[],
  ADD COLUMN IF NOT EXISTS multi_area boolean NOT NULL DEFAULT false;
ALTER TABLE search_locations
  DROP CONSTRAINT IF EXISTS search_locations_parent_area_fk,
  DROP CONSTRAINT IF EXISTS search_locations_id_kind_city_uq,
  DROP CONSTRAINT IF EXISTS search_locations_source,
  DROP CONSTRAINT IF EXISTS search_locations_radius,
  DROP CONSTRAINT IF EXISTS search_locations_shape;
ALTER TABLE search_locations ADD CONSTRAINT search_locations_source CHECK (source IN ('manual','osm'));
ALTER TABLE search_locations ADD CONSTRAINT search_locations_radius CHECK (radius_m BETWEEN 100 AND 5000);
-- Streets and hoods must sit under an area of the same city they display.
ALTER TABLE search_locations ADD CONSTRAINT search_locations_id_kind_city_uq UNIQUE(id, kind, parent_city_id);
ALTER TABLE search_locations ADD CONSTRAINT search_locations_parent_area_fk
  FOREIGN KEY(parent_area_id, parent_area_kind, parent_city_id) REFERENCES search_locations(id, kind, parent_city_id);
ALTER TABLE search_locations ADD CONSTRAINT search_locations_shape CHECK (
  (kind = 'city' AND parent_city_id IS NULL AND canonical_area IS NULL AND parent_area_id IS NULL AND geom IS NULL) OR
  (kind = 'area' AND parent_city_id IS NOT NULL AND canonical_area IS NOT NULL AND parent_area_id IS NULL AND geom IS NULL) OR
  (kind = 'street' AND parent_city_id IS NOT NULL AND parent_area_id IS NOT NULL AND canonical_area IS NULL AND geom IS NOT NULL AND lat IS NOT NULL) OR
  (kind = 'hood' AND parent_city_id IS NOT NULL AND parent_area_id IS NOT NULL AND canonical_area IS NULL AND geom IS NULL AND lat IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS search_locations_parent_area_idx ON search_locations(parent_area_id);
CREATE INDEX IF NOT EXISTS search_locations_geom_idx ON search_locations USING gist(geom);
UPDATE search_locations SET radius_m=400
  WHERE kind IN ('city','area') AND (id='city:beirut' OR parent_city_id='city:beirut') AND radius_m<>400;
--> statement-breakpoint
ALTER TABLE search_aliases DROP CONSTRAINT IF EXISTS search_aliases_source;
ALTER TABLE search_aliases ADD CONSTRAINT search_aliases_source CHECK(source IN ('canonical','institution','seed','curated','osm'));
ALTER TABLE user_search_recents DROP CONSTRAINT IF EXISTS user_search_recents_type;
ALTER TABLE user_search_recents ADD CONSTRAINT user_search_recents_type CHECK(entity_type IN ('city','area','campus','place','street','hood'));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION search_refresh_location_aliases(target text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE l record; p record;
BEGIN
  SELECT * INTO l FROM search_locations WHERE id=target;
  DELETE FROM search_aliases WHERE location_id=target AND source='canonical';
  IF l.id IS NULL THEN RETURN; END IF;
  -- Street slugs carry the city ("bliss-street-beirut") and would match the city's name.
  INSERT INTO search_aliases(location_id,alias,normalized,language,source)
    SELECT target,v.alias,'',v.lang,'canonical' FROM (VALUES
      (l.name_en,'en'),(l.name_ar,'ar'),(CASE WHEN l.kind<>'street' THEN l.slug END,'und'),(l.canonical_area,'en')
    ) v(alias,lang) WHERE length(public.search_normalize(v.alias))>0 ON CONFLICT DO NOTHING;
  IF l.kind='area' THEN
    FOR p IN SELECT id FROM places WHERE area=l.canonical_area LOOP
      PERFORM search_refresh_place_aliases(p.id);
    END LOOP;
  END IF;
END $$;

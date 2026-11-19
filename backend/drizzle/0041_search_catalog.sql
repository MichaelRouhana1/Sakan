CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint
-- STABLE deliberately: unaccent's dictionary is not immutable. Index the
-- trigger-maintained value, never an incorrectly IMMUTABLE wrapper.
CREATE OR REPLACE FUNCTION search_normalize(value text) RETURNS text
LANGUAGE sql STABLE PARALLEL SAFE SET search_path = pg_catalog, public AS $$
  SELECT btrim(regexp_replace(
    translate(lower(public.unaccent('public.unaccent'::regdictionary,
      regexp_replace(normalize(coalesce(value, ''), NFKC),
        U&'[\0300-\036f\0610-\061a\064b-\065f\0670\06d6-\06ed\0640\200b-\200f\202a-\202e\2066-\2069\feff]', '', 'g')
    )), 'أإآٱىیكکة٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', 'ااااييككه01234567890123456789'),
    '[^[:alnum:]]+', ' ', 'g'))
$$;
--> statement-breakpoint
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS name_ar text;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS name_ar text;
ALTER TABLE places ADD COLUMN IF NOT EXISTS building_name_ar varchar(256);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS search_locations (
  id text PRIMARY KEY,
  kind varchar(8) NOT NULL,
  slug varchar(100) NOT NULL,
  name_en text NOT NULL,
  name_ar text NOT NULL,
  district_en text NOT NULL,
  district_ar text NOT NULL,
  parent_city_id text REFERENCES search_locations(id) ON DELETE RESTRICT,
  parent_city_kind varchar(8) GENERATED ALWAYS AS (CASE WHEN parent_city_id IS NOT NULL THEN 'city' END) STORED,
  canonical_area varchar(128) UNIQUE,
  lat double precision,
  lng double precision,
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT search_locations_kind_slug_uq UNIQUE(kind, slug),
  CONSTRAINT search_locations_id_kind_uq UNIQUE(id, kind),
  CONSTRAINT search_locations_parent_city_fk FOREIGN KEY(parent_city_id, parent_city_kind) REFERENCES search_locations(id, kind),
  CONSTRAINT search_locations_shape CHECK (
    (kind = 'city' AND parent_city_id IS NULL AND canonical_area IS NULL) OR
    (kind = 'area' AND parent_city_id IS NOT NULL AND canonical_area IS NOT NULL)
  ),
  CONSTRAINT search_locations_names CHECK(length(btrim(name_en)) > 0 AND length(btrim(name_ar)) > 0),
  CONSTRAINT search_locations_coordinates CHECK (
    (lat IS NULL AND lng IS NULL) OR
    (lat IS NOT NULL AND lng IS NOT NULL AND lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
  )
);
CREATE INDEX IF NOT EXISTS search_locations_parent_idx ON search_locations(parent_city_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS search_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text REFERENCES search_locations(id) ON DELETE CASCADE,
  campus_id uuid REFERENCES universities(id) ON DELETE CASCADE,
  place_id uuid REFERENCES places(id) ON DELETE CASCADE,
  target_key text GENERATED ALWAYS AS (CASE WHEN location_id IS NOT NULL THEN location_id WHEN campus_id IS NOT NULL THEN 'campus:' || campus_id::text ELSE 'place:' || place_id::text END) STORED,
  alias text NOT NULL,
  normalized text NOT NULL,
  language varchar(16) NOT NULL DEFAULT 'und',
  source varchar(16) NOT NULL DEFAULT 'curated',
  CONSTRAINT search_aliases_one_target CHECK(num_nonnulls(location_id, campus_id, place_id) = 1),
  CONSTRAINT search_aliases_nonempty CHECK(length(normalized) > 0),
  CONSTRAINT search_aliases_source CHECK(source IN ('canonical','institution','seed','curated')),
  CONSTRAINT search_aliases_target_alias_source_uq UNIQUE(target_key, alias, source)
);
CREATE INDEX IF NOT EXISTS search_aliases_normalized_idx ON search_aliases(normalized text_pattern_ops);
CREATE INDEX IF NOT EXISTS search_aliases_trgm_idx ON search_aliases USING gin(normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS search_aliases_location_idx ON search_aliases(location_id);
CREATE INDEX IF NOT EXISTS search_aliases_campus_idx ON search_aliases(campus_id);
CREATE INDEX IF NOT EXISTS search_aliases_place_idx ON search_aliases(place_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS user_search_recents (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type varchar(8) NOT NULL,
  entity_id text NOT NULL,
  last_selected_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, entity_type, entity_id),
  CONSTRAINT user_search_recents_type CHECK(entity_type IN ('city','area','campus','place')),
  CONSTRAINT user_search_recents_id CHECK(length(btrim(entity_id)) > 0)
);
CREATE INDEX IF NOT EXISTS user_search_recents_latest_idx ON user_search_recents(user_id, last_selected_at DESC);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION search_normalize_alias() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.alias := btrim(NEW.alias);
  NEW.normalized := public.search_normalize(NEW.alias);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS search_aliases_normalize ON search_aliases;
CREATE TRIGGER search_aliases_normalize BEFORE INSERT OR UPDATE ON search_aliases
FOR EACH ROW EXECUTE FUNCTION search_normalize_alias();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION search_refresh_campus_aliases(target uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE c record;
BEGIN
  SELECT u.*, i.short_name, i.name AS institution_name, i.name_ar AS institution_name_ar, i.slug AS institution_slug
    INTO c FROM universities u LEFT JOIN institutions i ON i.id=u.institution_id WHERE u.id=target;
  DELETE FROM search_aliases WHERE campus_id=target AND source IN ('canonical','institution');
  IF c.id IS NULL THEN RETURN; END IF;
  INSERT INTO search_aliases(campus_id,alias,normalized,language,source)
    SELECT target, v.alias, '', v.lang, v.source FROM (VALUES
      (c.name, 'en', 'canonical'), (c.name_ar, 'ar', 'canonical'), (c.slug, 'und', 'canonical'),
      (concat_ws(' — ',c.short_name,c.name), 'en', 'canonical'),
      (CASE WHEN c.name_ar IS NOT NULL THEN concat_ws(' — ',c.institution_name_ar,c.name_ar) END,'ar','canonical'),
      (c.short_name,'en','institution'), (c.institution_name,'en','institution'),
      (c.institution_name_ar,'ar','institution'),
      (CASE WHEN c.short_name IS NOT NULL THEN concat_ws(' ',c.short_name,c.city) END,'en','institution'),
      (CASE WHEN c.short_name IS NOT NULL THEN concat_ws(' ',c.short_name,c.name) END,'en','institution')
    ) v(alias,lang,source) WHERE length(public.search_normalize(v.alias))>0 ON CONFLICT DO NOTHING;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION search_refresh_place_aliases(target uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE p record; label_en text; label_ar text;
BEGIN
  SELECT q.*, l.name_ar AS area_ar INTO p FROM places q
    LEFT JOIN search_locations l ON l.canonical_area=q.area AND l.kind='area' WHERE q.id=target;
  DELETE FROM search_aliases WHERE place_id=target AND source='canonical';
  IF p.id IS NULL THEN RETURN; END IF;
  label_en := coalesce(nullif(btrim(p.building_name),''), CASE WHEN p.kind='building' THEN 'Building in ' ELSE 'Apartment in ' END || p.area);
  label_ar := coalesce(nullif(btrim(p.building_name_ar),''),
    CASE WHEN nullif(btrim(p.building_name),'') IS NOT NULL THEN p.building_name || ' — ' || coalesce(p.area_ar,p.area)
      ELSE CASE WHEN p.kind='building' THEN 'مبنى في ' ELSE 'شقة في ' END || coalesce(p.area_ar,p.area) END);
  INSERT INTO search_aliases(place_id,alias,normalized,language,source)
    VALUES(target,label_en,'','en','canonical'),(target,label_ar,'','ar','canonical') ON CONFLICT DO NOTHING;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION search_refresh_location_aliases(target text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE l record; p record;
BEGIN
  SELECT * INTO l FROM search_locations WHERE id=target;
  DELETE FROM search_aliases WHERE location_id=target AND source='canonical';
  IF l.id IS NULL THEN RETURN; END IF;
  INSERT INTO search_aliases(location_id,alias,normalized,language,source)
    SELECT target,v.alias,'',v.lang,'canonical' FROM (VALUES
      (l.name_en,'en'),(l.name_ar,'ar'),(l.slug,'und'),(l.canonical_area,'en')
    ) v(alias,lang) WHERE length(public.search_normalize(v.alias))>0 ON CONFLICT DO NOTHING;
  IF l.kind='area' THEN
    FOR p IN SELECT id FROM places WHERE area=l.canonical_area LOOP
      PERFORM search_refresh_place_aliases(p.id);
    END LOOP;
  END IF;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION search_source_aliases_changed() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c record;
BEGIN
  IF TG_TABLE_NAME='search_locations' THEN PERFORM search_refresh_location_aliases(NEW.id);
  ELSIF TG_TABLE_NAME='universities' THEN PERFORM search_refresh_campus_aliases(NEW.id);
  ELSIF TG_TABLE_NAME='places' THEN PERFORM search_refresh_place_aliases(NEW.id);
  ELSIF TG_TABLE_NAME='institutions' THEN
    FOR c IN SELECT id FROM universities WHERE institution_id=NEW.id LOOP
      PERFORM search_refresh_campus_aliases(c.id);
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS search_locations_aliases ON search_locations;
CREATE TRIGGER search_locations_aliases AFTER INSERT OR UPDATE OF name_en,name_ar,slug,canonical_area ON search_locations FOR EACH ROW EXECUTE FUNCTION search_source_aliases_changed();
DROP TRIGGER IF EXISTS search_campus_aliases ON universities;
CREATE TRIGGER search_campus_aliases AFTER INSERT OR UPDATE OF name,name_ar,slug,city,institution_id ON universities FOR EACH ROW EXECUTE FUNCTION search_source_aliases_changed();
DROP TRIGGER IF EXISTS search_place_aliases ON places;
CREATE TRIGGER search_place_aliases AFTER INSERT OR UPDATE OF building_name,building_name_ar,area,kind ON places FOR EACH ROW EXECUTE FUNCTION search_source_aliases_changed();
DROP TRIGGER IF EXISTS search_institution_aliases ON institutions;
CREATE TRIGGER search_institution_aliases AFTER UPDATE OF name,name_ar,short_name ON institutions FOR EACH ROW EXECUTE FUNCTION search_source_aliases_changed();

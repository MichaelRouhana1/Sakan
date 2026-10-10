ALTER TABLE places ADD COLUMN hidden boolean NOT NULL DEFAULT false;
ALTER TABLE listings ADD COLUMN hidden boolean NOT NULL DEFAULT false;
ALTER TABLE listing_photos ADD COLUMN flagged boolean NOT NULL DEFAULT false;
--> statement-breakpoint
CREATE TABLE listing_charge_ledger (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES users(id),
 listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
 listing_id_snapshot uuid NOT NULL,
 operation_key text NOT NULL UNIQUE,
 reason text NOT NULL CHECK(reason IN ('publish','renew')),
 credits integer NOT NULL CHECK(credits IN (0,1)),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX listing_charge_owner_idx ON listing_charge_ledger(owner_id,created_at);
--> statement-breakpoint
-- Live predicate: status/expiry never prove vacancy. No coordinate-based grouping.
CREATE FUNCTION unit_occupied(l listings) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT l.availability='rented' OR
   (l.unit_type='shared_bed' AND l.beds_available IS NOT NULL AND l.beds_available<l.beds_total)
$$;
CREATE FUNCTION unit_hidden_reason(l listings) RETURNS text LANGUAGE sql STABLE AS $$
 SELECT CASE
  WHEN l.hidden THEN 'unit_hidden'
  WHEN p.hidden THEN 'place_hidden'
  WHEN l.inventory_needs_confirmation THEN 'confirm_beds'
  WHEN l.unit_type='shared_bed' AND l.beds_available=0 THEN 'no_beds'
  WHEN p.kind='apartment' AND EXISTS (
   SELECT 1 FROM listings sibling WHERE sibling.place_id=l.place_id AND sibling.id<>l.id
    AND (unit_occupied(sibling) OR (l.unit_type='whole_apartment' AND sibling.inventory_needs_confirmation))
    AND (sibling.unit_type='whole_apartment' OR l.unit_type='whole_apartment')
  ) THEN 'occupied_alternative'
  ELSE NULL END FROM places p WHERE p.id=l.place_id AND p.owner_id=l.poster_id
$$;
--> statement-breakpoint
CREATE FUNCTION bump_unit_inventory_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.unit_type='shared_bed' AND NEW.beds_total IS DISTINCT FROM OLD.beds_total AND NEW.beds IS NOT DISTINCT FROM OLD.beds THEN
  NEW.beds:=NEW.beds_total;
 END IF;
 IF (NEW.hidden,NEW.availability,NEW.beds_total,NEW.beds_available,NEW.inventory_needs_confirmation,NEW.place_id,NEW.unit_type,NEW.status)
    IS DISTINCT FROM
    (OLD.hidden,OLD.availability,OLD.beds_total,OLD.beds_available,OLD.inventory_needs_confirmation,OLD.place_id,OLD.unit_type,OLD.status) THEN
   NEW.inventory_version:=OLD.inventory_version+1;
 END IF;
 RETURN NEW;
END $$;
-- Run after the foundation's legacy bridge has resolved bed metadata.
CREATE TRIGGER z_unit_inventory_version BEFORE UPDATE ON listings
 FOR EACH ROW EXECUTE FUNCTION bump_unit_inventory_version();
--> statement-breakpoint
-- Preserve all resolved columns and append the new unit field without rebuilding
-- the historical resolver or changing its established column order.
DO $$
DECLARE definition text;
BEGIN
 definition := rtrim(pg_get_viewdef('listing_resolved'::regclass,true), E';\n ');
 EXECUTE 'CREATE OR REPLACE VIEW listing_resolved AS SELECT resolved.*, l.hidden FROM ('
  || definition || ') resolved JOIN listings l ON l.id=resolved.id';
END $$;

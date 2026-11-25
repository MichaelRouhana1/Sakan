-- Rent unit follows rental type. Full shared rooms stay visible (no no_beds hide).
-- Flag old per-bed prices on whole apartments / private rooms for manual review.

CREATE TABLE IF NOT EXISTS price_basis_migration_flags (
  listing_id uuid PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  unit_type text NOT NULL,
  old_price_basis text NOT NULL,
  new_price_basis text NOT NULL,
  monthly_rent_usd integer NOT NULL,
  flagged_at timestamptz NOT NULL DEFAULT now(),
  note text NOT NULL
);
--> statement-breakpoint
INSERT INTO price_basis_migration_flags (
  listing_id, unit_type, old_price_basis, new_price_basis, monthly_rent_usd, note
)
SELECT
  l.id,
  l.unit_type::text,
  l.price_basis::text,
  CASE l.unit_type
    WHEN 'private_room' THEN 'per_room_month'
    ELSE 'per_unit_month'
  END,
  l.monthly_rent_usd,
  'Old per-bed price on whole apartment or private room — amount kept, basis corrected to rental type'
FROM listings l
WHERE l.unit_type IN ('whole_apartment', 'private_room')
  AND l.price_basis = 'per_bed_month'
ON CONFLICT (listing_id) DO NOTHING;
--> statement-breakpoint
DO $$
DECLARE flagged integer;
BEGIN
  SELECT count(*)::int INTO flagged FROM price_basis_migration_flags;
  RAISE NOTICE 'price_basis_migration_flags: % listing(s) kept amount but corrected basis from per_bed_month', flagged;
END $$;
--> statement-breakpoint
UPDATE listings SET price_basis = (
  CASE unit_type
    WHEN 'shared_bed' THEN 'per_bed_month'
    WHEN 'private_room' THEN 'per_room_month'
    ELSE 'per_unit_month'
  END
)::price_basis;
--> statement-breakpoint
-- Existing shared rooms start fully available; hosts adjust beds available afterward.
UPDATE listings
SET
  beds_available = beds_total,
  inventory_needs_confirmation = false
WHERE unit_type = 'shared_bed'
  AND beds_total IS NOT NULL;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION unit_hidden_reason(l listings) RETURNS text LANGUAGE sql STABLE AS $$
 SELECT CASE
  WHEN l.hidden THEN 'unit_hidden'
  WHEN p.hidden THEN 'place_hidden'
  WHEN l.inventory_needs_confirmation THEN 'confirm_beds'
  WHEN p.kind='apartment' AND EXISTS (
   SELECT 1 FROM listings sibling WHERE sibling.place_id=l.place_id AND sibling.id<>l.id
    AND (unit_occupied(sibling) OR (l.unit_type='whole_apartment' AND sibling.inventory_needs_confirmation))
    AND (sibling.unit_type='whole_apartment' OR l.unit_type='whole_apartment')
  ) THEN 'occupied_alternative'
  ELSE NULL END FROM places p WHERE p.id=l.place_id AND p.owner_id=l.poster_id
$$;

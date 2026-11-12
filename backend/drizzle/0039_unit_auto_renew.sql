ALTER TABLE listings ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT false;
--> statement-breakpoint
-- A promotion belongs to the listing cycle in which it was purchased, even
-- when the listing itself is renewed before that cycle ends.
ALTER TABLE promotion_campaigns ADD COLUMN IF NOT EXISTS listing_cycle_expires_at timestamptz;
UPDATE promotion_campaigns c SET listing_cycle_expires_at=l.expires_at
FROM listings l WHERE l.id=c.listing_id AND c.listing_cycle_expires_at IS NULL;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION promotion_listing_cycle() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.listing_cycle_expires_at IS NULL THEN
  IF NEW.renewed_from_id IS NOT NULL THEN
   SELECT listing_cycle_expires_at INTO NEW.listing_cycle_expires_at FROM promotion_campaigns WHERE id=NEW.renewed_from_id;
  ELSE
   SELECT expires_at INTO NEW.listing_cycle_expires_at FROM listings WHERE id=NEW.listing_id;
  END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS promotion_listing_cycle ON promotion_campaigns;
CREATE TRIGGER promotion_listing_cycle BEFORE INSERT ON promotion_campaigns FOR EACH ROW EXECUTE FUNCTION promotion_listing_cycle();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION disable_unit_auto_renew() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.availability='rented' OR NEW.status IN ('draft','archived','removed') THEN NEW.auto_renew=false; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS disable_unit_auto_renew ON listings;
CREATE TRIGGER disable_unit_auto_renew BEFORE INSERT OR UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION disable_unit_auto_renew();
--> statement-breakpoint
ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'renewal_credit_needed';
ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'renewal_beds_needed';
ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'renewal_succeeded';
ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'renewal_failed';

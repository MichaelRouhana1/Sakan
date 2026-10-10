-- Gender suggestions use the same optimistic concurrency token as bed changes.
-- Also covers changes made through the existing listing editor or by staff.
CREATE FUNCTION bump_unit_gender_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 NEW.inventory_version:=OLD.inventory_version+1;
 RETURN NEW;
END $$;
CREATE TRIGGER y_unit_gender_version BEFORE UPDATE OF gender_restriction ON listings
 FOR EACH ROW WHEN (NEW.gender_restriction IS DISTINCT FROM OLD.gender_restriction)
 EXECUTE FUNCTION bump_unit_gender_version();

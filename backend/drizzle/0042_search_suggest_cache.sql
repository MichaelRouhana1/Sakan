-- A transactionally updated revision makes per-process suggestion caches safe
-- across admin edits, host edits, background jobs, and multiple API workers.
CREATE TABLE search_catalog_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  revision bigint NOT NULL DEFAULT 0
);
INSERT INTO search_catalog_state(singleton) VALUES (true);
--> statement-breakpoint
CREATE FUNCTION search_catalog_changed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE search_catalog_state SET revision=revision+1 WHERE singleton;
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE TRIGGER search_revision_locations AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON search_locations FOR EACH STATEMENT EXECUTE FUNCTION search_catalog_changed();
CREATE TRIGGER search_revision_aliases AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON search_aliases FOR EACH STATEMENT EXECUTE FUNCTION search_catalog_changed();
CREATE TRIGGER search_revision_campuses AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON universities FOR EACH STATEMENT EXECUTE FUNCTION search_catalog_changed();
CREATE TRIGGER search_revision_institutions AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON institutions FOR EACH STATEMENT EXECUTE FUNCTION search_catalog_changed();
CREATE TRIGGER search_revision_places AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON places FOR EACH STATEMENT EXECUTE FUNCTION search_catalog_changed();
CREATE TRIGGER search_revision_units AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON listings FOR EACH STATEMENT EXECUTE FUNCTION search_catalog_changed();

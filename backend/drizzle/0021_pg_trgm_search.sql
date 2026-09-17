CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "listings_title_trgm_idx"
  ON "listings" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "universities_name_trgm_idx"
  ON "universities" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "universities_slug_trgm_idx"
  ON "universities" USING gin ("slug" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "institutions_name_trgm_idx"
  ON "institutions" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "institutions_short_name_trgm_idx"
  ON "institutions" USING gin ("short_name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "institutions_slug_trgm_idx"
  ON "institutions" USING gin ("slug" gin_trgm_ops);

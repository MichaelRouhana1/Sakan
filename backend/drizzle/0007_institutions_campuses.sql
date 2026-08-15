CREATE TABLE IF NOT EXISTS "institutions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "short_name" varchar(32) NOT NULL,
  "slug" varchar(64) NOT NULL,
  "website" varchar(512),
  "logo_url" varchar(2048),
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "institutions_slug_unique" UNIQUE("slug")
);

ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "institution_id" uuid;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "city" varchar(128);
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "address" varchar(256);
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "is_main" boolean DEFAULT false NOT NULL;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "active" boolean DEFAULT true NOT NULL;
ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz DEFAULT now() NOT NULL;

DO $$ BEGIN
  ALTER TABLE "universities"
    ADD CONSTRAINT "universities_institution_id_institutions_id_fk"
    FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "campus_id" uuid;

DO $$ BEGIN
  ALTER TABLE "users"
    ADD CONSTRAINT "users_campus_id_universities_id_fk"
    FOREIGN KEY ("campus_id") REFERENCES "universities"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

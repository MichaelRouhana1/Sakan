DROP TABLE IF EXISTS listing_wizard_drafts;
--> statement-breakpoint
DELETE FROM listings WHERE status = 'draft';
--> statement-breakpoint
CREATE TABLE creation_drafts (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 revision integer NOT NULL DEFAULT 1,
 status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','published','discarded')),
 payload jsonb NOT NULL,
 result jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX creation_drafts_owner_status_idx ON creation_drafts(owner_id,status);

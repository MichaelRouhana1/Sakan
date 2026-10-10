-- Additive foundation. Legacy columns and all listing references remain intact.
CREATE TYPE place_kind AS ENUM ('apartment','building');
CREATE TYPE unit_type AS ENUM ('whole_apartment','private_room','shared_bed');
CREATE TYPE bathroom_privacy AS ENUM ('private','shared');
CREATE TYPE unit_gender_rule AS ENUM ('any','female_only','male_only');

CREATE TABLE places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind place_kind NOT NULL DEFAULT 'apartment',
  city varchar(128),
  area varchar(128) NOT NULL,
  landmark varchar(256),
  address_line varchar(256),
  building_name varchar(128),
  primary_campus_id uuid REFERENCES universities(id) ON DELETE SET NULL,
  location geography(Point,4326),
  electricity electricity_status NOT NULL,
  electricity_cuts_start varchar(5),
  electricity_cuts_end varchar(5),
  electricity_hours_on integer,
  electricity_cut_windows jsonb NOT NULL DEFAULT '[]',
  water water_status NOT NULL,
  wifi_included boolean NOT NULL DEFAULT false,
  router_ups boolean NOT NULL DEFAULT false,
  elevator_24_7 boolean NOT NULL DEFAULT false,
  has_elevator boolean NOT NULL DEFAULT false,
  has_solar boolean NOT NULL DEFAULT false,
  generator_amperes integer,
  generator_included boolean NOT NULL DEFAULT false,
  concierge_included boolean NOT NULL DEFAULT false,
  cooking_gas_included boolean NOT NULL DEFAULT false,
  water_bill_included boolean NOT NULL DEFAULT false,
  building_fees_included boolean NOT NULL DEFAULT false,
  parking_included_in_rent boolean NOT NULL DEFAULT false,
  amenities jsonb NOT NULL DEFAULT '[]',
  smoking_policy smoking_policy NOT NULL DEFAULT 'no',
  pets_policy pets_policy NOT NULL DEFAULT 'no',
  guests_policy guests_policy NOT NULL DEFAULT 'restricted',
  quiet_hours boolean NOT NULL DEFAULT false,
  target_audience target_audience NOT NULL DEFAULT 'anyone',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT places_id_owner_uq UNIQUE(id, owner_id)
);
CREATE INDEX places_owner_idx ON places(owner_id);
CREATE INDEX places_location_gist ON places USING gist(location);
CREATE TABLE place_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  url varchar(2048) NOT NULL, caption varchar(48), sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX place_photos_place_order_idx ON place_photos(place_id, sort_order, id);
CREATE TABLE place_campus_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  campus_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  profile varchar(16) NOT NULL DEFAULT 'walking',
  place_lng double precision NOT NULL, place_lat double precision NOT NULL,
  campus_lng double precision NOT NULL, campus_lat double precision NOT NULL,
  distance_m integer NOT NULL, duration_s integer NOT NULL, coords jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT place_routes_nonnegative CHECK(distance_m >= 0 AND duration_s >= 0),
  CONSTRAINT place_campus_routes_place_campus_profile_uq UNIQUE(place_id, campus_id, profile)
);
ALTER TABLE listings
  ADD COLUMN place_id uuid,
  ADD COLUMN unit_type unit_type,
  ADD COLUMN bathroom_privacy bathroom_privacy,
  ADD COLUMN unit_amenities jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN place_overrides jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN amenity_overrides jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN beds_total integer,
  ADD COLUMN beds_available integer,
  ADD COLUMN inventory_needs_confirmation boolean NOT NULL DEFAULT false,
  ADD COLUMN gender_rule unit_gender_rule,
  ADD COLUMN inventory_version integer NOT NULL DEFAULT 0;
CREATE INDEX listings_place_idx ON listings(place_id);


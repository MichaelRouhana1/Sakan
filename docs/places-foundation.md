# Places and units — slice 1 foundation

Implemented and verified locally on 2026-10-10. Stop here for review before slice 2.
No changes were made to public listing/search DTOs, grouping, the matcher, maps,
wizard screens, draft formats, or the host/admin UI. The existing listing IDs
remain the keys for credits, promotions, saved listings, reports, events,
analytics, lifecycle jobs, and detail URLs.

## Migrations

- `0031_places_foundation.sql`: `places`, `place_photos`,
  `place_campus_routes`, enums and additive listing columns.
- `0032_places_backfill_resolver.sql`: one place per existing listing, route
  copies, required owner-matched place links, canonical unit types, bed metadata,
  compatibility triggers, and `listing_resolved`.
- `0033_place_route_bridge.sql`: temporary bidirectional cache mirrors for old
  readers and an application-code rollback.

New listing fields: `place_id`, `unit_type`, `bathroom_privacy`,
`unit_amenities`, `place_overrides`, `amenity_overrides`, `beds_total`,
`beds_available`, `inventory_needs_confirmation`, `gender_rule`,
`inventory_version`. Unit prices, deposits, photos, counters, dates, lifecycle
and availability fields retain their existing meaning. Security deposits remain
informational; no booking or renter/host payment flow was added.

Backfill maps studios and entire apartments to `whole_apartment`, private rooms
to `private_room`, and shared dorm beds to `shared_bed`. Every backfilled place
has kind `apartment`; city and bathroom privacy stay unknown instead of being
guessed. Existing gender restrictions remain present for every unit type.
All existing photos remain unit photos, with their IDs, order, captions and dates.
No legacy photos were guessed to be shared photos.

## Resolver and compatibility

`listing_resolved` exposes effective shared values alongside all listing fields.
The SQL `resolve_place_values` function is the single implementation used by the
view and the compatibility projections. Override key presence selects a unit
value: `false` is an override, explicit JSON `null` clears a nullable field,
and removing a key restores inheritance. Unsupported keys, wrong JSON types,
invalid enum values, and nulls for required fields are rejected.
`effective_sources` identifies place/unit sources, including individual amenities.
Amenity additions and explicit per-amenity false overrides are supported.

Current reads continue to use the existing columns. Old inserts silently create
a place; old flat utility/rule edits become explicit unit overrides so siblings
cannot change accidentally. Place edits project effective values back to the
legacy copies without changing unit dates or counters. Location and ownership
cannot be overridden. An old location edit on a shared place detaches only the
edited unit into a copied place; a future shared editor will use explicit place
edits. Public multi-unit write endpoints are not enabled in slice 1.

The four existing shared-bed listings have `beds_available = NULL` and
`inventory_needs_confirmation = true`. No vacancy was inferred. The new
inventory service must require confirmation before enabling those units'
inventory actions in slice 2.

## Commands and rollout

From the repository root:

```sh
npm run db:places:dry-run
```

This executes a PostgreSQL REPEATABLE READ, READ ONLY transaction. It performs no
DDL, temporary-table writes, repairs, seeding, or sequence calls. Blocking schema,
price, pin, bed-total, migration-checksum, resolver, and cache problems cause a
nonzero exit. Unknown bed vacancy is a reported warning at this foundation stage.

For an existing database through migration 0030, from `backend`:

```sh
npm run db:places:apply
```

The apply runner performs preflight, takes a migration lock, blocks listing
writes during the backfill, and applies only 0031–0033 in one transaction.
It fingerprints all 68 original listing columns and every table with a listing
foreign key before and after. Any difference rolls back the transaction.
Run in a maintenance window; reads remain available while writes wait.

Do not use `db:push` or regenerate from the old Drizzle snapshot for this rollout.
The local database has two unrecognized historical ledger entries, an older
`property_type` enum name, and nullable description/contact-name columns.
The preflight explicitly accepts these audited variants and the clean migration
history; it does not rewrite history or replay old migrations. New migration
files use LF line endings so their checksums survive Windows/Linux checkouts.

## Routes

The existing listing-based route endpoint and response shape are unchanged.
The repository resolves the listing to its place, then reads/writes one cache row
per place/campus/profile. Misses coalesce by place in the process and with a
transaction-scoped PostgreSQL advisory lock across processes. A waiter rechecks
the cache after taking the lock. Provider fallback is never persisted.

Place/campus pin changes invalidate both caches. Persisting a fetched route
checks its pins against the current place and campus. The old cache remains as
a transitional mirror until slice 5; copying cache rows never calls Mapbox.
The existing 5-meter cache validity tolerance, fallback shape and 30-second
in-process negative cache remain.

## Housing seed and dev reset

The old destructive listing runner and remote-image fixture file are removed.
`npm --prefix backend run db:seed:housing` runs the replacement.
The old `db:seed:listings` command is a safe alias to it.

Deletion is restricted to the 26 exact IDs in
`backend/src/db/seeds/legacy-housing-manifest.json`, with owner, title and creation
date fingerprints. A changed fingerprint or attached promotion history blocks
deletion. Sharing a demo owner/phone/title is never sufficient for deletion.
The seed does not delete upload directories or unrelated files.
New fixture IDs and photo IDs are deterministic and registered in a database
manifest; a collision with an unregistered row is rejected. Reruns insert only
missing fixture records and preserve existing dates, counters, edits and history.

The guard requires all of:
- Explicit `DEPLOYMENT_ENV=local` or `staging`; production is refused.
- A loopback host with database `skoun_dev`, or the exact
  `skoun_staging` database on `HOUSING_SEED_ALLOWED_HOST`.
- An independently provisioned database marker matching the environment and
  actual database name.
- `NODE_ENV` must not be `production` for the seed operation.

`postgres`, `template0`, `template1`, unmarked databases, arbitrary names,
and remote hosts presented as local are refused. The test suite has its own
strictly named disposable-database allowance.

For development, set `DEPLOYMENT_ENV=local` and `DEV_DATABASE_URL` in the
backend's local environment to a loopback PostgreSQL URL ending in
`/skoun_dev`. Then the one command from the repository root is:

```sh
npm run db:reset:dev
```

Reset uses only `DEV_DATABASE_URL`; it never derives a destructive target from
`DATABASE_URL`. It refuses any target except loopback `skoun_dev`. A database
created by this command receives its marker; a pre-existing unmarked database is
refused. Existing connections prevent the drop (there is no FORCE).
The command runs all migrations, then the existing campus, academic/tuition and
benefit seeders, then the new housing seed. It does not rewrite `.env` or switch
the application's connection. To inspect a configured target without writing:

```sh
npm --prefix backend run db:reset:dev -- --dry-run
```

For staging, a database administrator provisions this marker separately on the
verified nonproduction database; the housing seed never creates its own marker:

```sql
CREATE SCHEMA skoun_ops;
CREATE TABLE skoun_ops.environment_guard (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  environment text NOT NULL,
  database_name text NOT NULL
);
INSERT INTO skoun_ops.environment_guard(environment,database_name)
VALUES ('staging','skoun_staging');
```

The housing seed itself does not edit campus, tuition, academic or benefit data.
It requires the corresponding campuses already to exist.

Seed inventory: 10 places, 17 units, 51 unit photos, 20 shared photos, using five
bundled 16:10 PNG illustrations:
- Whole apartments near AUB in Hamra and LAU in Jbeil.
- One Achrafieh apartment with four rooms at $280/$320/$370/$440 and different sizes.
- An Achrafieh building with three apartments, including solar/Wi-Fi/fee overrides.
- Female-only shared room: 3 beds total, 1 available; mixed shared room: 4 total, 2 available.
- Hamra apartment with a whole-apartment offer and two room offers simultaneously available.
- Expired Kaslik, rented Saida, and under-offer Tripoli examples.
- One active Featured and one active Bump example on separate places.
  Each has an explicit demo grant/charge ledger and active service interval;
  no real host wallet, published price catalog, sales flag or placement flag changes.
  Auto-renew is off. Demo promotion prices are fixtures, not approved commercial pricing.

All units have firm integer USD rent and complete utility answers. Placeholder
captions identify the images as demo illustrations. No network image requests
occur during seeding.

## Verification results

The existing application connection was backfilled, without reseeding:
- 28 listings → 28 places; all original listing IDs and 68-column row fingerprints unchanged.
- All 10 tables referencing listings have identical before/after fingerprints.
- 90 unit photos retained; 0 shared photos inferred.
- Resolver comparison: 28 rows, 0 mismatches.
- Route comparison: 6 rows, 0 mismatches; all 6 copied IDs and timestamps identical.
- Four legacy shared-bed counts remain unconfirmed.
- No missing links, invalid prices, invalid bed totals, or invalid/missing active pins.
- Post-migration ledger: 18 entries, 16 recognized, 2 historical entries reported.
- Full apply evidence is saved locally in `backend/ops/places/local-apply.log`.

Post-backfill dry-run output, condensed:

```json
{
  "readOnly": true,
  "blockers": [],
  "counts": {
    "listings": 28,
    "linked_places": 28,
    "photos": 90,
    "legacy_routes": 6,
    "broken_links": 0,
    "unknown_bed_inventory": 4
  },
  "resolver": { "compared": 28, "mismatches": 0 },
  "routes": { "compared": 6, "mismatches": 0 },
  "warnings": [
    "Two historical migration ledger entries differ; no old migrations replayed.",
    "Four shared-bed listings require host vacancy confirmation before slice 2."
  ]
}
```

A new dedicated local `skoun_dev` database was created and the reset command
completed: 36 institutions, 101 campuses, 191 faculties, 642 programs with rates,
94 benefits, and the housing inventory above. Its dry run has no blockers or
warnings, all 34 migrations recognized, and resolver parity 17/17.
A housing seed rerun changed zero rows. The original application's `postgres`
target is explicitly refused by the seed guard, so its 26 legacy demos and two
non-demo listings remain. No connection configuration was changed.

Tests/builds:
- Foundation integration: 23 scenarios pass in a disposable database, including
  preservation, rollback/reapply, null/false inheritance, old writes, owner/bed
  constraints, shared cache/coalescing/invalidation, stale writes, fallback,
  production guards, seed idempotency and manifest-only deletion.
- Existing promotion integration: all 17 scenarios pass with the new migrations.
- Existing backend regression: 30 tests plus 7 lifecycle tests pass.
- Frontend matcher/photo/inquiry/lifecycle regression: all 32 tests pass.
- Backend TypeScript build passes.
- Frontend TypeScript: 125 errors before and after, with zero changed output lines.
- Expo SDK 57 web/static, Android and iOS export passes. The prior tslib
  `__extends` failure is fixed by selecting its self-contained ESM build for web/SSR.
- Price-guide fixture now includes availability; all 6 price-guide tests pass,
  including rented exclusion and pending eligibility.

## Two non-demo listings awaiting the owner's decision

Preserved, with their listing IDs and all existing data:
- `fe681bc2-5698-4e87-8036-3d58173577a8` — “1-bedroom apartment in Achrafieh · Campus: Tripoli Campus”,
  Achrafieh, $520/month, active.
- `b5756273-2e8f-4eb1-b0fb-bb068e4bd438` — “1-bedroom apartment in Hamra · Campus: Dekwaneh Campus”,
  Hamra, $650/month, active.

Their stored campus labels are reported verbatim. Neither is part of a deletion
manifest, regardless of whether the owner later chooses to keep them.

## Rollback and deferred work

An application-code rollback can retain the additive schema and legacy cache.
`backend/ops/places/rollback-foundation.sql` also reverses the untouched 1:1
foundation after restoring the old route code. It refuses shared places,
overrides, confirmed inventory, shared galleries or later migrations rather than
discarding those changes. Its rollback/reapply path is covered by integration tests.

Deferred exactly to the approved later slices: inventory/occupancy/hiding rules,
per-unit charges, place promotion limits and refunds, admin Listings connection;
SQL search grouping, server matcher, place map pins; multi-unit wizard/Add a unit,
shared editing UI, two galleries and draft migration; removal of legacy columns
and the old route cache. Browser/native interactive UI tests were not added or
run because this slice changes no screens. Live Mapbox was not called during
verification; provider behavior was tested with deterministic mocks.

No deployment, commit, or later slice was performed.


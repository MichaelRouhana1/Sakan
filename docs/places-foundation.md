# Places and units — foundation and implementation plan

Slice 1 implemented and verified locally on 2026-10-10. Slice 2 is authorized;
stop for review after inventory and money. The slice 1 evidence below is historical.

## Approved decisions and remaining slices (2026-10-10)

These decisions supersede the earlier grouping and promotion-limit proposals.

- Search always returns one card per unit and paginates units. No representative
  unit per place, `ROW_NUMBER`/`DISTINCT ON` place grouping, or “+N more units here”.
  Featured remains a separate labeled group above results; its units are excluded
  from the normal list. Search/matcher changes remain in slice 3.
- Promotions retain existing per-listing limits and the three-campaign Featured
  capacity per area/campus. There is no per-place Bump or Featured limit.
- A place has exactly one owner. Never merge places across owners or because pins
  match. Different landlords in one building have separate places.
- Every electricity field can differ by unit: status, generator/amperage, cut
  windows, solar and generator included. The resolver from slice 1 already supports
  these fields. Future host editing uses “Same as building” and “Different for this
  apartment”; never show “override” or “inherit” to hosts.
- Keep “Other units in this place” on detail, map pins by place, campus routes on
  places, the server matcher/scoring migration, and all slice 1 guarantees.
- The Achrafieh $520 and Hamra $650 rows listed below are owner-confirmed test data
  and belong in the fingerprinted deletion manifest. Adding them does not run a reset.

### Slice 2 — inventory and money (current implementation scope)

1. Introduce shared server inventory rules and transaction boundaries used by host,
   admin and lifecycle writes. Explicit unit/place hiding is separate from lifecycle
   status. Hiding never erases availability, dates, credits or bed counts.
2. An apartment may advertise a whole-apartment offer and rooms/beds together.
   Renting the whole apartment hides its room/bed offers; an occupied room or bed
   hides the whole-apartment offer. Conflicting occupancy is rejected. A building's
   separate apartments do not block one another. Archiving is not proof of vacancy.
3. Shared beds require explicit total/available confirmation, integer bounds and
   optimistic version checks. Zero available means rented; positive vacancy may be
   available or under offer. Reopening a unit never guesses vacancy.
4. Publish creation, photos, free-slot accounting and a per-unit charge ledger must
   commit or roll back together. Serialize concurrent purchases for the owner;
   renewals are atomic and retry-safe for each listing/expiry cycle.
5. Stop affected promotions and refund unused service in the same transaction when
   units become hidden, occupied or otherwise ineligible, including affected siblings.
   Keep cumulative refund protection, per-listing limits and market capacity.
6. Connect admin Listings pagination, counts, details, edits, moderation, reports,
   photo flags and inventory controls to authenticated server operations. Persist
   staff notes/audit history and surface failed actions instead of mock successes.
7. Verify concurrency, occupancy, unknown/zero beds, transaction rollback, refunds,
   owner isolation and admin integration in a disposable database; stop for review.

### Later slices (not authorized for implementation in this change)

- Slice 3: per-unit search/pagination with a separate deduplicated Featured group,
  server matcher/scoring, place map pins and place-based detail siblings.
- Slice 4: multi-unit wizard/Add a unit, shared editing, electricity wording above,
  two galleries and draft migration.
- Slice 5: removal of transitional legacy columns and old route cache.

## Slice 2 implementation and review handoff

Implemented locally; stop here for review. Migration `0034_unit_inventory_money.sql`
adds explicit unit/place hiding, photo review flags, a per-listing post-credit
ledger, the shared SQL visibility/occupancy predicates, and inventory versioning.
The application inventory service owns validation, locking, sibling checks and
promotion settlement. There are no place-level promotion limits.

- Availability is not reset by archive, restore, hiding or renewal. Unknown beds
  block inventory actions until confirmed; confirmed zero vacancy is rented.
  Unknown bed inventory also blocks renting an alternative whole-apartment offer.
- Host inventory writes use `PATCH /api/listings/:id/inventory` with
  `expectedVersion`. Place hiding uses `PATCH /api/listings/places/:placeId/visibility`.
  Both are owner-authorized. Existing availability and lifecycle writes use the
  same inventory rules. Occupied/unconfirmed units must be archived or confirmed
  vacant before physical deletion, so deletion cannot silently free an apartment.
- Public browse, search, nearby, saved-list reads, price guides, activity and paid
  placement honor inventory hiding. Existing per-unit result shapes are preserved;
  search regrouping/pagination work has not been implemented in this slice.
- Publishing creates the unit, photos, free-slot accounting and charge ledger in
  one transaction. Hidden active units still count toward the host's live slots.
  Renewal charges are unique per unit/expiry cycle, including concurrent retries.
  No security-deposit collection or booking payments were introduced.
- Inventory changes stop ineligible sibling promotions and return unused service
  atomically. Restoration never automatically restarts a stopped paid campaign.
  Late changes to expired listings refund from the actual expiry cutoff.
- Admin Listings uses `/api/admin/inventory/listings` behind the existing
  `requireAdmin` middleware. Pagination, queue counts, details, edits, reports,
  review flags, staff notes and bulk actions are persisted. Bulk writes are atomic.
  Its detail drawer includes unit hiding, availability and bed confirmation.
  Inventory conflicts return 409 and require a refresh. Type conversion remains
  disabled in the narrow admin editor; the later unit editor owns that workflow.

Rollout after review, from `backend` (foundation must already be installed):

```sh
npm run db:inventory:apply
```

This targeted runner checks preflight and foundation checksums, takes the existing
migration lock, applies only 0034 transactionally and records its checksum. A retry
does not replay it. Use the existing promotions worker during rollout to reconcile
pre-existing campaigns against the new visibility rules. Do not use `db:push` or
replay historical migrations. Apply the schema before starting this application
version. Only disposable test databases were migrated during this implementation;
the application database was not migrated, reset or seeded.

Verification is recorded at the end of this document. The existing auth/profile
workspace edits are outside this slice and were left intact.

## Slice 1 implementation record (historical)

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

Deletion is restricted to the 28 exact IDs in
`backend/src/db/seeds/legacy-housing-manifest.json`, with owner, title and creation
date fingerprints for the 26 demos. The two owner-confirmed test rows use their
exact ID, title, area and rent from the approval; their original rows are absent
from the current local database, so no owner/date fingerprint was invented. A changed fingerprint or attached promotion history blocks
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

## Two owner-confirmed test listings approved for the deletion manifest

Approved on 2026-10-10 for the guarded housing reset, with exact fingerprints:
- `fe681bc2-5698-4e87-8036-3d58173577a8` — “1-bedroom apartment in Achrafieh · Campus: Tripoli Campus”,
  Achrafieh, $520/month, active.
- `b5756273-2e8f-4eb1-b0fb-bb068e4bd438` — “1-bedroom apartment in Hamra · Campus: Dekwaneh Campus”,
  Hamra, $650/month, active.

Their stored campus labels are reported verbatim. Both are test data and are now
included in the deletion manifest; all existing environment and fingerprint guards
continue to apply. No deletion is implied outside the guarded seed operation.

## Rollback and deferred work

An application-code rollback can retain the additive schema and legacy cache.
`backend/ops/places/rollback-foundation.sql` also reverses the untouched 1:1
foundation after restoring the old route code. It refuses shared places,
overrides, confirmed inventory, shared galleries or later migrations rather than
discarding those changes. Its rollback/reapply path is covered by integration tests.

The approved slice plan above replaces the original deferred-work list. Per-place
promotion limits and SQL place grouping have been dropped. Browser/native interactive UI tests were not added or
run because this slice changes no screens. Live Mapbox was not called during
verification; provider behavior was tested with deterministic mocks.

No deployment, commit, or later slice was performed.

## Slice 2 verification — 2026-10-10

- Backend TypeScript build passes.
- Inventory/money integration: 17 scenarios pass in a disposable database. Covers
  targeted migration/retry, available alternatives, concurrent charges/renewals,
  rollback, owner isolation, partial/unknown/zero beds, stale versions, visibility,
  sibling promotion refunds, market capacity without place limits, retained
  occupancy, rent-only edits preserving place membership, admin pagination/actions,
  atomic bulk failure, exact test-data manifest entries and HTTP auth/validation.
- Foundation regression: 24 scenarios pass, including both approved test rows'
  fingerprint rejection/deletion and the existing preservation/seed guards.
- Promotion integration: 17 scenarios pass, including capacity, wallet concurrency,
  refund deduplication and expiry cutoff behavior.
- Backend regression: 37 tests pass. Price-guide temporary fixtures now include
  hidden inventory exclusion; actual occupancy predicates are tested above.
- Frontend matcher/photo/inquiry/lifecycle regression: 32 tests pass.
- Admin inventory browser: three flows pass against a local test API using the
  actual form and adapter: hide unconfirmed beds without guessing counts, confirm
  vacancy, and show a 409 conflict without reporting success. Styled preview was
  inspected with no horizontal overflow. This is a focused form test, not an
  end-to-end test of Clerk or the full Expo application.
- Frontend TypeScript baseline comparison: 209 diagnostics before and after the
  admin changes, zero added diagnostics and none in the changed admin files.
- Full Expo web export was attempted twice, but Metro stalled before compilation;
  both attempts were stopped. No successful full-app web/native export is claimed
  for this slice.
- `git diff --check` passes. Existing unrelated auth/profile edits remain intact.

Reproduce from `backend`: `npm run test:inventory`, `npm run test:places`,
`npm run test:promotions`. The focused browser check runs from `frontend` with
`node tests/inventory-ui.mjs` after the root's locked Playwright dependency is
installed (`npm ci` at the root); it uses local Microsoft Edge. Local ignored
evidence is in `frontend/.expo/inventory-ui/` and
`frontend/.expo/inventory-typecheck.json`.

Slice 2 is ready for review. No application database migration/reset, deployment,
commit, or implementation of slices 3–5 was performed.


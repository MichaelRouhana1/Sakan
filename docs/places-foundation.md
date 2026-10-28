# Places and units — foundation and implementation plan

Slices 1–3 are implemented and committed. Slices 2 and 3 are approved; slice 3
is on `main` at `6fdd3f7`. Slice 4 (wizard and dashboard) was implemented on
2026-10-12. Slice 5 cleanup was applied to the guarded local `studently_dev`
database on 2026-10-28. Earlier verification records below are historical.

## Slice 5 — cleanup completed (2026-10-28)

The verified custom-format backup is
`backups/studently_dev-20261028-1615.dump` (303,263 bytes). The cleanup runner
refuses any database except loopback `studently_dev`, requires the matching
`studently_ops.environment_guard`, checks that backup, takes a transaction lock,
and applies `0038_places_cleanup.sql` in one transaction.

Deletion came only from IDs already stored in
`studently_ops.housing_seed_manifest`; no title, owner, prefix, or name matching
was used. The transaction deleted 17 listings, 51 listing photos, 10 places,
20 place photos, two promotion campaigns, two service intervals, four promotion
ledger rows, and the manifest-backed demo owner. Related activity, allocation,
bump-execution, and notification rows were removed by their exact doomed listing
or campaign IDs; foreign-key cascades handled the remaining listing dependents.
The housing manifest now contains only the retained Studently Admin user row.
No housing reseed is part of slice 5, and the frozen `skoun-housing-v1:` fixture
namespace remains unchanged.

The five requested Slice4 Bliss units remain, across `Slice4 Bliss House` and
`Slice4 Bliss Rooms`. The final database has seven listings and four places.
Campus/academic/tuition/benefit catalogs remain at 36 institutions, 101 campuses,
191 faculties, 642 programs, 642 tuition rates, 34 fee items, and 94 benefits.

Migration 0038 removes the transitional listing write bridges, duplicated
`listing_campus_routes` cache, legacy listing enums, and the duplicated place,
utility, rule, and audience columns from `listings`. Runtime repositories now read
the canonical place/unit model and `place_campus_routes`. `listing_resolved`
remains a read-only compatibility projection; it no longer writes or stores legacy
values. `listings.beds` remains deliberately because it is the physical bed count
for current non-shared units, not a duplicated place field. The old destructive
housing manifest path was removed from the canonical seed.

Verification after apply:

- Backend build, 30 unit/API tests, seven lifecycle tests, ten audit tests,
  17 promotion scenarios, ten search scenarios, 19 inventory scenarios,
  12 wizard scenarios, 22 foundation scenarios, and six price-guide tests pass.
- Frontend focused tests pass except the three already-known matcher UI failures:
  short-viewport composer visibility, location-search focus, and the storage-error
  heading. The runner also reports its parent group as failed because those three
  children fail.
- Frontend TypeScript is unchanged at the 122-diagnostic baseline, with no added or
  removed diagnostics. Production Expo export passes for web, iOS, and Android,
  including 84 static web routes and both native Hermes bundles.
- Browser smoke checks show five `Slice4 Bliss` search results and load the host
  dashboard. The real create flow reaches the photo step and retains three selected
  photos, but the unauthenticated browser correctly returns “Sign in again” for
  each upload, so no listing was published and no smoke-test data was left behind.
- Final database checks confirm all five Slice4 listing IDs, zero sampled legacy
  columns, no `listing_campus_routes` table, and migration 0038 at the ledger head.

Restore the pre-cleanup backup from the repository root with:

```sh
pg_restore --clean --if-exists --no-owner --dbname=studently_dev backups/studently_dev-20261028-1615.dump
```

## Slice 4 follow-ups (2026-10-24)

- Sign-in stays in the same modal when Clerk returns `needs_client_trust`,
  `needs_second_factor`, or an email-code first factor. The host gets a code
  field, resend, and the Clerk error. A correct password no longer ends on
  “Sign-in could not be completed.” The modal is the shared web and native screen.
- A unit utility field is inherited unless that field’s value differs from the
  place. Changing electricity stores an electricity override only. Water, Wi-Fi,
  elevator, and fees keep following later place edits. Each overridden field has
  “Reset to building”. `0037_per_field_utility_overrides.sql` drops stored
  overrides that already equal the place, including a copied amenity list, and
  `listing_resolved` reports those fields as the place source.
- Listing search treats a multi-word query as AND across tokens, in any order.
  Each token may match the title, place name, or area (description, landmark,
  and address still count). `Slice4 Bliss` matches “Slice4 whole apt on Bliss”.

Apply `0037` only to the local dev database (`studently_dev`), from `backend`:

```sh
node ops/places/apply-field-overrides.mjs
```

The runner refuses any other database name. It does not reset or seed.

## Approved decisions and remaining slices (2026-10-10)

These decisions supersede the earlier grouping and promotion-limit proposals.

- Search always returns one card per unit and paginates units. No representative
  unit per place, `ROW_NUMBER`/`DISTINCT ON` place grouping, or “+N more units here”.
  Featured remains a separate labeled group above results; its units are excluded
  from the normal list. These search/matcher changes are implemented in slice 3.
- Promotions retain existing per-listing limits and the three-campaign Featured
  capacity per area/campus. There is no per-place Bump or Featured limit.
- A place has exactly one owner. Never merge places across owners or because pins
  match. Different landlords in one building have separate places.
- Every electricity field can differ by unit: status, generator/amperage, cut
  windows, solar and generator included. The resolver from slice 1 already supports
  these fields. Slice 4 host editing uses “Same as building” and “Different for this
  apartment”; never show “override” or “inherit” to hosts.
- Keep “Other units in this place” on detail, map pins by place, campus routes on
  places, the server matcher/scoring migration, and all slice 1 guarantees.
- The Achrafieh $520 and Hamra $650 rows listed below are owner-confirmed test data
  and belong in the fingerprinted deletion manifest. Adding them does not run a reset.

### Slice 2 — inventory and money (completed and approved)

1. Introduce shared server inventory rules and transaction boundaries used by host,
   admin and lifecycle writes. Explicit unit/place hiding is separate from lifecycle
   status. Hiding never erases availability, dates, credits or bed counts.
2. An apartment may advertise a whole-apartment offer and rooms/beds together.
   Renting the whole apartment hides its room/bed offers; an occupied room or bed
   hides the whole-apartment offer. Conflicting occupancy is rejected. A building's
   separate apartments do not block one another. Archiving is not proof of vacancy.
3. Shared beds require explicit total/available confirmation, integer bounds and
   optimistic version checks. Zero available means rented; positive vacancy may be
   available or under offer. Reopening a unit never guesses vacancy. The host
   dashboard must offer “Mark 1 bed rented”, “Free a bed”, and a vacancy confirmation
   flow for `inventory_needs_confirmation` units, on web and native.
   After marking a shared bed rented, ask “Who moved in? Female / Male / Skip”.
   When beds remain, suggest a gender preference but save it only after explicit
   confirmation. Skip leaves it unchanged; hosts can undo or change the preference.
   Show plain hidden reasons naming the blocking unit and a way to manage/free it,
   including when the occupied unit is archived. Support explicit unit/place hiding.
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
   owner isolation and admin integration in a disposable database. Verify host flows
   in the browser and production Expo exports for web, iOS and Android. Add no
   frontend TypeScript errors relative to the committed baseline; commit and stop.

### Slice 4 — wizard and dashboard (implemented)

The host chooses whole apartment, private room or bed in a shared room, then the
number of units. Single-unit creation keeps the existing flow and silently creates
its place. Multiple units collect shared apartment/building details once, followed
by individual unit cards. The dashboard groups actual place membership, provides
Add a unit and shared editing, and retains each unit's own statistics and controls.
The implementation and rollout notes follow below.

### Slice 5 — cleanup (completed 2026-10-28)

Transitional legacy columns and the duplicated route cache are removed. See the
completion and verification record above.

## Slice 4 — wizard and dashboard handoff (2026-10-12)

- The first choice is Whole apartment / Private room / Bed in a shared room,
  followed by “How many are you listing?” (1–20 per publish). One unit retains the
  existing step order. Several whole apartments use Building details; several
  rooms/beds use Apartment details. Location, utilities, shared rules and shared
  photos are entered once. Repeating cards hold each unit's photos, size, rent,
  bathroom privacy, description and furnishing. Shared rooms additionally require
  explicit positive available/total beds and a gender rule.
- Dashboard grid and list group by `placeId`, never coordinates or building name.
  Each unit retains its views/contact taps, edit, promotion and inventory controls.
  Add a unit loads an owned apartment/building, reuses its shared values and skips
  shared questions. The server checks ownership, enforces the stored place kind,
  and uses canonical shared values even if a client submits different ones.
- Shared editing is available from the dashboard. Unit utilities and rules use
  “Same as building” / “Different for this apartment”; all electricity fields can
  differ, including generator, amperage, solar and cut windows. Returning to the
  shared choice restores the actual place source. Shared changes preserve custom
  unit choices. Location belongs to the shared editor; the existing structural
  edit window still applies. Owner-only editing can load hidden units.
- Shared saves and unit source changes check the place version. Conflicts remain
  visible; Reload saved shared details replaces both form values and the version
  together. Background refetches cannot silently advance an unsaved form's version.
  Bathroom privacy changes are included in the existing unit-edit audit.
- Shared photos allow 0–15; each unit requires 3–15 completed uploads. Both use the
  existing crop queue, captions, ordering and upload controls. Unit photos supply
  the card cover. Detail screens show shared photos separately on web and native.
  Closing another unit card leaves pending uploads mounted, and gallery callbacks
  update only their own unit/shared gallery.
- Review shows every unit's post-credit cost and the server total, including the
  existing free-slot allowance. One authenticated publish request creates/reuses
  the place, creates every selected unit and its photos, records each unit's
  charge and settles inventory in a single transaction. Any failure rolls back
  the whole batch, wallet and free-slot usage. A changed quote requires renewed
  review. Durable owner/request receipts make concurrent retries create and charge
  only once; reusing a completed request for different content is rejected.
  Reopening a saved draft looks up its owner-only receipt and recovers a completed
  publish even if its charges emptied the wallet and the original response was lost.
- Draft schema version 2 is additive. Existing saved steps and committed progress,
  photo IDs/URLs/order/captions and both draft slots survive migration. Ready
  uploads resume from durable URLs. Shrinking a batch keeps inactive cards so
  increasing it again restores their uploads. Autosave persists all galleries and
  the publish retry ID; publishing persists the draft before sending. Add a unit
  parks existing work and reports full slots instead of overwriting another place's
  draft. Account switches clear an empty account while retaining the original
  owner's draft. Interrupted uploads still use the existing retry behavior.

Rollout, after slice-2 migrations through 0035 are installed, from `backend`:

```sh
npm run db:wizard:apply
```

This targeted runner checks foundation/0034/0035 checksums and applies only
`0036_unit_publish_batches.sql`, transactionally and safely on retry. Deploy the
API before the new clients; batch publishing requires the receipt table. The
additive migration retains legacy listing fields and the old route cache. An
application rollback can leave the receipt table in place. No application database
migration, reset, seed or deployment was performed during this slice.

Verification:
- Backend build passes. Eleven disposable-database wizard scenarios cover targeted
  migration/retry, atomic multi-unit free/paid charges, last-unit rollback,
  concurrent publish replay, changed quotes, owner isolation, canonical Add a unit,
  all electricity sources and resets, bathroom audits, shared galleries/stale
  saves, positive shared-bed counts, independent building occupancy and structural
  location restrictions. The test database is removed afterward.
- Foundation 24, inventory 20, search 9 and promotions 17 regression scenarios pass;
  together with the wizard this is 81 integration scenarios. Ten edit-audit tests
  pass. Search remains per unit and promotion limits are unchanged.
- Six new draft/navigation/gallery tests and 25 existing photo/crop/matcher tests
  pass. The focused browser harness passes six checks for real place grouping,
  per-unit statistics, Add a unit targeting, shared conflict/reload, electricity
  choices, phone-width layout and switching accounts without copying drafts.
- The actual exported web wizard passes six flows: initial choice/count and
  building branch; repeated cards plus shared cropping/upload and save/reopen;
  per-unit credit review with failed-publish retry using the same ID; legacy draft
  progress and phone layout; Add a unit using stored shared details; and recovery
  of a completed publish from a reopened draft with zero credits. APIs are
  controlled fixtures; transactional persistence is verified separately above.
  Existing app-shell hydration warnings are recorded separately. This is not a
  full Clerk-authenticated or physical-device end-to-end test.
- Frontend TypeScript compared with approved `6fdd3f7` using identical dependencies:
  124 baseline diagnostics, 123 current, zero added. Removing the unused former
  flat-list adapter also removed its existing type error.
- Final production exports pass for web, iOS and Android, with 84 static HTML
  routes and both native Hermes bundles. No signed IPA/APK packaging or physical
  device runtime test is claimed. `git diff --check` passes.

Reproduce from `backend`: `npm run test:wizard`, `npm run test:places`,
`npm run test:inventory`, `npm run test:search`, `npm run test:promotions`,
`npm run test:listing-audit`. From `frontend`: `node --test
 tests/unit-wizard.test.mjs tests/photo-persistence.test.mjs
 tests/photo-crop-queue.test.mjs tests/matcher.test.mjs`,
`node tests/host-places-ui.mjs`, `node tests/auth-signin-code-ui.mjs` (mocked
Clerk `needs_client_trust` / second-factor / first-factor email-code step: send,
resend, wrong code, success), `node tests/typecheck-baseline.mjs 6fdd3f7`,
`npm run build -- --output-dir .expo/slice4-export`, then
`node tests/unit-wizard-ui.mjs`. Browser checks use local Microsoft Edge.
Local ignored evidence: `frontend/.expo/host-places-ui/`, `slice4-ui/`,
`slice4-typecheck.json`, `slice4-build.log`, `slice4-export-result.json`.

Slice 4 stops after its commit and push. Slice 5 has not started.

### Slice 4 draft and upload recovery follow-up (2026-10-12)

- Draft hydration waits for account loading and does not restart the same loaded
  draft after a transient account refresh. The fresh-start URL is consumed after
  saving a local working checkpoint, so reloading resumes that draft. Corrected
  an out-of-scope variable introduced while developing this fix that temporarily
  prevented saved drafts from opening.
- Requests use the current Clerk session and retry a 401 once with an uncached
  token. A retry retains the upload body and refuses to replay a previous account's
  request under another account. Persistent authentication failures show a sign-in
  message beside Retry. Failed local photo selections are retained in the open
  page; browser reload cannot recover an upload that never acquired a durable URL.
- 25 focused auth, wizard, photo persistence and crop queue tests pass. The real
  draft provider in the browser harness preserves step 3/details through account
  loading and reopens saved details after reload. TypeScript comparison against
  `bd45157`: 123 baseline and current diagnostics, zero added. These checks do not
  verify uploads against the user's live Clerk session or establish why it ended.
- Reproduce focused tests from `frontend` with `node --test
  tests/auth-request-recovery.test.mjs tests/unit-wizard.test.mjs
  tests/photo-persistence.test.mjs tests/photo-crop-queue.test.mjs`.
  No slice 5 work, database change or deployment is included.

## Slice 3 — search implementation and review handoff (2026-10-11)

Scope is search only. There is no result grouping and no per-place promotion
limit. Every rentable unit keeps its own card, listing ID and detail URL.
The multi-unit wizard, shared editing, galleries, draft migration, removal of
legacy fields and removal of the old route cache remain in slices 4 and 5.

- `GET /api/listings` now returns `data` (one normal unit page), `featured`
  (a separate labeled group), `campuses`, `matches`, `widening` and `pagination`.
  `page` starts at 1; `pageSize` defaults to 24 and is capped at 100. Pagination
  counts normal units after Featured exclusion; `totalMatching` includes both
  groups. Out-of-range pages clamp to the last page. Filters/sorts reset the
  client's page. Tie-breaks use publication/creation time, then listing ID.
- Sorts are `newest` (default), `price_asc`, `price_desc`, `distance`, and `match`.
  Every sort applies to the complete eligible population before pagination,
  including campus and point searches. Bump changes newest only, including the
  transitional legacy boost fallback while promotion placement is disabled.
  Campus/pin distance comes from PostGIS; a selected area center or preferred
  matcher location can supply distance without imposing a radius requirement.
  With no distance reference, distance order falls back to recency/ID.
- The six-dimension matcher, weights, hard requirements, best-match ties and
  widening explanations execute on the server. `matcher` is validated JSON
  containing version-1 preferences. Campus identity is resolved on the server;
  client-supplied campus coordinates cannot change eligibility. Area centers
  come from the server's known areas. A required unknown fact still excludes a
  unit; soft preferences do not silently narrow manual filters. Match explanations
  and counts reflect all eligible units, not just the loaded page.
- Featured selection/rotation uses the existing selected area/campus market and
  promotion session after renter eligibility. Featured IDs are removed from all
  normal pages. Its section stays above results in every sort. Per-listing limits
  and the cap of three Featured campaigns per area/campus are unchanged; multiple
  units from one place remain independently promotable.
- Web and Expo render the API's order and match metadata directly. The old client
  scorer and promotion reordering helper are removed. Both current search screens
  have pagination; the still-exposed older browse screen also consumes the new
  paginated contract. No route was removed.
- Maps request `view=map` using the same filters and matcher requirements. This
  returns the complete matching population separately from the normal page, so
  pins include matching units on other pages and Featured units exactly once.
  Pins use `placeId`, show the matching unit count and minimum rent, and preserve
  separate places/owners at coincident coordinates. Supercluster remains in use.
  The web sidebar preview uses the same place membership and full-set counts;
  empty results no longer show sample housing pins. Map interactions strip paid
  placement attribution, retaining the existing analytics behavior.
- The existing `/:id/nearby` compatibility URL now returns public siblings with
  the same `place_id`, never a distance-based approximation. Web and Expo label it
  “Other units in this place”; fetching does not depend on the origin's coordinates.
- Search, matcher, maps, Featured, detail siblings and suggestions retain the
  slice-2 visibility predicate: hidden units/places, rented units, unconfirmed
  inventory, zero available beds, expired and non-active units are excluded.
  Owner identity and money/inventory writes are unchanged.

Rollout: deploy the API and clients together because Featured and pagination
are now explicit envelope fields. This slice requires the installed slice-2
schema (through 0035) and adds no migration. No application database migration,
reset, seed, deployment or change to promotion pricing was performed.

Implementation boundary: eligibility is selected by the existing SQL inventory
queries, then the complete candidate population is scored/ordered in server
memory before taking the page. The map response intentionally includes every
matching unit. This is not database-level seek pagination or a load-tested search
index; there is no `DISTINCT ON`/representative-unit grouping.

Verification:
- Backend TypeScript build and nine disposable-database search scenarios pass:
  unit pagination, all global sorts in area/campus/point modes, global matcher
  scores/requirements, canonical campus coordinates, membership, full map sets,
  Featured deduplication/rotation, sibling campaigns, Bump/legacy behavior,
  hidden inventory and HTTP validation/envelopes.
- Foundation regression: all 24 scenarios pass, including resolver and route-cache
  preservation. Inventory: all 20 scenarios pass. Promotions: all 17 scenarios pass,
  including market capacity, per-listing limits, refunds and concurrency.
- Matcher/facts/preferences regression: 11 tests pass against the moved server
  scorer. Four place-pin tests pass, covering counts beyond one page, coincident
  owners, stable identities, duplicate inputs and cluster expansion.
- The actual exported web search passes five-sort API-order preservation,
  separate Featured rendering, next/previous unit pages, page reset after sort
  changes, phone-width layout and API-error retry. Responses deliberately use an
  order that an old client sorter would change. This is a real-screen test against
  controlled API responses; the database contract is tested separately above.
  The exported matcher guide/handoff, URL reload and normal-filter test also
  passes; its stale reopened-guide assertion now expects the existing summary
  action instead of a new-question Continue button.
- The broader existing matcher browser suite passes eight flows and fails three
  pre-existing checks: short-screen answer-tray visibility, mobile campus-input
  focus, and a stale expected heading after storage failure. All three reproduce
  using the committed 0ce23cb harness/scorer with the unchanged matcher UI.
  Those unrelated matcher UI issues were not expanded into this search slice.
  Existing app-shell hydration warnings also remain; the dedicated search test
  reports them separately from unexpected runtime errors.
- Frontend TypeScript compared with 0ce23cb using the same dependencies: 124
  baseline diagnostics, 124 current, zero added. The comparison now also handles
  moved/deleted modules correctly, without counting missing baseline files as
  regressions or improvements.
- Final production export passes for web, iOS and Android: 84 static HTML routes
  including search, plus both Hermes `.hbc` bundles verified on disk. No
  physical-device runtime testing or signed IPA/APK packaging is claimed.
- `git diff --check` passes. Slice 3 stops at this commit for review.

Reproduce: `npm run test:search`, `npm run test:inventory`, and
`npm run test:promotions` from `backend`; `node --test tests/matcher.test.mjs
tests/place-pins.test.mjs`, `node tests/typecheck-baseline.mjs 0ce23cb`,
`npm run build -- --output-dir .expo/slice3-export`, and
`node tests/unit-search-ui.mjs` from `frontend`.
Evidence: `frontend/.expo/slice3-typecheck.json`, `slice3-build.log`,
`slice3-ui/`, `slice3-export-result.json`, and `slice3-matcher-baseline.log` (local ignored artifacts).

## Slice 2 implementation and review handoff

Current local implementation: migration `0034_unit_inventory_money.sql`
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
- Host dashboard grid/list, detail and analytics controls now use the same
  owner-only inventory service. One-bed actions are atomic and version checked.
  Unknown vacancy opens an explicit count form with no guessed available count.
  Renting the last bed hides it; freeing a bed restores vacancy without publishing
  an archived listing or renewing its dates. Unit/place hiding keeps occupancy.
- The post-rental gender prompt saves nothing on Female/Male selection or Skip.
  If beds remain, a separate confirmation saves the selected preference. Undo and
  Change gender preference are available. Gender and bed edits share a version
  token, so a stale suggestion cannot overwrite a newer host or staff edit.
  `0035_inventory_gender_version.sql` adds this protection to legacy gender edits
  too, without modifying the already-recorded 0034 migration.
- Owner inventory reads return the names/IDs of blocking units from the same owned
  place. “Hidden because Room A is rented” leads to Room A's controls. Multiple
  blockers and unknown shared-bed counts are shown; clearing one does not conceal
  the others. Existing per-listing and market promotion limits are unchanged.

Rollout after review, from `backend` (foundation must already be installed):

```sh
npm run db:inventory:apply
```

This targeted runner checks preflight and foundation checksums, takes the existing
migration lock, applies only missing 0034/0035 migrations transactionally and records
their checksums. A retry does not replay them; an existing 0034 install gets only
0035. Use the existing promotions worker during rollout to reconcile
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
- A loopback host with database `studently_dev`, or the exact
  `studently_staging` database on `HOUSING_SEED_ALLOWED_HOST`.
- An independently provisioned database marker matching the environment and
  actual database name.
- `NODE_ENV` must not be `production` for the seed operation.

`postgres`, `template0`, `template1`, unmarked databases, arbitrary names,
and remote hosts presented as local are refused. The test suite has its own
strictly named disposable-database allowance.

For development, set `DEPLOYMENT_ENV=local` and `DEV_DATABASE_URL` in the
backend's local environment to a loopback PostgreSQL URL ending in
`/studently_dev`. Then the one command from the repository root is:

```sh
npm run db:reset:dev
```

Reset uses only `DEV_DATABASE_URL`; it never derives a destructive target from
`DATABASE_URL`. It refuses any target except loopback `studently_dev`. A database
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
CREATE SCHEMA studently_ops;
CREATE TABLE studently_ops.environment_guard (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  environment text NOT NULL,
  database_name text NOT NULL
);
INSERT INTO studently_ops.environment_guard(environment,database_name)
VALUES ('staging','studently_staging');
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

A new dedicated local `studently_dev` database was created and the reset command
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

## Initial slice 2 server/admin verification — 2026-10-10 (historical)

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

That initial pass did not finish slice 2: host bed controls, the gender prompt and
host occupancy/hiding controls were missing, and exports were unverified. Its
earlier “ready for review” wording overstated completion. No application database
migration/reset or deployment was performed by that pass.

## Slice 2 host follow-up — 2026-10-11

- Host bed/vacancy, gender confirmation/undo/change, named blockers, archived-unit
  vacancy and unit/place hiding flows are implemented. Admin Listings remains
  connected, and the shared money/refund rules are retained.
- Backend TypeScript and 20 inventory integration scenarios pass, including fresh
  and existing-0034 upgrades, concurrent one-bed actions, stale gender changes,
  owner isolation, named blockers and freeing archived occupants without publishing.
- Foundation: 24 scenarios pass. Promotions: 17 scenarios pass, retaining per-listing
  limits and three Featured campaigns per market with no per-place limits.
- Host browser: ten flows pass using the real React Native Web component and API
  adapter against a local test API. Covers counts, gender confirmation/undo/Skip,
  last-bed rental/freeing, later gender changes, 409 feedback, unit/place hiding and
  freeing a named archived blocker. The real compact host list fits a phone-width
  viewport. Inventory clicks do not open the parent listing.
  The existing admin browser check also passes. These are focused component checks,
  not full authenticated Clerk/device end-to-end tests.
- TypeScript comparison with the committed source using identical installed
  dependencies and generated Expo declarations: 125 baseline diagnostics, 124 now,
  zero added. The previous 209 count belongs to the earlier workspace/dependencies.
- Windows production export now uses in-process Metro transforms (`maxWorkers: 0`)
  to avoid worker startup stalls. Development keeps its existing worker count.
  The missing, already-locked Motion dependencies were restored without changing
  the lockfile. `npm run build` in `frontend` exports all three platforms.
- Final production export passes for web, iOS and Android from the finished source.
  Web includes 84 statically rendered routes; both native outputs are Hermes `.hbc`
  bundles. Output metadata/files were checked, including the host inventory code
  in the web bundle. This verifies Expo exports, not signed IPA/APK packaging or
  runtime testing on physical devices.
- `git diff --check` passes. Slice 2 is complete locally and stops for review.
  No application database migration/reset, deployment or slice 3–5 work was run.

Reproduce host checks with `node tests/host-inventory-ui.mjs` and the type baseline
with `node tests/typecheck-baseline.mjs 58a4cdf` from `frontend`.
Local evidence is under `frontend/.expo/host-inventory-ui/`,
`frontend/.expo/slice2-typecheck.json`, `frontend/.expo/slice2-final-build.log`
and `frontend/.expo/slice2-export-result.json`. Final exported files are in
`frontend/.expo/slice2-final/`.


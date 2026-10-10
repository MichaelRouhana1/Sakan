# Promotions: Phase 0 and Phase 1

Implemented in the existing Express/Drizzle API and shared Expo/web host screens. Sales are **off by default**, and all promotion prices are marked **TBD**. Nothing has been deployed or charged by this implementation.

## What was reused

- The existing post/boost wallet and Whish checkout, confirmation, transaction locks and audit records. Client-supplied amounts are no longer accepted.
- The existing 30-day listing cycle, final-five-day nudge, manual renewal, availability controls, photo/utility fields, host analytics and silence diagnosis.
- Existing lifetime view and WhatsApp-tap counters. Dated events supplement those counters; they do not reset them or invent historical events.
- Existing renter search and matcher requirements, existing cards, and the WhatsApp handoff. No renter-to-host payments were added.

The old `boostedUntil` timestamp had no campaign ledger and could influence sorting after expiry. Phase 0 limits that ordering to an unexpired boost on an available listing. Phase 1 uses explicit campaigns instead.

## Release Phase 0 first

1. Back up the database and apply migrations through `0030_promotions` with the existing migration process. The application references both new schemas even when sales are disabled. `0029` adds dated activity; `0030` prepares the dormant promotion engine and wallet version fields.
2. Review `promotion_settings.legacy_credit_unit_rate` **before any wallet is converted**. Its seeded value, 1200 units (12 credits per old seven-day boost), matches the placeholder seven-day Featured price. This value is a cutover decision, not a published cash price. Keep the chosen rate immutable after conversion starts.
3. Deploy the API and clients with `PROMOTION_PLACEMENT_ENABLED=false` and the default catalog (`salesEnabled:false`). Extra-post packs continue through the existing Whish flow. Promotion purchases and promotion credit packs are disabled.
4. Set a stable server-only `PROMOTION_ATTRIBUTION_SECRET` in production. The Clerk secret is a fallback; a development-only key is used only outside production.
5. Collect dated activity before opening sales. Coverage begins with the first successfully recorded event. Seven complete days are required for the default performance-based renewal recommendation; a 14- or 30-day comparison needs correspondingly longer history. Reports show “not enough recorded history” when appropriate.

Wallet amounts are integer hundredths internally; 100 units = 1 displayed promotion credit. Legacy wallets convert once under a row lock and record an audit event. Legacy pending Whish transactions retain their original entitlement and are converted on approval. Post credits remain integers and are unchanged.

## Open Phase 1

1. Set real product and credit-pack prices in `PROMOTION_CATALOG_JSON`, using `backend/config/promotion-catalog.example.json` as the shape. Give the catalog a new version. Replace every `priceStatus:"tbd"` with `"published"`, provide pack prices in USD cents, and set `salesEnabled:true`. The server validates duration options, decreasing daily prices and bulk-credit discounts. Clients submit product/pack IDs and catalog versions, never prices.
2. Before enabling placement, run `npm run job:promotion-cutover` from `backend`. Any still-active legacy timestamp is cleared and its unused seven-day purchasing power returned to the promotion wallet atomically. Re-running is safe. New campaigns refuse activation while unconverted legacy placements remain.
3. Install the deployment scheduler entry in `backend/ops/promotions.cron.example`, adjusted for the deployment path. It runs `npm run job:promotions` **every five minutes**. Keep the existing listing-lifecycle worker scheduled too. Workers require the same database, catalog and secrets as the API.
4. Set `PROMOTION_PLACEMENT_ENABLED=true` for the API and worker. The public catalog reports sales enabled only when both the catalog and placement flag are on.
5. For a sales pause, set catalog `salesEnabled:false` while leaving placement enabled so existing paid runs remain visible. The code supplies the job and schedule template; it does not install a scheduler or deploy an environment.

## Phase 1 behavior

- **Featured:** 3/7/14/30 days, up to three concurrent campaigns per area or primary campus. Hosts choose one target. The three top positions rotate by persistent session allocation, with a fair cyclic counter shared across API instances. A renter keeps the same order for their 30-minute search session while the eligible cohort is unchanged. There is no promise of position #1. The selection layer can later partition candidates by verification before applying the same rotation.
- **Bump:** 3/7 days, an initial lift and one further lift per Beirut calendar day at the original local time. The five-minute worker may deliver it a few minutes later. Missed full daily windows are credited instead of replayed in a burst. Bumps affect the newest normal results; explicit price, distance and match sorts retain their order.
- Server filters run before candidate selection; the client applies matcher requirements before composing Featured and normal results. Maps are not Featured slots and do not receive placement attribution.
- Start now or queue next available. Queuing does not deduct credits or reserve a future date. FIFO allocation, slot selection and wallet debits share an advisory transaction lock. If the wallet is short when its turn arrives, a campaign moves to “Action needed.”
- Only live, unexpired, **available** listings with at least three photos and required utility answers qualify. **Under offer is blocked** for promotion and remains eligible for ordinary search. Rented, archived, removed/deleted and restricted-host listings cannot receive paid placement.
- A 14/30-day Featured run can pause. Pausing releases its slot and preserves paid seconds. Resuming joins the queue and never spends the purchase price again.
- Listing status/availability edits stop campaigns in the same transaction and return unused time. Expiry is checked live by search, with reconciliation refunding from the actual expiry timestamp. Deletion retains a listing ID/title snapshot for reporting.
- Unused-time refunds are prorated using the purchased rate, rounded up to the smallest wallet unit, and capped at the original debit. A cumulative ledger and row locks prevent duplicate refunds. Undo returns the full purchase price within the configured window (15 minutes by default).
- Auto-renew is optional and **off by default**. It uses existing wallet credits only. It never automatically charges Whish or renews the listing itself. A changed product price requires fresh consent. Queue/renewal/status updates appear in the listing’s promotion screen; Phase 1 does not add promotion email/push delivery.

## Host UI

`/hosting/listing/:id/promote` is shared across web and Expo. Desktop uses product choices beside an order summary; phones stack the same controls. It includes listing identity, duration/day prices, pause eligibility, target scarcity, expected opening when available, wallet balance, explicit auto-renew, disabled-price/eligibility states, queue management, undo, stop and results.

Entry points are per-listing dashboard actions, after publishing, the existing silence screen (with the photo review action retained), and the day-25 renewal decision screen when dated performance qualifies. There are no generic upsell banners. Bulk packs use the existing credits page and Whish return flow.

Each report compares views and WhatsApp taps during active service intervals with an equally long preceding period. Paused intervals are excluded. The baseline is unavailable if tracking began too late or the listing had not yet been published. An earlier promotion in the baseline is disclosed. Lifetime counters remain separate.

Featured impressions are deduplicated per campaign/listing/session: web requires at least half the card visible for one second; Expo counts a card entering the FlatList viewport and explicitly labels that measurement. Attribution uses expiring, signed listing/campaign/session tokens. Owner activity is excluded. Contact taps have durable 15-second deduplication. Cost per tap is net spent credits divided by **attributed** WhatsApp taps; zero taps displays a dash. Taps do not imply conversations or renters.

## API and data

- Public `GET /api/promotions/catalog`, `GET /api/credits/catalog`.
- Authenticated `GET /api/credits/balance`; existing Whish purchase/confirmation endpoints accept a catalog pack ID/version.
- Owner `GET /api/promotions/listings/:id/options`, `GET /api/promotions/listings/:id`, `POST /api/promotions` (UUID idempotency key).
- Owner campaign detail/analytics, pause/resume/stop/cancel/undo actions, `PATCH /api/promotions/:id/auto-renew`, and promotion notifications.
- Existing listing view/contact-tap endpoints accept optional activity/session IDs and a placement token; `POST /api/listing-activity/impressions` accepts platform-specific measurement.
- New tables cover campaigns, service intervals, wallet ledger, bump executions, notifications, activity coverage/events, session allocations and rotation counters. Short-lived allocations are pruned by the worker; historical activity and financial ledger entries are retained.

## Verification

- `cd backend && npm run test:promotions`: applies all migrations to a fresh, uniquely named local test database, runs real transaction/concurrency scenarios, then removes only that test database. The connecting PostgreSQL role needs create/drop-database permission.
- Verified: 17 isolated database scenarios, including concurrency, report windows, legacy conversion and the Beirut daylight-saving boundary; backend TypeScript build; existing lifecycle/edit-audit/contact tests.
- Verified: frontend placement/expiry/undo and silence tests, plus two Playwright purchase, queue, price-gate, report and responsive-layout tests. Playwright fixtures mock the API; they do not charge Whish.
- iOS and Android Hermes exports passed. Native component boundaries for the web search entry and campus pin picker prevent browser-only Mapbox code from entering these exports. Web map behavior is unchanged.
- The full frontend typecheck still has pre-existing Expo/Clerk/StyleSheet errors outside these changes. Native device interaction and real Whish settlement still require release-environment verification.

## Phase 2

Multi-unit host rotation within one purchased slot, future reservations, verification-based ordering, auctions and seasonal pricing remain out of scope. No commission, escrow, renter-host checkout, AI ranking, or changes to WhatsApp contact are included.

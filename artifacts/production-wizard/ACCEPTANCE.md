# Production listing wizard acceptance

13 November 2026. Branch: `wizard-units-v2`. No merge or deployment.

Click through: http://localhost:8085/create. This is the production web export, connected to the real local API on port 3002. Sign-in is required first. The existing development server remains available on port 8084.

## Implemented

- `/create` opens the new wizard directly. Place questions run once, followed by four screens for each unit, Add another unit and Review. Existing-place additions skip Place questions.
- Copy preserves unit values, appends ` (copy)` within the title limit and clears photos. Start blank starts with fresh unit values. Summaries, editing, confirmed removal, the 20-unit limit and whole-apartment-only buildings are supported.
- Account-owned server draft IDs resume across browsers/devices and appear in In progress. Saves use last-save-wins with revision notices; statuses are Saving, Saved and Couldn’t save / Retry.
- The existing quote and batch endpoints provide per-unit/total costs, atomic publishing and credit spending. Persisted request identities and receipts recover uncertain responses without duplicate units or charges. 402 retains details and returns from credit purchase to the same draft; 409 requires renewed review.
- Shared form code is used by creation, live-listing editing and shared-place editing. The old wizard, local slot orchestration, cards screen, demo files and unused animation assets are removed. The database change drops the old slot table and deletes legacy draft listings. There is no migration or old-client bridge.

## Verification

- Backend build and 20 integration scenarios passed in a disposable local test database. Coverage includes ownership, shared details, inventory rules, validation, all-or-nothing charging, concurrent/idempotent requests, server draft lifecycle, last-save-wins, stale revisions and changed existing places.
- 24 frontend checks passed: wizard model, writing suggestions and pricing guidance. These include copying, blank values, independent units, gallery boundaries/readiness, stable photo ownership after navigation/removal, limits and the retained parking-included default.
- Nine retained inventory browser checks passed after the obsolete list wrapper was removed from their harness.
- Real authenticated browser acceptance passed at 375px mobile and 1440px desktop, plus 768px and 1024px tablet checks. Every screen has a mobile and desktop capture; long forms include successive scroll positions. See `acceptance-results.json` and the gallery for the exact captures.
- Browser coverage includes one unit, three units with Copy, independent rents, title suffixes, existing-place publishing, Start blank, Review editing/removal, reload and second-browser draft recovery, external revision notice, save failure/Retry, actual 402/409 responses, interrupted publish-response receipt recovery, late real uploads the existing live-listing editor and mobile progress navigation at the 20-unit maximum. No uncaught browser errors were observed.
- Production web, iOS and Android export completed successfully. Production browser verification also caught and fixed missing Expo 58 script/style injection, font preloading, an unnecessary background home route on web and an inconsistent initial host-shell layout. Direct loads of the wizard and Your listings are verified at desktop and mobile sizes. The screenshot preview serves the exported web application, without the development overlay.
- The full frontend typecheck still reports 39 existing diagnostics elsewhere in the repository and retained editor components. There are no diagnostics in the new wizard, server-draft hook/context, draft-list hook or changed photo grid. Native runtime interaction was not tested because no emulator/device is available.

## Restoration

The browser runner removes its published units, empty test places, drafts, publish receipts, charge-ledger rows and uploaded files in `finally`, and restores the original account credits, role and free-publish counters. `restoration.json` records the completed restoration. Existing demo listings are preserved; the whole database is never reset.

## Local rerun

From `frontend`, export with `EXPO_PUBLIC_API_URL=http://localhost:3002`, then run `node scripts/serve-web-export.mjs`. The preview defaults to `.expo/wizard-shipping-web` and port 8085. Set `STUDENTLY_TEST_URL=http://localhost:8085` before running `node tests/creation-wizard-ui.mjs`. The local API and normal development authentication configuration must be running.

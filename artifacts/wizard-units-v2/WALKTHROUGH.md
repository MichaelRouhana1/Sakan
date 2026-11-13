# Wizard v2 — review walkthrough

Implemented on `wizard-units-v2`; not merged into main. Publishing is simulated. Example costs, contact and place data are labeled sample data.

## Open it locally

- [Blank prototype](http://localhost:8082/create?wizard=v2)
- [One unit, with example details](http://localhost:8082/create?wizard=v2&demo=one)
- [Three units via Copy this unit](http://localhost:8082/create?wizard=v2&demo=three)
- [Add to an existing place](http://localhost:8082/create?wizard=v2&demo=existing)

The same links work at desktop and mobile viewport sizes. Drafts resume in the same browser. To restart an example, append `&new=1`; this replaces only that example's prototype draft.

## 1. One unit

Go through Place type, Location, Utilities, House rules, and optional Building photos. Then complete Layout, Unit photos, Rent and Title/description. Finish unit opens the unit summary. Done opens Review with shared contact and the credit total; Publish all shows simulated success.

- [Desktop video](one-unit-desktop.webm) · [Mobile video](one-unit-mobile.webm)
- [Desktop Review](one-unit-desktop-review.png) · [Mobile Review](one-unit-mobile-review.png)
- [Desktop contact and cost](one-unit-desktop-contact-cost.png) · [Mobile contact and cost](one-unit-mobile-contact-cost.png)

## 2. Three units, including copies

The example starts after Unit 1. Copy this unit opens Unit 2 with layout, rent and copy prefilled, including ` (copy)` on the title. Its photos are empty. Use 3 example photos, change the rent, and Finish unit. Repeat for Unit 3, then Done. The summary grows from one to three rows. The recording uses independent rents of $650, $750 and $850 and keeps the suffix on Unit 2; Unit 3 is renamed manually. Review shows the example cost per unit and total of two credits.

- [Desktop video](three-units-copy-desktop.webm) · [Mobile video](three-units-copy-mobile.webm)
- [Desktop copied title](three-units-desktop-copy-title.png) · [Mobile copied title](three-units-mobile-copy-title.png)
- [Desktop unit summary](three-units-desktop-summary.png) · [Mobile unit summary](three-units-mobile-summary.png)
- [Desktop Review](three-units-desktop-review.png) · [Mobile Review](three-units-mobile-review.png)

## 3. Adding to an existing place

Place is marked existing and read-only. The example begins at Unit layout and skips every Place question. Add unit photos, set the rent and title, finish the unit, and review. Only new units appear in the batch.

- [Desktop video](existing-place-desktop.webm) · [Mobile video](existing-place-mobile.webm)
- [Desktop entry](existing-place-desktop-layout.png) · [Mobile entry](existing-place-mobile-layout.png)
- [Desktop Review](existing-place-desktop-review.png) · [Mobile Review](existing-place-mobile-review.png)

## Acceptance evidence

- 17 model tests pass, including existing v1 regression coverage.
- All three flows pass at 1440×1000 and 375×900, with additional 768/1024 layout checks.
- Copy suffix and title limit, empty copied galleries, blank-unit defaults, independent unit rents, shared contact, photo limits, stable upload ownership, draft recovery, unit limits and existing-place restrictions are checked.
- Browser checks cover Review edits/removals, quote refresh/failure/retry, empty-batch blocking, visible storage failure and retry, keyboard focus, reduced motion and horizontal overflow.
- Delayed photo upload completes into Unit 2 after navigating to Unit 1; the completed URL survives reload. Browser decoding/cropping is real; the upload response is mocked.
- No real publish requests and no uncaught browser errors in the acceptance suite. APIs are mocked for deterministic recordings.
- `/create` without the flag renders v1. The production SPA build renders v1 even with `?wizard=v2&demo=three`.
- Both the production SPA export and full static web export pass. The full static export uses the project's normal Clerk configuration; disabling Clerk separately exposes an existing profile-page rendering error.
- Frontend typecheck has the same 44 existing diagnostics as before the change; no new diagnostics.

See [browser results](acceptance-results.json), [production results](production-results.json) and [production screenshot](production-v2-flag-ignored.png).

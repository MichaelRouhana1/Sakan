# Production listing wizard

`/create` is the production wizard on web, iOS and Android. Sign-in is required before creating or loading a draft. `/create?draftId=<id>` resumes an account-owned server draft; `/create?placeId=<id>` begins a new unit in an owned place and skips Place questions. There is no feature flag, demo route or simulated publishing.

## Flow

Place type â†’ Location â†’ Utilities â†’ House rules â†’ Building photos (optional, 0â€“15). Each unit then has Layout â†’ Photos (3â€“15) â†’ Rent/terms â†’ Title/description â†’ Add another unit. Copy fills only unit fields and appends ` (copy)` within the 60-character limit; it clears photos. Start blank retains only Place details. Review contains unit rows with edit/remove, contact once, authoritative credit quotes and Publish / Publish all.

## Drafts and publishing

`creation_drafts` stores a versioned document, owner, revision, lifecycle and confirmed publish result. Draft updates use last-save-wins; a revision change raises a small Reload notice. Saves are serialized and debounced for 700ms; navigation and Save & exit flush them. Saving, Saved and Couldnâ€™t save / Retry are the only save states. No local draft storage, offline outbox, migration or legacy compatibility paths remain.

The pre-launch schema change `0040_creation_drafts.sql` deletes old slot storage and unpublished legacy listing drafts. Development/test drafts are intentionally not preserved.

Publishing uses the existing quote and batch endpoints. A frozen attempt is saved to the draft before sending. Retry checks its receipt first; unresolved attempts stay read-only and reuse the same request identity. The backend locks the draft, verifies its revision and optional existing-place version, publishes all units and charges atomically, then marks the draft published in the same transaction. Late saves cannot reopen published or discarded drafts. 402 preserves details and offers credit purchase with a return to the same Review; 409 requires refreshed review or receipt recovery.

`ListingFormContext` is shared with the live-listing and shared-place editors. Field validation and card customisation remain available to those editors without retaining the old wizard.

## Checks

From the repository root:

```powershell
node --test frontend/tests/creation-wizard.test.mjs frontend/tests/copy-suggest.test.mjs frontend/tests/price-guide.test.mjs
node frontend/tests/creation-wizard-ui.mjs
```

The browser suite uses the existing development test host and local API on 3002. The default web target is the development server on 8084; set `STUDENTLY_TEST_URL=http://localhost:8085` to test the production export served by `node scripts/serve-web-export.mjs`. The final acceptance captures use that production export. The suite creates real server drafts, uploads and published units, captures screens at mobile/desktop/tablet sizes, and restores its account balance, role and test data in `finally`. It refuses databases other than the independently marked local `studently_dev`.

Backend publishing/draft integration checks run in a disposable database through `backend/tests/unit-wizard.integration.mjs`. The original production acceptance evidence is in `artifacts/production-wizard`. The restored illustrated design and its final acceptance screenshots are in `artifacts/wizard-design-restoration`.

## Visual design

The original wizard’s warm illustration pane, authored animations, Playfair Display headings and unboxed form layout surround the production flow. Mobile stacks artwork above the question and keeps actions fixed below. Reduced motion freezes artwork and skips transitions; changing the preference also updates an open screen. Only presentation helpers are restored from the saved wizard; its old navigation and draft orchestration stay deleted.

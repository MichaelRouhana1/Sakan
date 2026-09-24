# Find my place

A scripted Explore guide. It does not call a model or add an API endpoint.

- `useBrowseController.ts` owns the shared native/web browse state. Requirements compile into the existing search filters; preferences stay local. The deferred filter/preferences snapshot keeps result explanations tied to their query.
- `facts.ts` captures reported API values before the listing normalizer supplies display defaults. Only these facts may support scores, reasons, or utility badges in match mode.
- `scoring.ts` contains weights, evidence evaluation, deterministic ordering, and the explanatory widening ladder. Widening never changes requirements, scores, or list membership.
- `browseState.ts` validates and serializes URL state. URL navigation wins over saved guide answers.
- `storage.ts` persists versioned drafts and last-applied answers. Storage failures do not block browsing. Closing a guide saves its draft without applying it.
- `components/matcher` contains the shared conversation, summary, and card explanation surfaces, styled with Skoun tokens.

The guide uses a full-height right drawer on web (full-screen below 768px and on native). Its conversation and compact answer tray share one scroll region, with navigation fixed beneath it. Historical answers open a staged editor; saving returns to the current question, and cancelling preserves the current unfinished response. Layout tokens live in `components/matcher/matcherStyles.ts`.

Client ranking relies on the current browse API returning the complete result set. If the API adds pagination or a cap, move ranking before server pagination; do not rank only the loaded page.

## Validation

From `frontend`:

```sh
node --test tests/matcher.test.mjs tests/matcher-ui.test.mjs
npx expo export --platform web --output-dir .expo/matcher-export
node --test tests/matcher-export.test.mjs
```

Browser tests use fixture API responses. Responsive screenshots are written under `.expo/matcher-tests`, including every question at 375×667 and 1440×720. Native safe areas and screen-reader behavior also require checks on iOS and Android devices.

The exported-app test reports existing React #418 warnings from the home route's responsive grid and the top navigation's search icon/IDs. It rejects other browser errors; the isolated matcher harness rejects all browser errors.

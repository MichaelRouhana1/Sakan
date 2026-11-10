# Web map pin migration checks

Step 1 established the rollout selection and regression evidence. Step 2 fixes
the web layout below 1024px and uses a bottom card for its selected listing.
Step 3 adds web data-stability fixes. Step 4 adds the opt-in ordinary-pin/cluster
GL renderer and preview. Step 5 moves highlighted pins into GL and connects
standalone desktop popups and the mobile bottom card. Step 6 owns and cancels web
camera requests and stabilizes preview fitting. Step 7 makes layers the default
on all web while retaining marker rollback.

## Step 7 behavior and boundary

- Missing/empty/invalid renderer configuration now defaults to `layers` on desktop
  and mobile web. A valid URL override wins over a valid environment setting.
  Selection remains frozen per document so browse and desktop preview agree.
- `/search?mapPins=markers` restores HTML listing/cluster rendering after a full
  reload. `/search?mapPins=layers` explicitly requests layers. Alternatively set
  `EXPO_PUBLIC_WEB_MAP_PIN_RENDERER=markers` and restart/rebuild web. Remove a URL
  override before testing the environment setting.
- The HTML renderer and flag remain intact. Step 8 removal requires confirmed
  issue-free web rollout; automated qualification is not a production soak.
  No deployment, native/shared runtime, dependency or local `.env` change.
- Ordinary `/search` and university pages without a renderer parameter now have
  explicit desktop/mobile checks for GL grouping, selection, cluster survival,
  popup versus bottom card, routes, zero movement-triggered source writes/requests,
  desktop preview consistency and the same canvas on reopening. The Step 6 delayed
  filter regression also runs without an override.
- Existing marker-specific DOM tests now request `mapPins=markers` explicitly;
  they continue to qualify rollback. The browser flag test includes missing and
  invalid overrides as well as both valid renderers. Hover/campus and responsive
  checks also exercise the actual new default.
- Protected comparison: `verify 7`; native phase: `step7-checkout`. Only
  `lib/webMapPinRenderer.web.ts` and `.env.example` are runtime/config changes.
  Reverse pin-to-card hover remains independent and deferred.
- Latest Step 7 qualification: 62/62 browser cases (31 desktop, 31 mobile),
  14/14 live Mapbox cases and 19/19 unit tests passed. TypeScript retained 44
  existing diagnostics with none added. Native map module lists/source hashes
  remained unchanged. Physical-device and Safari/WebKit checks were not run.

## Step 6 behavior and boundary

- Follow-up filter correction: map auto-fit uses an explicit geographic key
  (area/university/campus/institution, search text and geographic radius), rather
  than result IDs or layout size. Initial/geographic fitting waits for the complete
  query snapshot. Property filters, sorting, polling and membership changes do not
  move the main map. Explicit pin/hover/arrow cameras keep their existing behavior.
- The web browse parent retains the last successful listing/campus snapshot while
  new list/map queries load, including while a mobile map query is disabled.
  Completed empty results still clear pins normally. No shared query hook changes.
  Reload uses a small pointer-transparent badge; the opaque loading overlay is
  limited to Mapbox startup. The map instance/canvas stay mounted throughout.
- A delayed-response regression really drags the map, changes Room type to Student
  Building, checks old marker identities/GL data, camera and canvas retention, then
  changes Area to ensure geographic fitting still works. It runs in both modes on
  desktop and mobile. The pre-fix test reproduced both bugs in both desktop modes.
- This follow-up has its own protected baseline: `verify 6-filters` and
  `MAP_PIN_NATIVE_BASELINE_PHASE=step6-filters-checkout` (historical follow-up).
- `webMapCamera.web.ts` owns one authored camera request at a time. A newer request
  detaches callbacks/timers before stop(), since stop may fire moveend immediately.
  Every stage carries request and stage IDs through Mapbox eventData. An unrelated
  or stale moveend cannot advance a flight.
- Hover leave/change, map gestures, navigation input, dismissal, parking and
  teardown cancel obsolete work. Cleanup for an old hover cannot stop a newer
  selection. Pointer/touch/wheel/keyboard listeners do not prevent SDK input.
- Pin clicks, both cluster paths, campus/search focus, list hover, initial fit and
  offscreen-arrow cameras use the same owner. Pending GL cluster replies also check
  their source/data version and owner before applying zoom.
- Existing 650/350/700ms staged flights and click timing/reduced motion remain.
  Requests use stable hover/focus/geographic keys, read current data at start, and
  do not replay for price/metadata edits or reordered polling. The university
  commit ring must belong to the currently hovered card.
- Initial fit is a cancellable delayed request; reopening the same kept-alive map
  resizes it without another fit. Focus requests retain their identity while campus
  metadata arrives, so data availability cannot resurrect a canceled request.
- The read-only desktop preview uses stable web listing records and fits only when
  its geographic bounds change. Prices, counts, promotion tokens and reordered
  responses do not refit it. A single place now centers correctly. Its cap, pitch,
  bearing and renderer flag remain; mobile still has no decorative preview.
- The former reload workaround after university hover has been removed from the
  browser test. New normal-motion cases cover interrupted stages, selection
  takeover, price polling, stale worker replies, same-map reopening and previews.
- Native source/query behavior and dependencies are untouched. Step 7 rollout and
  the independent reverse pin-to-card hover enhancement are outside this step.

## Step 5 behavior and boundary

- Layer mode creates no HTML listing or cluster markers, including selection and
  list hover. `studently-active-listing-points` mirrors the place dataset without
  clustering. Both sources update only for real data changes. Feature state hides
  the ordinary leaf and reveals its highlight; selection/hover do not call setData.
- `studently-active-listing-pin` sits above ordinary pins and clusters, so the
  highlighted place survives clustering. Its dark label/red teardrop sprite uses
  the existing 1.06 highlight scale around the bottom anchor, without CSS transforms.
  The cluster-count state dependency carries over the Mapbox 3.28.1 zoom-crash fix.
- Desktop uses standalone Mapbox popups at group coordinates. Existing escaped
  markup, route-side resolution, replacement/duplicate-close guards, and one-open
  popup policy are reused. GL popup offsets clear the selected sprite's bounds,
  keeping its price label clickable. Edits update coordinates/markup without reselecting or
  replaying the click camera. Refreshed markup rebinds its Close button.
- Mobile web keeps the Step 2 bottom card and touch gestures. Crossing 1024px
  changes presentation under a close guard without losing selection or the route.
- Keyboard users can Tab to a focus-revealed listing chooser. Choosing a place
  uses the same GL selection path; canvas pins require no hidden HTML Marker.
- Campus pins deliberately remain HTML: their small fixed set includes accessible
  switch/cancel/confirm buttons. Distance pills remain HTML and now refresh their
  label on route edits. Offscreen arrows remain React controls. The route stays GL.
- Low-to-high GL order in the Standard top slot: campus route; ordinary listing
  symbols; cluster shadow; cluster circles; cluster counts; highlighted listing.
  Campus markers and distance pills are above the map canvas. Within that DOM
  overlay, ordinary campuses use z=2, pills z=300, focused/pending campuses z=900,
  and layer-mode popups z=1100. Legacy popup stacking is retained. The sibling offscreen arrows remain above the map host; the
  mobile card remains above those controls and defines their avoidance area.
- Click cameras, current list-to-pin hover, initial fitting, and campus flights
  keep their existing rules. Camera-intent cancellation is Step 6. Reverse
  pin-to-card hover remains an independent nonblocking enhancement.
- Checkout protection uses `verify 5`; native graph checks use
  `MAP_PIN_NATIVE_BASELINE_PHASE=step5-checkout`. No native/shared runtime file,
  package, default renderer, or production rollout setting changes in this step.

## Step 4 baseline (selection bridge superseded by Step 5)

- `/search?mapPins=layers` opts into GL ordinary listing pins and clusters on
  desktop and mobile web. `/search?mapPins=markers` restores the legacy renderer
  after reload. Environment configuration works through the same web-only flag.
- `webMapLayers.web.ts` owns the `studently-listing-points` GeoJSON source. There
  is one feature per place with stable group identity, minimum price, and matching
  unit count. Features are sorted by identity without mutating the input groups.
- Mapbox clusters place features at radius 52 through zoom 16. Counts are places,
  not units. Cluster clicks use the source's expansion-zoom API.
- `webMapPinImages.web.ts` draws 2× price-label/teardrop sprites after font loading.
  Cluster bubbles use circle layers; their count symbols use generated numeral
  images. No extra glyph or image service is required. Sprites are reused by label,
  restored on style reload/missing-image events, and retired safely after idle.
- GL draw order is the existing route, price symbols, cluster shadow, cluster
  circles, count symbols. All use the Standard `top` slot. Late route insertion
  is moved below pins at install/idle; both controlled and live style captures
  verify that order.
- Geometry/label/count edits update the source. Equivalent/reordered results,
  camera movement, and active-pin changes do not call `setData`. Active identity
  uses feature state to hide the one ordinary icon owned by the temporary bridge.
- **Step 4 bridge:** selected/highlighted pins used the existing HTML marker,
  popup/card and camera controller. Campus pins, route lines, distance pills, and
  arrows retain their current implementation. Their full GL selection/stacking
  integration is delivered in Step 5 above. Reverse pin-to-card hover is still independent.
- The decorative preview uses the same GL sprites/source with clustering disabled,
  preserving its existing eight-place limit and always-visible unit-count label.
- Renderer teardown detaches listeners and removes its owned resources before map
  destruction. Native files and shared query/cluster helpers are unchanged.

## Step 3 behavior

- Web-only adapters stabilize listing/campus arrays by their normalized JSON
  content. A response with the same records in a different order reuses the
  existing map array and its initial server order. The list keeps current server
  order; no input arrays are sorted or mutated.
- Parent renders with the same query-record references take a shallow fast path.
  New record objects receive a content comparison. Price, location, place, nested
  metadata, and photo-order changes still reach the renderer.
- Map-only promotion data is excluded, matching the main map's existing policy.
  Its changing session/token fields cannot cause a map-data reset.
- Listing/campus membership keys are sorted unique IDs encoded as JSON. Reordered
  polling responses preserve selection, route, card/popup, and camera. Actual
  membership changes dismiss the old popup/card and route.
- Highlighted price stacks scale around their bottom center, keeping their tip
  at Mapbox's marker anchor for desktop hover and desktop/mobile selection.
- A traced close guard ignores never-opened popups and duplicate close events.
  Mapbox calls `remove()` from `Marker.addTo()` even for its never-opened bound
  popup; that event must not dismiss a different selected pin's card.
- The shared/native search hook, request scheduling, and native map are unchanged.

## Step 2 behavior

- Below 1024px, map mode hides the results rail and gives the map the full width.
  At desktop widths the existing split view and anchored popup remain.
- Showing the kept-alive map schedules a resize after layout, in addition to its
  existing ResizeObserver. Closing and reopening preserves the map instance.
- A mobile listing-pin tap opens one nonmodal bottom card. Another pin replaces
  its contents. Grouped pins list all matching units in a scrollable card body.
- Map drag/pinch keeps the card open. A blank-map tap, Close, or Escape dismisses
  selection. Card scrolling does not drag or zoom the map. Close has a 44px target.
- The card reuses the existing escaped listing markup and detail links (new tab).
  It uses the existing selection/route state without a mobile Mapbox popup.
- A breakpoint change transfers the selection between card and anchored popup;
  detaching the popup is guarded so it cannot clear selection or its route.
- Offscreen arrows use the area above the card. Distance pills avoid its bounds.
  The mobile matcher FAB is hidden in map mode so it cannot cover the card.
- Mobile map close clears its selection. Desktop keeps its existing parked-map
  behavior. All edits are in web-only components/helpers; native maps are unchanged.

## Rollout selection

- Layers are the code default. The example configuration now sets
  `EXPO_PUBLIC_WEB_MAP_PIN_RENDERER=layers`.
- Reload `/search?mapPins=markers` or `/search?mapPins=layers` for a QA override.
  The selection is frozen on first browser map use so browse and sidebar preview
  agree. Invalid values fall back to a valid environment setting, then `layers`.
- Layers were opt-in through Step 6; Step 7 enables them by default. Host data
  attributes report requested/active mode and default/environment/URL selection.
- `lib/webMapPinRenderer.web.ts` is imported only by the web browse map and web
  sidebar. Android and iOS continue to resolve `ListingBrowseMap.tsx`.

The existing root `@playwright/test` dependency is used. No package was added.

## Reproduce checks

Run from the repository root with Node and the installed dependencies:

```powershell
node --test frontend/tests/web-map-camera.test.mjs frontend/tests/web-map-layers.test.mjs frontend/tests/web-map-data.test.mjs frontend/tests/map-pin-renderer.test.mjs frontend/tests/place-pins.test.mjs
```

Implementation-start snapshots and browser captures are local, gitignored `.expo`
artifacts. The comparison commands below need those snapshots. In a fresh clone,
capture a baseline before making changes with
`node frontend/tests/map-pin-baseline.mjs capture 7`; after changes, run
`node frontend/tests/map-pin-baseline.mjs verify 7`. Capture/verify refuses to
overwrite an existing implementation-start snapshot.

For browser and native dependency checks, start a separate Metro server in
`frontend` on port 8085. It needs the existing Mapbox public configuration. Use
an empty Clerk publishable key only in this isolated process so the fixture
tests do not depend on live authentication:

```powershell
$env:CI='1'
$env:BROWSER='none'
$env:EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=''
$env:EXPO_PUBLIC_WEB_MAP_PIN_RENDERER=''
$env:EXPO_WEB_OUTPUT='single'
node node_modules/expo/bin/cli start --web --port 8085 --offline
```

The config uses installed Windows Chrome by default. Set `MAP_PIN_TEST_BROWSER`
to another installed Chromium executable when needed. Native comparison also
needs an initial snapshot: with Metro running, set
`MAP_PIN_NATIVE_BASELINE_PHASE=step7-checkout` and run
`node frontend/tests/map-pin-native-graph.mjs capture` before making changes.

In a second shell at the repository root:

```powershell
$env:MAP_PIN_BASELINE_PHASE='step7-final'
$env:MAP_PIN_LIVE_STYLE='0'
node node_modules/@playwright/test/cli.js test -c frontend/tests/map-pin-web.config.ts --reporter=line
$env:MAP_PIN_NATIVE_BASELINE_PHASE='step7-checkout'
node frontend/tests/map-pin-native-graph.mjs verify
```

The capture scenario also writes comparison HTML/PNGs with marker mode on the
left and layer mode on the right. The two rows show an overview and price-label
detail with identical cameras/results. Original full-viewport and map-region
screenshots are retained. Optional live-basemap capture uses
`MAP_PIN_LIVE_STYLE=1`, `MAP_PIN_BASELINE_PHASE=step4-live`, and Playwright's
`-g 'capture matching'` filter; API data stays a controlled fixture.
Captures wait for Mapbox's loaded/tiles-loaded state and rendered frames after
each camera change, so a stretched lower-zoom tile cannot skew the comparison.

The Step 4 zoom regression (`-g 'GL zoom sweep'`) uses 51 distinct places,
selects a listing, sweeps zoom 18 down to 0 and back, exercises wheel zoom and
mobile touch pinch, then clears selection. It captures browser exception stacks
as well as Mapbox error events, verifies rendered pins/clusters at every zoom,
and requires zero GeoJSON source writes during these interactions. Run it with
`MAP_PIN_LIVE_STYLE=1` to also test Mapbox Standard. This reproduced the
`hasStateDependentPaint` / undefined `paint` crash on both web viewports before
the cluster-count symbol gained the same feature-state dependency as the leaf
symbol. Mapbox 3.28.1 can otherwise update that stateless symbol bucket with an
empty layer list while selection state exists on the shared source.

The fix's checkout comparison uses `verify 4-zoom` and its separate
`step4-zoom-checkout/` snapshot. For its native comparison, set
`MAP_PIN_NATIVE_BASELINE_PHASE=step4-zoom-checkout` before running the graph
script; the original step snapshots are retained. Restart the isolated Metro
server after changing runtime code: CI mode disables source watching.

`STUDENTLY_TEST_URL` can override port 8085, and `MAP_PIN_TEST_BROWSER` can override
the installed Windows Chrome executable. Browser/device packages are not
downloaded. Stop the isolated Metro server after testing.

The `capture` commands in the checkout/native baseline scripts are one-time
pre-change operations. They refuse to overwrite existing snapshots. Do not
recapture over the implementation-start baseline to make a comparison pass.
Artifacts live in ignored `.expo/map-pin-baseline/` and must be preserved before
clearing Expo's cache. `verify` requires these local snapshots; it is not a
standalone CI test on a fresh clone.

## What the evidence covers

Each browser scenario runs at desktop 1440×1000 and mobile web 390×844 with touch
emulation. Responsive checks also cross 320, 768, 1023, and 1024px widths. The
scenarios cover place grouping/minimum price/unit count, cluster
count and expansion, selected pin visibility and popup retention during pan and
zoom, initial fit, route and distance pill, popup side/replacement, offscreen
arrows, pitch controls, 60-second polling, reordered results, campus switch
confirmation/cancel, and renderer overrides. Desktop additionally checks list
card hover flight and the sidebar preview. Pin-to-card hover is a later,
independent enhancement.

Mapbox GL, its projection, map camera, markers, popups, and route layer are real.
API responses and the blank basemap are controlled fixtures. This does not test
live tiles, Standard-style building occlusion, real API latency, or Safari/iOS
browser rendering. The Chromium mobile project uses touch/viewport emulation.

The 390px test now requires a 390px canvas with the real application layout and
uses no viewport workaround. Additional checks cover same-canvas close/reopen,
popup/card transfer at breakpoint changes, real touch event sequences for map
drag/pinch and card scrolling, single/group replacement, and dismissal. Historical
`before/` and `after/` artifacts preserve the Step 1 10px defect captures and its
test-only workaround. `step2/` captures are also preserved. Current captures go
into each step's folder. Step 4 includes GL source/rendering, expansion, source-write
counts, actual price/coordinate updates, sprite repair, and style-reload checks.

The polling assertions now require retained selection, the same listing-array
reference, the same marker node, unchanged camera, and zero new `movestart`
events. Both standard and university modes are covered, including shuffled
campuses and changed promotion tokens. Real price updates must update the pin
and card without refitting; a real Room type filter returning no units must
refetch and clear selection. Historical Step 1/2 artifacts retain the old resets.
Step 6 cancels the university list-hover camera on leave/takeover. The campus
confirmation scenario now stays on that same map without a reload workaround.

The checkout comparison protects each step's implementation-start working tree,
including preexisting uncommitted native changes. Step 4 uses its separate
`step4-checkout/` snapshot and web runtime allowlist; earlier snapshots remain
intact. The check requires no added TypeScript diagnostics. Existing diagnostics are
reported separately rather than presented as a clean typecheck.

The native comparison requests real Android/iOS Metro dependency maps for the
native map component, checks local source hashes/module membership, verifies the
native component was selected, and rejects imports of the web renderer. It is
not a device or simulator smoke test.

## Approved sequencing

1. Baseline evidence, rollout flag, and platform isolation.
2. Mobile full-width map, resize-on-show, bottom card, and touch behavior.
3. Stable web result arrays, order-independent reset key, and highlight stability.
4. GL source/layer renderer and preview behind the flag.
5. Selection, campus, route, stacking, and popup integration.
6. Camera intent and existing list-to-pin hover behavior.
7. Web qualification and layer-default rollout (current step).
8. Remove the HTML renderer and flag after issue-free web rollout is confirmed.

Reverse pin-to-card hover remains an independent enhancement and must not block
the migration. Complete and report one step at a time. Each step must check
desktop, mobile web, and native isolation. Native device smoke remains an
explicit outstanding check where no device tooling is available.

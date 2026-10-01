# Amber list/grid card transition

Reference: https://amberstudent.com/places/search/bath-college-2001283411113

Inspected 2026-09-29. This investigation is limited to the desktop layout toggle.

## Confirmed from published source

- The `SearchDesktopV2` handler in `858.de739ebcdd40e28d.desktop.js` calls `document.startViewTransition(update)` when available, with a direct state update fallback.
- List cards in `8716.dacd003234aa6cd5.desktop.js` and grid cards in `858.de739ebcdd40e28d.desktop.js` share `viewTransitionName: search-item-${id}`. Amber enables these names when the loaded result count is at most ten.
- There is no custom duration/easing for this toggle in the downloaded stylesheets: it uses the browser's default view-transition motion. The main stylesheet disables the animation under `prefers-reduced-motion: reduce`.
- This matches card snapshots across different component trees, interpolates their positions and dimensions, and crossfades the old/new contents.
- The live reference page loaded, then crashed in the embedded browser. Implementation was verified from its public JavaScript/CSS rather than a captured animation recording.

Source base: https://cdn-static-assets.amberstudent.com/amber-user-website/build/assets/

## Skoun adaptation

- Run explicit list/grid toggle updates inside a View Transition, using React DOM `flushSync` so the new layout is committed before the browser captures it.
- Give each result wrapper a stable, instance-scoped CSS transition name in both layouts, including larger result sets.
- Use 250ms ease movement; suppress the root page crossfade so navigation and filters stay still.
- Skip animations for reduced motion and fall back to normal layout changes when the API is unavailable.
- Supersede pending transitions on rapid clicks and clean up on unmount.
- Keep current card styling, responsive column counts, distance separators, and map behavior.

No new dependencies or copied Amber assets are required.

## Verification

- Local `/search` at desktop width: all 27 results retain 27 unique transition names in list and grid. Three-column cards measure roughly 279px wide and expand to roughly 877px in list view.
- Both toggle directions and rapid alternating clicks settle into the requested layout, with the transition class cleaned up and no browser console errors.
- Full frontend TypeScript check remains blocked by existing repository errors, including `StyleSheet.absoluteFillObject` in the unchanged skeleton styles. No diagnostics in the new hook or changed browse controller code.

# Studently logo system

All assets are in this folder. Nothing has been wired into the app.

## Pick the artwork

- **Light backgrounds, splash artwork, store marketing:** `studently-full-color.svg`. Original contours, gradients and palette; the interior is an actual opaque white path, with dark-red window panes.
- **Red, dark, or busy photo backgrounds:** `studently-full-color-tile-square.svg` or `studently-full-color-tile-circle.svg`. White backing and built-in padding protect the complete colored mark.
- **Red headers and dark surfaces:** `studently-knockout-white.svg`. Flat white artwork with a transparent interior and four solid white window panes, as approved.
- **Light surfaces:** `studently-knockout-red.svg`. Same geometry in #EA3F4A. Never place red artwork directly on brand red or white artwork on white.
- **Tiny UI below 32px (favicon, tab bar, spinner):** `studently-small-color.svg`, `studently-small-knockout-red.svg`, or `studently-small-knockout-white.svg`. Flat pin and roof, with a tight centered 2×2 window occupying about 43% of the interior width. At 16px, use the supplied `*-16.svg` or `png/*-16.png`: these use one solid rounded-square window to prevent blurring. Color interior is opaque white; knockout interior is transparent. Larger small-mark exports are retained as source artwork, but use the full mark whenever the displayed size is 32px or taller. The 32px favicon uses the full-color mark; the 16px favicon uses the simplified mark.
- **Photo watermark:** white knockout on an adequately dark, quiet area. Use a full-color tile over bright or busy imagery. A knockout deliberately shows the photo through its interior.

Use the full mark from 32px, including the graduation cap and gradient in color versions. Headers and footers should normally render it at 36–40px. Use the full white knockout over hero photos, red or dark surfaces, and the full-color mark on light surfaces. The simplified mark is only for display sizes below 32px; 16px is its minimum supplied size. Padded tiles and app icons are for larger placements, not favicons. Preserve the supplied aspect ratio and clear space; never stretch, recolor or add outlines. Map-pin artwork in the app remains unchanged.

## App icons

- `png/studently-app-icon-white-1024.png`: full-color mark on white.
- `png/studently-app-icon-red-1024.png`: white knockout on #EA3F4A.

Both are square 1024px opaque PNGs with safe padding. Platform launchers supply their own outer masks; do not pre-round these files. Matching SVG masters are included.

Android adaptive pairs (use both layers at their supplied scale):

- `studently-android-foreground-color.svg` + `studently-android-background-white.svg`.
- `studently-android-foreground-white.svg` + `studently-android-background-red.svg`.

Use the corresponding `png/*-1024.png` layers for Expo's foregroundImage/backgroundImage when integrating later. Foregrounds are transparent; backgrounds are opaque. Artwork fits within the central 66/108-diameter circular safe zone. Do not substitute a store icon as the adaptive foreground or enlarge the layers.

## Colors and transparency

Primary #EA3F4A; dark red #942A38; white #FFFFFF. Existing gradient stops are preserved exactly from the master; no new logo colors were introduced. The near-black and photograph in previews are test backgrounds only.

The full-size contours are unchanged; the artwork is uniformly centered and framed. `source/master-original.svg` preserves the original source. Colored interiors always stay white, including on red, dark and photo backgrounds. Knockouts contain no white backing or masks: their open areas are genuinely transparent, while the four panes remain ink.

## Exports and checks

Every SVG has PNGs in `png/` at 16, 32, 64 and 512px; launcher assets also have 1024px exports. Color and knockout alpha samples, color palette, original paths, output sizes, opaque icons and adaptive safe-zone placement are checked by `build.cjs`.

Open `preview/index.html` and select 16/32/64/512 to inspect actual-size PNGs on white, brand red, near-black and a housing photo. `preview/overview.png` shows every variant and small-size ladders. Each `preview/*-512-backgrounds.png` shows the four backgrounds at actual 512px. Invisible same-color combinations are shown intentionally to document misuse; use the contrasting knockout or white tile to fix the placement. Use the simplified artwork below 32px, including its single-window 16px cut; use the full mark at 32px and above.

`preview/validation.txt` records automated checks. `preview/PHOTO-SOURCE.txt` identifies the QA-only photo. Rebuild using Node with `sharp` available: `node brand/logo-system/build.cjs` from the repository root. No app configuration or runtime assets are changed by that script.

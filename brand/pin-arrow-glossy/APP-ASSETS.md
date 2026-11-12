# Studently app logo

The glossy pin and black S-arrow use the new coral brand color `#EA3F4A`. The white, softly shaded interior stays opaque. Only the exterior is transparent.

- `frontend/assets/images/logo.png`: transparent 512px logo used by `StudentlyLogo` on web and native.
- `frontend/public/logo.png`: same logo for public URLs.
- `frontend/public/logo.svg`: compatibility wrapper with embedded PNG; this is not a vector master.
- `frontend/assets/images/favicon.png`: 64px browser icon.
- `frontend/assets/images/icon.png`: opaque white 1024px app icon.
- `frontend/assets/images/splash-icon.png`: transparent splash artwork.
- Android foreground and monochrome images: centered inside a 600px artwork area on a 1024px canvas; white background layer.

The shared component is used in website, campus and host navigation, native home branding, home/campus footers, and admin navigation. Map pins remain functional listing/campus markers.

The current source is `pin-arrow-madder.png`; `pin-arrow-filled-interior.png` preserves the previous blue artwork. The local `export-madder-assets.cjs` script uses Playwright and Chrome to reproduce the coral exports at their existing dimensions and launcher safe zones. `check-logo.cjs` renders the actual shared component through React Native Web at 16–128px for inspection. Working scripts stay local under the repository's brand-file policy. App icons and native splash updates require a new native build.

## Validation

Checked image dimensions, exterior transparency, opaque interior and app icon, identical public/bundled logo bytes, and rendering of the shared React component at 16–128px on light and dark backgrounds. This is an asset replacement; no application code changed.

## Coral recolor

Created with the built-in image generation tool, editing the existing app logo. Palette: `#EA3F4A` (RGB 234, 63, 74), with warm coral highlights and deeper red shadows. Final prompt:

> Use case: precise-object-edit. Edit target: the attached existing Studently glossy location pin / S-arrow logo. Make a strict color-palette replacement only: replace ALL blue and cyan materials, glowing traces, highlights and blue edge pixels with warm coral red / pink shades anchored at the exact new brand color #EA3F4A (RGB 234,63,74), with pale warm coral specular highlights and deeper red shadows. Preserve the original silhouette, S-shaped winding black channel with tiny luminous dots, downward arrow, glossy 3D surface, soft white inner areas, geometry, proportions, composition, framing and transparent background. No new objects or text, no redesign, no blue/cyan remaining. Keep the logo centered, square canvas, same relative size and padding as the original. Output a clean production PNG with genuine alpha transparency. This image is for replacing the existing app logo.

## Previous blue source

`pin-arrow-filled-interior.png` is the corrected source, created with the built-in image generation tool from the user's supplied reference. It supersedes `pin-arrow-transparent.png`, which incorrectly removed the interior. Prompt:

Precise background extraction of this logo. USER CORRECTION: KEEP THE INSIDE EXACTLY AS IS. The entire area enclosed by the outer blue location-pin silhouette is a SOLID OPAQUE OBJECT, including BOTH large WHITE and PALE BLUE shaded panels on each side of the black S ribbon. These white/light-blue interior panels are physical opaque parts of the logo and MUST remain visible, opaque, unchanged. They are NOT holes, NOT background, NOT negative space. Cut out ONLY the exterior white canvas OUTSIDE the outermost blue pin / bottom arrow silhouette. Preserve all original interior pixels, shading, glowing cyan nodes, black S-shaped arrow, white border near the bottom arrow, and all blue gloss. Output one complete opaque filled pin-shaped badge surrounded by alpha transparency. No transparency anywhere inside the pin. No redesign. No recoloring. The inside must still look white and pale blue even when this PNG is viewed against a black background.

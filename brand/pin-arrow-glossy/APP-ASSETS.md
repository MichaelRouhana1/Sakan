# Studently app logo

The approved glossy blue pin and black S-arrow is now the app's shared logo. The white and pale-blue shaded interior stays opaque, matching the approved reference. Only the exterior is transparent.

- `frontend/assets/images/logo.png`: transparent 512px logo used by `StudentlyLogo` on web and native.
- `frontend/public/logo.png`: same logo for public URLs.
- `frontend/public/logo.svg`: compatibility wrapper with embedded PNG; this is not a vector master.
- `frontend/assets/images/favicon.png`: 64px browser icon.
- `frontend/assets/images/icon.png`: opaque white 1024px app icon.
- `frontend/assets/images/splash-icon.png`: transparent splash artwork.
- Android foreground and monochrome images: centered inside a 600px artwork area on a 1024px canvas; white background layer.

The shared component is used in website, campus and host navigation, native home branding, home/campus footers, and admin navigation. Map pins remain functional listing/campus markers.

The export and check scripts (`export-app-assets.cjs`, `check-logo.cjs`) are kept locally and are not tracked; the committed source is `pin-arrow-filled-interior.png`. With Node and `sharp` available, `export-app-assets.cjs` reproduces the exports. `check-logo.cjs` renders the actual shared component through React Native Web at 16–128px for inspection. App icons and native splash updates require a new native build.

## Validation

Checked image dimensions, alpha channels, opaque app icon, identical public/bundled logo bytes, and successful rendering of the shared React component. TypeScript reports existing errors in unrelated logic and React Native API usage; no new logo-component errors. Full Expo export did not progress beyond bundler startup and was stopped; no successful full production build is claimed.

## Transparent source

`pin-arrow-filled-interior.png` is the corrected source, created with the built-in image generation tool from the user's supplied reference. It supersedes `pin-arrow-transparent.png`, which incorrectly removed the interior. Prompt:

Precise background extraction of this logo. USER CORRECTION: KEEP THE INSIDE EXACTLY AS IS. The entire area enclosed by the outer blue location-pin silhouette is a SOLID OPAQUE OBJECT, including BOTH large WHITE and PALE BLUE shaded panels on each side of the black S ribbon. These white/light-blue interior panels are physical opaque parts of the logo and MUST remain visible, opaque, unchanged. They are NOT holes, NOT background, NOT negative space. Cut out ONLY the exterior white canvas OUTSIDE the outermost blue pin / bottom arrow silhouette. Preserve all original interior pixels, shading, glowing cyan nodes, black S-shaped arrow, white border near the bottom arrow, and all blue gloss. Output one complete opaque filled pin-shaped badge surrounded by alpha transparency. No transparency anywhere inside the pin. No redesign. No recoloring. The inside must still look white and pale blue even when this PNG is viewed against a black background.

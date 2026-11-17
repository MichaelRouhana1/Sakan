# Amber homepage scroll motion

Inspected https://amberstudent.com/ on 2026-11-17 at 1440 × 900 with reduced motion disabled.

## Confirmed source and runtime behavior

The live desktop page now uses HomeV2. Its reveal hook is module `89794` in [the homepage bundle](https://cdn-static-assets.amberstudent.com/amber-user-website/build/assets/js/9200.cc0d1c3df0b73c45.desktop.js). Keyframes are in [the corresponding stylesheet](https://cdn-static-assets.amberstudent.com/amber-user-website/build/assets/css/9200.a9591ec153cfa97d.desktop.css).

The hook reveals individual headings, pills, cards, photos, directory links, and footer content. It does not lift entire sections together. All reveal types fade from opacity 0 to 1 using `cubic-bezier(.22,1,.36,1)`:

- `up`: 20px vertical entrance over 800ms.
- `card`: 32px vertical entrance and scale .97 → 1 over 900ms.
- `photo`: scale 1.04 → 1 over 1200ms.
- `fade`: 6px vertical entrance over 500ms (the city grid).
- `soft`: 10px vertical entrance over 600ms.

IntersectionObserver starts entrances when content reaches the viewport bottom. Its root margin extends 100000px upward to catch content skipped by fast downward scrolling. Elements already within or above the viewport during registration are immediately marked done.

Each intersection batch sorts top to bottom, then left to right for elements within 24px of the same row. Delays accumulate with a 640ms cap. Heading steps are 70ms; pills 35ms; cards 60ms; numbered steps 110ms; directory links 22ms. Offscreen horizontal rail siblings in the same row become visible immediately, avoiding a later entrance when scrolling sideways.

Each element reveals once. A MutationObserver registers asynchronously inserted content. Reduced-motion users bypass reveals.

## Live verification

A controlled REA browser launch captured the current homepage, DOM, and screenshot (`ev_4a9aab36d4fe40f824b074c130ef2491ec4f01eb174f14dd454bdbb8e0036558`). A separate temporary browser scrolled to y=0, 650, 1300, 2100, 3000, and 4200 and inspected computed reveal styles. Runtime confirmed the five timing/movement variants, staggered delays, and 640ms cap. Local working captures are under `frontend/.expo/amber-motion/` (ignored).

## Studently adaptation

`useHomeScrollReveal.ts` implements these motion values with the Web Animations API and individual data markers in `StudentlyHomePage.tsx`. Independent `translate` and `scale` preserve existing card hover transforms. Observation uses Studently's nested ScrollView as its root. Motion remains restricted to the existing desktop breakpoint (900px), with runtime reduced-motion and resize handling and immediate visibility for keyboard-focused controls.

The hero and ticker keep their existing behavior. No Amber branding, imagery, or layout was copied.

# Listing wizard — restored visual direction

The saved wizard at `wizard-cards-v1` is the reference for the outer shell, illustration sizing, header and footer. The approved units prototype supplies the new flow. Preserve their editorial, illustrated composition while retaining the production unit flow and server behavior.

## Composition and typography

Use the saved white, full-height shell: Save & exit on the left, compact progress centered on the page, and Saving / Saved / Couldn’t save at the right. Cap desktop progress at 720px and use equal 160px side slots so the progress stays centered regardless of save state. Place, numbered units and Review remain clickable progress labels. On mobile, restore the outlined Save & exit pill and place the progress tracks above the footer actions.

Restore the original 46% web illustration pane (42% native; 30% at web Review), without a vertical divider, tinted panel or added place captions. Use the saved aspect-aware `wizardLottieFrame` dimensions: up to 680px wide / 560px high on desktop and 340px wide / 260px high on mobile. Web Review uses the original square up to 640px. The form uses the saved 640px desktop maximum with 48px side padding. No enclosing form card.

Restore Playfair Display 700 questions at 42/50px desktop, 36/43px tablet and 32/39px mobile. Body text and controls remain DM Sans; introductory text is 16/25px with a generous 32px gap before the form. Brand red remains #ea3f4a. Links use dark ink and an underline, and selected controls keep the existing red treatment.

On mobile, show the original illustration above the question in the original 240px web band (220px native), followed by the form with 24px side padding. Keep actions fixed at the bottom with thin progress tracks and Place/unit/Review labels. Reuse the saved footer: wide red action and ghost Back on desktop, black Next pill and underlined Back on mobile. Long forms scroll independently; the header and primary action stay available.

## Illustrations and motion

Use the original authored Lottie JSON files, original brand tinting, and subtle grain. Map Place type → house, Location → map, Utilities → electricity, Rules → house rules, Building/unit photos → camera, Layout → room, Rent → pricing, Title/description → writing, and Add another/Review/Success → review. Utilities switches to the original water illustration when its section enters the form viewport. Keep the original illustration-only composition without added captions or phase dots.

The web player loads only in the browser; native uses the same original asset data. Reduced motion shows a still frame at 55% and disables entry motion. Otherwise restore the illustration fade and subtle form entrance. Preserve keyboard focus, readable validation/errors, upload controls and confirmation behavior.

## Production invariants

The new unit-by-unit flow, server draft IDs, last-save-wins notice, Copy suffix and photo clearing, real credit quotes, atomic batch publishing, saved receipts and 402/409 recovery remain in place. No old card orchestration, local draft slots, fake listings, demo paths or prototype labels return. The design restoration must be verified visually against the saved reference, as well as through the existing acceptance checks.

## Header and transition stability

Save & exit, save status and progress labels share a 20px line height and one center line. Reserve a fixed 88px save-status slot so Saving/Saved cannot move progress. Progress tracks sit above their labels without affecting text alignment.

Each screen uses one 160ms opacity entrance. Preserve field wrapper layout while suppressing nested staggered entrances in the wizard. Focus headings before paint with preventScroll; reset the form scroll once, with no delayed focus timer. Keep document scrolling disabled only while the full-height wizard is mounted.

The web illustration player keeps up to four paused, prepared players and warms likely next scenes after the form settles. Only the visible scene plays; dispose players when leaving the wizard. A new scene fades after its SVG is ready. Defer web map construction until the form entrance has finished. Respect reduced motion throughout.

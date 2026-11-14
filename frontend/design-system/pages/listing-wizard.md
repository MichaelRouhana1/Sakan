# Listing wizard — restored visual direction

The saved wizard at `wizard-cards-v1` and the approved units prototype at `c0d3dfb` are the visual references. Preserve their editorial, illustrated composition while retaining the production unit flow and server behavior.

## Composition and typography

Use a white, full-height wizard with the original `studently.` wordmark, a compact save status and Save & exit. Keep Place, numbered units and Review in the progress header. On desktop, the illustration sits in a warm #fcfbfa left pane (40%; 30% at Review), alongside an unboxed form on white. The form has 48px padding and a 700px maximum width, expanding to 900px at Review. No grey page background or enclosing form card.

Restore Playfair Display 700 questions at 42/50px desktop, 36/43px tablet and 32/39px mobile. Body text and controls remain DM Sans; introductory text is 16/25px with a generous 32px gap before the form. Brand red remains #ea3f4a. Links use dark ink and an underline, and selected controls keep the existing red treatment.

On mobile, show the original illustration above the question in a compact 178px band (220px native), followed by the form with 24px side padding. Keep actions fixed at the bottom with the original thin local-step progress strip. Long forms scroll independently; the header and primary action stay available.

## Illustrations and motion

Use the original authored Lottie JSON files, original brand tinting, and subtle grain. Map Place type → house, Location → map, Utilities → electricity, Rules → house rules, Building/unit photos → camera, Layout → room, Rent → pricing, Title/description → writing, and Add another/Review/Success → review. Utilities switches to the original water illustration when its section enters the form viewport. The illustration pane uses the host’s actual place name and a quiet place/unit caption.

The web player loads only in the browser; native uses the same original asset data. Reduced motion shows a still frame at 55% and disables entry motion. Otherwise restore the illustration fade and subtle form entrance. Preserve keyboard focus, readable validation/errors, upload controls and confirmation behavior.

## Production invariants

The new unit-by-unit flow, server draft IDs, last-save-wins notice, Copy suffix and photo clearing, real credit quotes, atomic batch publishing, saved receipts and 402/409 recovery remain in place. No old card orchestration, local draft slots, fake listings, demo paths or prototype labels return. The design restoration must be verified visually against the saved reference, as well as through the existing acceptance checks.

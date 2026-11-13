# Listing wizard

The listing wizard follows Your listings and the current Studently tokens. This page overrides the older generated design-system palette.

## Visual direction

Use DM Sans throughout: 28/34 bold questions, 20/27 section titles, 16/22 labels, 14–15/22–23 body and 13/19 helper text. Brand red is #ea3f4a; text is #1a1a1a, with #625e59 secondary text. White cards sit on #f9fafb with a quiet #e4e5e7 border, 12px card corners and 8px controls. No decorative art pane, Lottie, grain or serif wizard headings.

The compact header contains the brand, save status and Save & exit. The horizontal progress row contains Place, numbered units and Review, with completed units available to revisit. On narrow screens it scrolls horizontally and brings the current unit into view.

Forms use one centred card, up to 760px wide (920px at Review), with 32px desktop padding and 20px on mobile. Space choices and related fields by 16–24px. Keep Back and the primary action in a fixed bottom action bar, above the safe area and keyboard.

## Screens

- Place type: two roomy apartment/building choices with short explanations.
- Location: labelled address, campus selection and existing map-pin confirmation.
- Utilities: building access followed by the existing utility and amenity controls.
- House rules: the shared rules, with conditional fields appearing next to their choice.
- Building photos: the familiar uploader, clearly optional; Skip for now when empty.
- Layout: rental type, property type and the existing layout/furnishing controls. A building allows whole apartments only.
- Unit photos: the same crop, upload, caption, reorder, cover and retry controls; require 3–15 ready photos.
- Rent: price basis, monthly price, deposit, availability and terms.
- Title and description: labelled writing fields and the existing writing suggestions.
- Add another unit: compact thumbnail/title/rent rows, then Copy and Start blank choices. The primary action goes to Review.
- Review: editable unit rows, one contact form, authoritative per-unit and total credit cost, then Publish or Publish all.
- Success: confirmed result and actual charged total, unit summaries and Your listings.

An existing place displays a small context card and skips every Place screen. Copied units retain unit values and receive a visible ` (copy)` title suffix; their photo gallery starts empty.

## Interaction

Use a subtle 160ms fade between screens, and skip it for reduced motion. Photo entrance/fades also respect reduced motion. Move focus to each new question, retain visible keyboard focus on controls and trap/restore focus in removal confirmation. Actions have at least 44px touch targets. Long content scrolls independently of the progress and actions.

Saving / Saved / Couldn’t save with Retry are the only save states. Show a small reload notice for an external revision change. Preserve entered details and explain how to recover from save, upload, quote and publish errors. Unconfirmed publication stays read-only while its saved request is checked safely.

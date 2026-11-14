Lowered the desktop header progress block by 18px so its tracks align with the centers of Save & exit and Saved. Mobile footer progress is unchanged. The CSS rule is in +html.tsx and the identical rule was applied to the existing local preview HTML; no JavaScript rebuild was needed for this stylesheet-only correction.

The browser checks verify track/control alignment, centered bounded progress, stable Saving/Saved geometry, normal/reduced motion and all question transitions on desktop/mobile. Temporary drafts were removed.

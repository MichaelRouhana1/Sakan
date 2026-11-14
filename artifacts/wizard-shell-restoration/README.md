# Original wizard shell restoration

Reference: saved tag `wizard-cards-v1`, especially `CreateWizardShell.web.tsx`, `CreateWizardShell.shared.tsx`, `CreateFooter.tsx` and `wizardLottieFrame.ts`.

- Original 46% illustration pane on web; 42% native; 30% web Review.
- Original aspect-aware artwork sizing, up to 680px wide / 560px high, replacing the 350x300 cap. Original 240px mobile web art band.
- No vertical divider, contrasting panel, place caption or extra decorative dots.
- Compact Save & exit header, outlined mobile pill and thin progress tracks. Place, Unit 1… and Review stay navigable.
- Saved footer reused with its original desktop and mobile controls. Production save statuses, unit completion, quotes, publishing and retry actions remain connected.

All 14 real-browser acceptance categories passed with 134 screenshots and zero uncaught browser errors. Test listings, places, drafts, uploads, credit spending and account changes were restored by the suite. See `restoration.json` and `acceptance-results.json`.

`index.html` contains the full screenshot gallery. `visual-metrics.json` records the measured illustration width and zero-width divider at desktop/mobile sizes. The repository type check retains 39 existing diagnostics with no new wizard diagnostics. Native exports validate compilation; native device interaction was not tested.

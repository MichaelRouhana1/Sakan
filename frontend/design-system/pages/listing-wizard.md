# Listing Wizard — page overrides

> **PROJECT:** Skoun  
> **Page:** listing create wizard  
> Overrides `frontend/design-system/skoun-web/MASTER.md`. Lister tokens win over generated navy/gold.

---

## Direction lock (frontend-design)

- **Purpose:** Poster publishes a Lebanon student listing without a government-form feel.
- **Tone:** Calm hospitality editorial. Generous negative space, large type, quiet confidence. Refined — not playful-toy, not brutalist, not liquid-glass morphing.
- **Constraints:** Expo RN + web, StyleSheet, Lister ocean `#2F6FED`, DM Sans body. Motion = Reanimated + **per-step Lottie**.
- **Remembered moment:** Airbnb split — left pane is only the looping Lottie on mist; right pane is huge Playfair question + controls.

## Tokens (do not fork)

Use `Lister` from `frontend/constants/listerTheme.ts`.

| Role | Hex |
|------|-----|
| Primary / CTA | `#2F6FED` |
| Ink | `#121826` |
| Muted | `#5B6570` (min contrast) |
| Background | `#EEF1F6` |
| Surface | `#FFFFFF` |
| Mist selected / left pane | `#E8EEF6` |
| Danger | `#B42318` |

**Typography:** Playfair Display 700 for wizard headlines only. DM Sans 400–600 for body/UI. Never Inter, Roboto, Arial, Space Grotesk.

**Liquid Glass from search:** reject full-page morphing blur (perf + contrast). Allow one translucent sticky footer (`surface` 92% + 1px border).

## Layout

- **Web ≥1024:** Full-viewport split. Left ~46% mist + Lottie (no headline). Right ~54% headline + controls. Padding 48.
- **Tablet 768:** same split if width allows.
- **Phone 375:** mist art band (~200–240px) then stacked form, padding 16–24, sticky footer above home indicator.
- Thin 10-tick progress under top chrome. No raw step ids.
- Footer: ghost Back left + compact primary Next right. No scale hover.

## Motion

- Step enter: FadeIn on Lottie, FadeInDown 420ms on form (`Lister.motion`).
- Card select: border + mist fill, 180ms color/border. **No layout-shifting scale.**
- `prefers-reduced-motion` / `useReducedMotion`: freeze Lottie on mid-frame; skip enter.
- **Lottie every step** (looping, branded line-art in `frontend/assets/lottie/wizard/{id}.json`). Remount on step change so it replays.

## Controls

- Selectable cards: 2px primary border when on, mist fill, Ionicons 24, title + one-line helper, `cursor: pointer`.
- Segmented pills for property type / furnishing / price basis.
- Radio cards for gender / poster role.
- Icon grid for amenities (Ionicons, never emoji).
- +/− steppers for counts. Every input labeled.

## Anti-patterns

- Purple gradients, gold CTAs, emoji icons, cookie-cutter onboarding blobs, Inter, scattered micro-interactions, scale-on-press layout jump, tiny milestone Lottie under the form, random mixed-style LottieFiles.

# Studently Campus — DESIGN.md

Campus uses the **same Studently system as Housing** (`listerTheme` / `Studently`). It is a student-tools product, not a second visual brand.

## 1. Visual theme & atmosphere

Calm hospitality on `#F9FAFB`, white surfaces, madder `#EA3F4A`, ink `#1A1A1A`, DM Sans. Same chrome as Find: white nav, neutral hairline, underlined text CTAs. The previous ocean palette stays in `oceanPalette` and can be restored in this browser from admin.

The memorable moment is a **large DM Sans USD total** on a white rounded ledger card — madder selected chips, not inverted black.

Housing stays photo-heavy listings. Campus is the same madder UI with forms and a cost card instead of listing photos.

## 2. Color palette & roles

Use `Studently` / `Lister` tokens. Do not introduce a second paper palette.

| Role | Token | Hex |
|------|--------|-----|
| Page ground | `bg` | `#F9FAFB` |
| Wash / soon chips | `bgWash` | `#E8EAED` |
| Surfaces | `surface` | `#FFFFFF` |
| Muted card | `surfaceMuted` | `#F3F4F6` |
| Ink | `ink` | `#1A1A1A` |
| Muted / faint | `inkMuted` / `inkFaint` | `#5E5A55` / `#8A847C` |
| Border | `border` | `#D9DDE3` |
| Madder | `primary` | `#EA3F4A` |
| Selected wash | `primaryMist` | `#FDECEE` |
| Nav hairline | `bgWash` | `#E8EAED` |

Ocean (`#2F6FED`, ink `#121826`) remains `oceanPalette` for the admin switch. No purple gradients, Playfair, or a second paper ground.

## 3. Typography

| Role | Face | Notes |
|------|------|--------|
| Display / cost | DM Sans 700 | Page titles, ledger total |
| UI / body | DM Sans 400–700 | Nav, labels, breakdown |
| Figures | Tabular lining | Ledger amounts |

No Inter, Roboto, Space Grotesk, or Playfair on Campus screens.

## 4. Component stylings

- **Nav:** Same as `WebTopNav` — white bar, ink wordmark, pill `Campus` mark on `primaryMist`. Text links. `Find a place` is the Housing switch (underline, not a filled pill).
- **Buttons:** Primary = madder fill, white type (`LButton`). Secondary = hairline / mist. Clickable elements `cursor: pointer` on web.
- **Inputs:** Visible labels. Never placeholder-only.
- **Calculator form:** Stacked `CampusFormSelect` dropdowns (university → faculty → program → campus) on one white form card. Selected control uses madder border + `primaryMist`.
- **Cards:** Soft madder mist gradients (`expo-linear-gradient`), `radius.lg`, light shadow. Icon in a white rounded square. Live tools show an arrow affordance — no “Available now” / “Coming” pills. Upcoming tools stay muted without status tags.
- **Home grid:** Two columns from ~900px; single column below. Balanced 2×2, not a lonely fourth card.
- **Term toggle:** `SegmentedPillTrack` (same as Find).
- **Icons:** Ionicons only. No emoji as icons.

## 5. Layout principles

- Max content width follows `WEB_CONTENT_MAX` (1520) with `WEB_CONTENT_PAD_X`.
- Calculator desktop: full shell width, left-aligned form column + sticky ledger (madder mist card surfaces).
- Native: stack form then ledger.

## 6. Depth & elevation

Light listing-card hover shadow on live tool cards (`#121826` at 10%). Ledger is a white bordered card, no heavy clay shadows.

## 7. Do’s and don’ts

**Do**
- Attribute every tuition line with academic year + source.
- Default US-credit load 15, ECTS 30.
- Period toggle: Semester · Year · Full degree (full major credit total).
- Cap AUB billed credits at 15 (official rule) for semester/year only — not full-degree rollups.
- Send housing CTAs to existing `/search?universitySlugs=`.
- Respect `prefers-reduced-motion` / `useReducedMotion`.

**Don’t**
- Mix Campus into Find browse or Hosting chrome.
- Invent unpublished tuition numbers.
- Use claymorphism, bouncing icons, or Playfair.
- Hide empty housing stats — say there are no live rooms yet, keep the CTA.

## 8. Responsive behavior

- 375: single column, nav links collapse to Home / Calculator + Housing switch.
- 768: form + ledger still stack.
- 1024+: two-column calculator.
- Touch targets ≥ 44px on native.

## 9. Agent prompt guide

Studently Campus. Same madder/ink/DM Sans system as Housing. White cards, mist selected chips, madder primary buttons. Honest sources. Separate product chrome — not a second brand.

/**
 * Studently Lister design system.
 * Native ships the madder palette. Web resolves the same keys through
 * `--sk-*` so the admin switch can restore `oceanPalette`.
 */
import { madderPalette } from "./brandPalette";

export { madderPalette, oceanPalette } from "./brandPalette";

export const Lister = {
  color: madderPalette,
  space: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 18,
    xl: 24,
    pill: 999,
  },
  type: {
    display: "DMSans_700Bold",
    displaySerif: "PlayfairDisplay_700Bold",
    displayMedium: "DMSans_600SemiBold",
    body: "DMSans_400Regular",
    bodyMedium: "DMSans_500Medium",
    bodySemi: "DMSans_600SemiBold",
    bodyBold: "DMSans_700Bold",
  },
  motion: {
    enterMs: 420,
    staggerMs: 70,
    pressMs: 120,
  },
} as const;

export type ListerColor = keyof typeof Lister.color;

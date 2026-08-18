/**
 * Skoun Lister design system — calm hospitality, cool bank-blue.
 * Brand: Ocean / cerulean #2F6FED (from bank UI reference — not jade, not neon cyan).
 * Campus / secondary accent uses deep navy (no brass/gold). Typography: DM Sans.
 */
export const Lister = {
  color: {
    /** Ocean / cerulean — primary brand (links, icons, interactive accents) */
    primary: "#2F6FED",
    /** Deep navy — headers, strong nav mark, high-contrast text-on-light */
    primaryDeep: "#121826",
    /** Soft blue frost — mid washes / soft chip fills */
    primarySoft: "#A8C4F0",
    /** Misty blue diluted — light accents, calm selected washes */
    primaryMist: "#E8EEF6",
    /**
     * Secondary accent (campus marks, draft chips). Cool navy — not brass/gold.
     * Kept as `brass` key for call-site compatibility.
     */
    brass: "#121826",
    brassSoft: "#E8EEF6",
    /** Charcoal-navy ink (tuned for contrast on cool wash) */
    ink: "#121826",
    inkMuted: "#5B6570",
    inkFaint: "#8B95A1",
    /** Pale cool blue-gray — calm screen ground */
    bg: "#EEF1F6",
    bgWash: "#E2E8F0",
    surface: "#FFFFFF",
    surfaceMuted: "#F5F7FA",
    border: "#C5CDD8",
    borderStrong: "#9AA6B5",
    active: "#2F6FED",
    draft: "#5B6570",
    archived: "#6B7280",
    removed: "#9B2C2C",
    danger: "#B42318",
    dangerSoft: "#FEE4E2",
    success: "#2F6FED",
    warning: "#B45309",
    warningSoft: "#FEF3C7",
    overlay: "rgba(18, 24, 38, 0.45)",
  },
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

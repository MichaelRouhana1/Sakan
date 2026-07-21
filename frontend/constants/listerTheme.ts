/**
 * Skoun Lister design system — Mediterranean hospitality, cool jade / stone-mint.
 * Brand: Jade Glaze #4FB79F (not forest pine, not neon emerald).
 * Campus cues stay brass. Typography: DM Sans throughout.
 */
export const Lister = {
  color: {
    /** Jade Glaze — primary brand */
    primary: "#4FB79F",
    /** Jade Dragon — text on soft fills, pressed, headers on mint */
    primaryDeep: "#02675C",
    /** Jade Frost — mid washes / soft chip fills */
    primarySoft: "#95C4B8",
    /** Misty Jade diluted — light accents, calm selected washes */
    primaryMist: "#D8F0E9",
    brass: "#B8954A",
    brassSoft: "#F3EBD6",
    ink: "#14241E",
    inkMuted: "#5A6B64",
    inkFaint: "#8A9A93",
    /** Jade Mist diluted — calm screen ground (not a loud mint slab) */
    bg: "#EAF6F0",
    bgWash: "#DCEFE6",
    surface: "#FFFFFF",
    surfaceMuted: "#F4FAF7",
    border: "#C9D6CF",
    borderStrong: "#A8BBB2",
    active: "#4FB79F",
    draft: "#8B7355",
    archived: "#6B7280",
    removed: "#9B2C2C",
    danger: "#B42318",
    dangerSoft: "#FEE4E2",
    success: "#4FB79F",
    warning: "#B45309",
    warningSoft: "#FEF3C7",
    overlay: "rgba(20, 36, 30, 0.45)",
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

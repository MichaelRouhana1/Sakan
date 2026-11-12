/**
 * Brand palettes. `oceanPalette` is the previous website, frozen.
 * `madderPalette` is the default. Web paints whichever is on
 * `documentElement[data-palette]` via `--sk-*` variables.
 */

export const BRAND_PALETTE_KEY = "studently-brand-palette";
export const BRAND_PALETTE_EVENT = "studently-palette";

export type BrandPaletteId = "madder" | "ocean";

export const oceanPalette = {
  primary: "#2F6FED",
  /** Pressed / hover fill. The previous WhatsApp hover. */
  primaryPressed: "#1E5BD6",
  primaryDeep: "#121826",
  primarySoft: "#A8C4F0",
  primaryMist: "#E8EEF6",
  brass: "#121826",
  brassSoft: "#E8EEF6",
  ink: "#121826",
  inkMuted: "#5B6570",
  inkFaint: "#8B95A1",
  bg: "#F9FAFB",
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
} as const;

export const madderPalette = {
  primary: "#EA3F4A",
  /** #EA3F4A mixed 82% with black. */
  primaryPressed: "#C0343D",
  primaryDeep: "#1A1A1A",
  primarySoft: "#F7B7BC",
  primaryMist: "#FDECEE",
  brass: "#1A1A1A",
  brassSoft: "#FDECEE",
  ink: "#1A1A1A",
  inkMuted: "#5E5A55",
  inkFaint: "#8A847C",
  bg: "#F9FAFB",
  bgWash: "#E8EAED",
  surface: "#FFFFFF",
  surfaceMuted: "#F3F4F6",
  border: "#D9DDE3",
  borderStrong: "#9AA0A8",
  active: "#EA3F4A",
  draft: "#5B6570",
  archived: "#6B7280",
  removed: "#9B2C2C",
  danger: "#B42318",
  dangerSoft: "#FEE4E2",
  success: "#1A1A1A",
  warning: "#B45309",
  warningSoft: "#FEF3C7",
  overlay: "rgba(26, 26, 26, 0.45)",
} as const;

export type BrandColor = keyof typeof oceanPalette;

const SK_VAR: Record<BrandColor, string> = {
  primary: "--sk-primary",
  primaryPressed: "--sk-primary-pressed",
  primaryDeep: "--sk-primary-deep",
  primarySoft: "--sk-primary-soft",
  primaryMist: "--sk-primary-mist",
  brass: "--sk-brass",
  brassSoft: "--sk-brass-soft",
  ink: "--sk-ink",
  inkMuted: "--sk-muted",
  inkFaint: "--sk-faint",
  bg: "--sk-bg",
  bgWash: "--sk-bg-wash",
  surface: "--sk-surface",
  surfaceMuted: "--sk-surface-muted",
  border: "--sk-border",
  borderStrong: "--sk-border-strong",
  active: "--sk-active",
  draft: "--sk-draft",
  archived: "--sk-archived",
  removed: "--sk-removed",
  danger: "--sk-danger",
  dangerSoft: "--sk-danger-soft",
  success: "--sk-success",
  warning: "--sk-warning",
  warningSoft: "--sk-warning-soft",
  overlay: "--sk-overlay",
};

/** Web Studently colors. The browser resolves these from the active palette. */
export const webColorVars = Object.fromEntries(
  (Object.keys(SK_VAR) as BrandColor[]).map((key) => [key, `var(${SK_VAR[key]})`]),
) as { [K in BrandColor]: string };

function paletteBlock(selector: string, palette: Record<BrandColor, string>): string {
  const lines = (Object.keys(SK_VAR) as BrandColor[])
    .map((key) => `  ${SK_VAR[key]}: ${palette[key]};`)
    .join("\n");
  return `${selector} {\n${lines}\n}`;
}

const MADDER_ORB_TINT =
  "brightness(0) saturate(100%) invert(15%) sepia(63%) saturate(4265%) hue-rotate(339deg) brightness(92%) contrast(93%)";
const OCEAN_ORB_TINT =
  "brightness(0) invert(48%) sepia(25.5%) saturate(2500%) hue-rotate(181.4deg) brightness(77.1%) contrast(77.3%)";

/** Default madder, with ocean restored when the admin switch sets data-palette. */
export const brandPaletteCss = `
${paletteBlock(":root", madderPalette)}
:root { --sk-orb-tint: ${MADDER_ORB_TINT}; }
${paletteBlock(':root[data-palette="ocean"]', oceanPalette)}
:root[data-palette="ocean"] { --sk-orb-tint: ${OCEAN_ORB_TINT}; }
`;

export function readStoredBrandPalette(): BrandPaletteId {
  if (typeof window === "undefined") return "madder";
  try {
    const raw = window.localStorage.getItem(BRAND_PALETTE_KEY);
    if (raw === "ocean" || raw === "madder") return raw;
  } catch {
    /* ignore */
  }
  return "madder";
}

export function applyBrandPalette(id: BrandPaletteId) {
  if (typeof document === "undefined") return;
  try {
    window.localStorage.setItem(BRAND_PALETTE_KEY, id);
  } catch {
    /* ignore */
  }
  if (id === "ocean") document.documentElement.setAttribute("data-palette", "ocean");
  else document.documentElement.removeAttribute("data-palette");
  window.dispatchEvent(new CustomEvent(BRAND_PALETTE_EVENT, { detail: id }));
}

/** Resolved hex/rgba for canvas and Mapbox, which cannot paint `var(...)`. */
export function readSkColor(key: BrandColor): string {
  const fallback = madderPalette[key];
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(SK_VAR[key])
    .trim();
  return raw || fallback;
}

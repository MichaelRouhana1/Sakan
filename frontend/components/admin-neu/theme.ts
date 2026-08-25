export type AdminTheme = "light" | "dark";

export const ADMIN_THEME_KEY = "skoun-admin-theme";

/** Lucide / SVG muted ink — tracks clay-500 across themes. */
export const ADMIN_MUTED = "var(--admin-clay-500)";

export const ADMIN_CHART = {
  moss: "var(--admin-moss)",
  ochre: "var(--admin-ochre)",
  ember: "var(--admin-ember)",
  grid: "var(--admin-chart-grid)",
  axis: "var(--admin-chart-axis)",
  guide: "var(--admin-chart-guide)",
  markerStroke: "var(--admin-chart-marker-stroke)",
  mossFill: "color-mix(in srgb, var(--admin-moss) 16%, transparent)",
  emberFill: "color-mix(in srgb, var(--admin-ember) 16%, transparent)",
} as const;

export function readStoredTheme(): AdminTheme {
  if (typeof window === "undefined") return "light";
  try {
    const raw = window.localStorage.getItem(ADMIN_THEME_KEY);
    if (raw === "dark" || raw === "light") return raw;
  } catch {
    /* ignore */
  }
  if (typeof window.matchMedia === "function") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
}

export function storeTheme(theme: AdminTheme) {
  try {
    window.localStorage.setItem(ADMIN_THEME_KEY, theme);
  } catch {
    /* ignore */
  }
}

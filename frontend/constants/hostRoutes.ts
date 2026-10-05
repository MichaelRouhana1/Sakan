/** Public web URL for the host listings dashboard (desktop). */
export const HOST_LISTINGS_PATH = "/hosting/listing";

/** Public web URL to buy / top up listing credits. */
export const HOST_CREDITS_PATH = "/hosting/credits";

/** Public web URL for host portfolio analytics. */
export const HOST_ANALYTICS_PATH = "/hosting/analytics";

/** Native poster tab for host portfolio analytics. */
export const POSTER_ANALYTICS_TAB = "/(poster)/(tabs)/analytics";

/** Public web URL for one listing's analytics. */
export function hostListingAnalyticsPath(id: string) {
  return `/hosting/listing/${id}/analytics`;
}

/** Native stack screen for one listing's analytics. */
export function posterListingAnalyticsPath(id: string) {
  return `/(poster)/analytics/${id}`;
}

export type HostEditSection = "photos" | "pricing" | "location";

const HOST_EDIT_SECTIONS = new Set<string>(["photos", "pricing", "location"]);

export function hostEditSection(value: string | null | undefined): HostEditSection | null {
  if (value && HOST_EDIT_SECTIONS.has(value)) return value as HostEditSection;
  return null;
}

/** Opens the live-edit drawer on the host listings page. */
export function hostListingEditPath(id: string, section?: HostEditSection | null) {
  const params = new URLSearchParams({ edit: id });
  if (section) params.set("section", section);
  return `${HOST_LISTINGS_PATH}?${params.toString()}`;
}

/** Boost pack on the credits screen. Buying it does not pin a listing by itself. */
export function hostBoostPurchasePath() {
  return `${HOST_CREDITS_PATH}?pack=boost_pack`;
}

export type HostNavSection = "listings" | "analytics" | "credits";

function stripTrailingSlash(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.replace(/\/+$/, "");
  }
  return pathname;
}

/** Per-listing analytics drill-in: `/hosting/listing/:id/analytics`. */
export function isHostListingAnalyticsPath(pathname: string): boolean {
  return /^\/hosting\/listing\/[^/]+\/analytics\/?$/.test(pathname);
}

/** Which host side-nav section is active for this pathname. */
export function hostNavSection(pathname: string): HostNavSection | null {
  const path = stripTrailingSlash(pathname);
  if (path === HOST_CREDITS_PATH || path.startsWith(`${HOST_CREDITS_PATH}/`)) {
    return "credits";
  }
  if (
    path === HOST_ANALYTICS_PATH ||
    path.startsWith(`${HOST_ANALYTICS_PATH}/`) ||
    isHostListingAnalyticsPath(path)
  ) {
    return "analytics";
  }
  if (path === HOST_LISTINGS_PATH || path.startsWith(`${HOST_LISTINGS_PATH}/`)) {
    return "listings";
  }
  return null;
}

/**
 * Shared web content width — Find browse, top nav, footer, shell.
 * Midway between cramped gutters (1680+) and oversized side margins (1360).
 */
export const WEB_CONTENT_MAX = 1520;
export const WEB_CONTENT_PAD_X = 24;

/** Approximate sticky offsets for document scroll (nav + filter bar). */
export const WEB_NAV_STICKY_TOP = 0;
export const WEB_NAV_HEIGHT = 64;
export const WEB_FILTER_BAR_STICKY_TOP = WEB_NAV_HEIGHT;
/** Nav (~64) + filter bar (~56) + breathing room under chrome. */
export const WEB_SIDEBAR_STICKY_TOP = 140;

/**
 * Shared web content width — Find browse, top nav, footer, shell.
 * Midway between cramped gutters (1680+) and oversized side margins (1360).
 */
export const WEB_CONTENT_MAX = 1600;
export const WEB_CONTENT_PAD_X = 32;

/**
 * Sticky chrome metrics. Keep nav height in sync with FindFilterBar `top`.
 * Nav uses minHeight = WEB_NAV_HEIGHT so sticky offset stays stable.
 */
export const WEB_NAV_STICKY_TOP = 0;
export const WEB_NAV_HEIGHT = 76;
export const WEB_FILTER_BAR_STICKY_TOP = WEB_NAV_HEIGHT;
/** Nav (~76) + filter bar (~64) + breathing room under chrome. */
export const WEB_SIDEBAR_STICKY_TOP = 152;

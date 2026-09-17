/** Public web URL for the host listings dashboard (desktop). */
export const HOST_LISTINGS_PATH = "/hosting/listing";

/** Public web URL to buy / top up listing credits. */
export const HOST_CREDITS_PATH = "/hosting/credits";

/** Public web URL for host portfolio analytics. */
export const HOST_ANALYTICS_PATH = "/hosting/analytics";

/** Public web URL for one listing's analytics. */
export function hostListingAnalyticsPath(id: string) {
  return `/hosting/listing/${id}/analytics`;
}

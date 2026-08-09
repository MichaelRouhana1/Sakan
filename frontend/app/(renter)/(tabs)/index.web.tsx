import { Redirect } from "expo-router";

/**
 * `(renter)/(tabs)` also maps to `/`, which collides with the marketing home.
 * Send web browse traffic to the dedicated `/search` URL.
 */
export default function RenterTabsIndexWeb() {
  return <Redirect href="/search" />;
}

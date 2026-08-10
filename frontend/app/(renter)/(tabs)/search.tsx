import { Redirect } from "expo-router";

/**
 * Native fallback for `search.web.tsx` (Expo requires a non-platform sibling).
 * Mobile Search lives on the tab index route.
 */
export default function SearchNativeFallback() {
  return <Redirect href="/(renter)/(tabs)" />;
}

import { Slot } from "expo-router";

/** Web-only layout for `(explore)` group — pass through without React Navigation Stack wrapper. */
export default function ExploreWebLayout() {
  return <Slot />;
}

import { Slot } from "expo-router";

/** Web-only layout for `(poster)/(tabs)` group — pass through without React Navigation Stack wrapper. */
export default function PosterTabsWebLayout() {
  return <Slot />;
}

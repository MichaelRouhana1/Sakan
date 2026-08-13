import { Slot } from "expo-router";

/** Web-only layout for `(poster)` group — pass through without React Navigation Stack wrapper. */
export default function PosterWebLayout() {
  return <Slot />;
}

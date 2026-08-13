import { Slot } from "expo-router";

/** Web-only layout for `(renter)` group — pass through without React Navigation Stack wrapper. */
export default function RenterWebLayout() {
  return <Slot />;
}

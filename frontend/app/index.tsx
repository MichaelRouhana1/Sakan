import { Redirect } from "expo-router";

/** App entry — guest browse in renter shell; sign in via modal when needed. */
export default function Index() {
  return <Redirect href={"/(renter)" as never} />;
}

import { Redirect } from "expo-router";

/**
 * Entry redirect — OTP/auth not wired yet.
 * Default into auth phone screen; role groups take over after role-select.
 */
export default function Index() {
  return <Redirect href="/(auth)/phone" />;
}

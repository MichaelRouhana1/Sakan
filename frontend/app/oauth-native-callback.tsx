import { Redirect } from "expo-router";

/** Clerk / Expo OAuth return URL. Session is completed by startOAuthFlow. */
export default function OAuthNativeCallback() {
  return <Redirect href="/" />;
}

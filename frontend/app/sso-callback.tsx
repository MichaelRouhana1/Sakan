import { AuthenticateWithRedirectCallback } from "@clerk/expo";

export default function SSOCallback() {
  return <AuthenticateWithRedirectCallback />;
}

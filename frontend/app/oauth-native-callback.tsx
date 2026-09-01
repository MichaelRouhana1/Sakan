import { useClerk } from "@clerk/expo";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";

import {
  completeOAuthRedirectIfPresent,
  consumeOAuthReturnTo,
} from "@/lib/clerkAuth";
import { useClerkEnabled } from "@/lib/clerkEnabled";

/** Clerk / Expo OAuth return URL. */
export default function OAuthNativeCallback() {
  const clerkEnabled = useClerkEnabled();

  if (Platform.OS !== "web" || !clerkEnabled) {
    return <Redirect href="/" />;
  }

  return <OAuthNativeCallbackWeb />;
}

function OAuthNativeCallbackWeb() {
  const clerk = useClerk();
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!clerk.loaded) return;

    let cancelled = false;
    (async () => {
      try {
        await completeOAuthRedirectIfPresent(clerk);
      } catch (err) {
        console.error("OAuth callback error:", err);
      } finally {
        if (cancelled) return;
        const next = consumeOAuthReturnTo();
        window.location.replace(next);
        setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clerk, clerk.loaded]);

  if (!busy) return null;

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
      }}
    >
      <ActivityIndicator color="#18181B" />
    </View>
  );
}

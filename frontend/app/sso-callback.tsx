import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AuthenticateWithRedirectCallback, useClerk } from "@clerk/expo";
import { useRouter } from "expo-router";

export default function SSOCallbackScreen() {
  const clerk = useClerk();
  const router = useRouter();

  useEffect(() => {
    // Fallback if AuthenticateWithRedirectCallback is not an exported React component in @clerk/expo
    if (!AuthenticateWithRedirectCallback && clerk && typeof clerk.handleRedirectCallback === "function") {
      clerk
        .handleRedirectCallback({
          afterSignInUrl: "/",
          afterSignUpUrl: "/",
        })
        .then(() => {
          router.replace("/");
        })
        .catch((err) => {
          console.error("SSO Callback error:", err);
          router.replace("/");
        });
    }
  }, [clerk, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563EB" />
      <Text style={styles.text}>Completing sign in...</Text>
      {AuthenticateWithRedirectCallback ? (
        <AuthenticateWithRedirectCallback signInForceRedirectUrl="/" signUpForceRedirectUrl="/" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 16,
  },
});

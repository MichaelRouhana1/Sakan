import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useClerk } from "@clerk/expo";
import { useRouter } from "expo-router";

export default function SSOCallbackScreen() {
  const clerk = useClerk();
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      try {
        if (clerk && typeof clerk.handleRedirectCallback === "function") {
          await clerk.handleRedirectCallback({
            afterSignInUrl: "/",
            afterSignUpUrl: "/",
          });
        }
      } catch (err) {
        console.error("SSO Callback error:", err);
      } finally {
        router.replace("/");
      }
    }

    handleCallback();
  }, [clerk, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563EB" />
      <Text style={styles.text}>Completing sign in...</Text>
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

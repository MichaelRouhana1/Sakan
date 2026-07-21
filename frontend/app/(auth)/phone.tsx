import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";

/**
 * Auth shell only — WhatsApp/SMS OTP not wired yet.
 * Continue skips phone capture until the provider is integrated.
 */
export default function PhoneScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>
      <Text style={styles.sub}>
        Phone verification is not connected yet. Continue to pick a role.
      </Text>
      <Button
        label="Continue"
        onPress={() => router.push("/(auth)/otp")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  sub: {
    color: "#666",
    marginBottom: 8,
  },
});

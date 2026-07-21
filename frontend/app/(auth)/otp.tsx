import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";

/**
 * OTP shell only — no provider sends codes yet.
 * Verify skips ahead to role selection for local development.
 */
export default function OtpScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify</Text>
      <Text style={styles.sub}>
        Code entry is disabled until OTP is wired. Tap Verify to continue.
      </Text>
      <Button
        label="Verify"
        onPress={() => router.push("/(auth)/role-select")}
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

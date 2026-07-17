import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone?: string }>();
  const [otp, setOtp] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter verification code</Text>
      <Text style={styles.sub}>Sent to {phone ?? "your phone"}</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        placeholder="••••••"
        maxLength={6}
        value={otp}
        onChangeText={setOtp}
      />
      <Button
        label="Verify"
        disabled={otp.length < 4}
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
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  sub: {
    color: "#666",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 14,
    fontSize: 22,
    letterSpacing: 8,
    marginBottom: 8,
  },
});

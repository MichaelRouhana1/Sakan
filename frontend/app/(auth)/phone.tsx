import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";

export default function PhoneScreen() {
  const [phone, setPhone] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter your mobile number</Text>
      <Text style={styles.sub}>WhatsApp OTP preferred (Lebanon)</Text>
      <TextInput
        style={styles.input}
        keyboardType="phone-pad"
        placeholder="+961…"
        value={phone}
        onChangeText={setPhone}
        autoFocus
      />
      <Button
        label="Continue"
        disabled={phone.trim().length < 8}
        onPress={() =>
          router.push({ pathname: "/(auth)/otp", params: { phone } })
        }
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
    fontSize: 18,
    marginBottom: 8,
  },
});

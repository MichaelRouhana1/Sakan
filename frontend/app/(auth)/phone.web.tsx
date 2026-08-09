import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { LButton } from "@/components/lister/Button";
import { LText } from "@/components/lister/Typography";
import { WebShell } from "@/components/web/WebShell";
import { Skoun } from "@/constants/theme";

export default function PhoneWebScreen() {
  return (
    <WebShell showFooter={false}>
      <View style={styles.page}>
        <LText variant="display" style={styles.title}>
          Sign in
        </LText>
        <LText variant="body" tone="muted" style={styles.sub}>
          Phone verification is not connected yet. Continue to pick a role, or
          browse listings without signing in.
        </LText>
        <View style={styles.actions}>
          <LButton
            label="Continue"
            onPress={() => router.push("/(auth)/otp")}
          />
          <LButton
            label="Browse listings"
            variant="secondary"
            onPress={() => router.replace("/search" as never)}
          />
        </View>
      </View>
    </WebShell>
  );
}

const styles = StyleSheet.create({
  page: {
    maxWidth: 480,
    alignSelf: "center",
    width: "100%",
    paddingVertical: 48,
    gap: 16,
  },
  title: {
    fontSize: 32,
    color: Skoun.color.primaryDeep,
  },
  sub: {
    lineHeight: 22,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
});

import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { LButton } from "@/components/lister/Button";
import { LText } from "@/components/lister/Typography";
import { WebShell } from "@/components/web/WebShell";
import { Skoun } from "@/constants/theme";

export default function OtpWebScreen() {
  return (
    <WebShell showFooter={false}>
      <View style={styles.page}>
        <LText variant="display" style={styles.title}>
          Verify
        </LText>
        <LText variant="body" tone="muted" style={styles.sub}>
          Code entry is disabled until OTP is wired. Tap Verify to choose your
          role.
        </LText>
        <LButton
          label="Verify"
          onPress={() => router.push("/(auth)/role-select")}
          style={styles.cta}
        />
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
  cta: {
    marginTop: 8,
    alignSelf: "flex-start",
    minWidth: 160,
  },
});

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { LButton } from "@/components/lister/Button";
import { LText } from "@/components/lister/Typography";
import { WebShell } from "@/components/web/WebShell";
import { Skoun } from "@/constants/theme";

/** Roommates is mobile-only — gentle redirect on web. */
export default function RoommatesWebStub() {
  return (
    <WebShell>
      <View style={styles.wrap}>
        <View style={styles.icon}>
          <Ionicons name="phone-portrait-outline" size={36} color={Skoun.color.primary} />
        </View>
        <LText variant="title" style={styles.title}>
          Roommates on Skoun mobile
        </LText>
        <LText variant="body" tone="muted" style={styles.message}>
          Find-a-roommate matching is available in the Skoun app. Browse and save
          listings here on the web.
        </LText>
        <LButton
          label="Back to Find"
          variant="primary"
          onPress={() => router.replace("/(renter)/(tabs)" as never)}
        />
      </View>
    </WebShell>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 24,
    maxWidth: 420,
    alignSelf: "center",
    gap: 12,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Skoun.color.primaryMist,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    textAlign: "center",
  },
  message: {
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 12,
  },
});

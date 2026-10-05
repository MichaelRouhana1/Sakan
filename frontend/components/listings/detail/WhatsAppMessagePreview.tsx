import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { useColorScheme } from "@/components/useColorScheme";

export function WhatsAppMessagePreview({ message }: { message: string }) {
  const dark = useColorScheme() === "dark";
  const palette = dark
    ? { bg: "#111B21", bubble: "#005C4B", text: "#E9EDEF", check: "#B6CEC7" }
    : { bg: "#EFEAE2", bubble: "#D9FDD3", text: "#17251F", check: "#496855" };

  return (
    <View testID="whatsapp-message-preview" style={[styles.chat, { backgroundColor: palette.bg }]}>
      <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={StyleSheet.absoluteFill}>
        <Image
          source={require("@/assets/images/whatsapp-chat-wallpaper.png")}
          contentFit="cover"
          accessible={false}
          style={[StyleSheet.absoluteFill, { opacity: dark ? 0.22 : 1 }]}
        />
      </View>
      <View style={[styles.bubble, { backgroundColor: palette.bubble }]}>
        <View accessible={false} aria-hidden style={[styles.tail, { borderTopColor: palette.bubble }]} />
        <LText testID="whatsapp-preview-text" style={[styles.message, { color: palette.text }]}>{message}</LText>
        <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={styles.checks}>
          <Ionicons name="checkmark-done-outline" size={17} color={palette.check} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chat: { padding: 18, paddingLeft: 28, borderRadius: 14, overflow: "hidden", minHeight: 180 },
  bubble: { alignSelf: "flex-end", maxWidth: "100%", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, borderRadius: 12, borderTopRightRadius: 0 },
  tail: { position: "absolute", right: -7, top: 0, width: 0, height: 0, borderTopWidth: 9, borderRightWidth: 8, borderRightColor: "transparent" },
  message: { fontSize: 14, lineHeight: 21, flexShrink: 1 },
  checks: { alignSelf: "flex-end", marginTop: 4 },
});

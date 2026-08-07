import { Link } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";

export function WebFooter() {
  return (
    <View style={styles.footer}>
      <View style={styles.inner}>
        <View style={styles.brandCol}>
          <LText variant="subtitle" style={styles.brand}>
            Skoun
          </LText>
          <LText variant="caption" tone="muted" style={styles.tagline}>
            Student housing classifieds for Lebanon — browse rooms, message
            posters on WhatsApp.
          </LText>
        </View>
        <View style={styles.links}>
          <Link href="/(renter)/(tabs)" asChild>
            <Pressable accessibilityRole="link">
              <LText variant="caption" style={styles.link}>
                Find a room
              </LText>
            </Pressable>
          </Link>
          <Link href="/(renter)/(tabs)/saved" asChild>
            <Pressable accessibilityRole="link">
              <LText variant="caption" style={styles.link}>
                Saved
              </LText>
            </Pressable>
          </Link>
          <Link href="/(poster)/(tabs)/create" asChild>
            <Pressable accessibilityRole="link">
              <LText variant="caption" style={styles.link}>
                List a room
              </LText>
            </Pressable>
          </Link>
        </View>
      </View>
      <View style={styles.bottom}>
        <LText variant="caption" tone="faint">
          © {new Date().getFullYear()} Skoun · Lebanon
        </LText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    marginTop: 48,
    borderTopWidth: 1,
    borderTopColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
  },
  inner: {
    maxWidth: 1360,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 32,
    flexWrap: "wrap",
  },
  brandCol: {
    maxWidth: 360,
    gap: 8,
  },
  brand: {
    color: Skoun.color.primaryDeep,
    fontSize: 18,
  },
  tagline: {
    lineHeight: 20,
  },
  links: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    alignItems: "center",
  },
  link: {
    color: Skoun.color.ink,
    fontFamily: Skoun.type.bodyMedium,
  },
  bottom: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Skoun.color.border,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
  },
});

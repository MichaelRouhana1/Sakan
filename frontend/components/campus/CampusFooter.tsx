import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import { WEB_CONTENT_MAX, WEB_CONTENT_PAD_X } from "@/constants/webLayout";

export function CampusFooter() {
  return (
    <View style={styles.footer}>
      <View style={styles.inner}>
        <View style={styles.brandCol}>
          <LText variant="subtitle" style={styles.brand}>
            Skoun
          </LText>
          <LText variant="caption" tone="muted" style={styles.tagline}>
            Student tools for private universities in Lebanon — tuition
            estimates, then rooms near campus.
          </LText>
        </View>
        <View style={styles.links}>
          <Link href={"/campus/calculator" as Href} asChild>
            <Pressable accessibilityRole="link">
              <LText variant="caption" style={styles.link}>
                Tuition calculator
              </LText>
            </Pressable>
          </Link>
          <Link href="/search" asChild>
            <Pressable accessibilityRole="link">
              <LText variant="caption" style={styles.link}>
                Find a room
              </LText>
            </Pressable>
          </Link>
        </View>
      </View>
      <View style={styles.bottom}>
        <LText variant="caption" tone="faint">
          © {new Date().getFullYear()} Skoun · Lebanon · Estimates are not
          invoices
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
    maxWidth: WEB_CONTENT_MAX,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: WEB_CONTENT_PAD_X,
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

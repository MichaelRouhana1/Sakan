import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { Lister } from "@/constants/listerTheme";
import { LButton } from "./Button";
import { LText } from "./Typography";

type Props = {
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
};

/**
 * Empty feed illustration — layered Skoun shapes + Ionicons (no emoji).
 * Keeps title / body / optional CTA API.
 */
export function EmptyState({
  title,
  body,
  ctaLabel,
  onCta,
  icon = "home-outline",
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.art} accessibilityElementsHidden>
        <View style={styles.blobWash} />
        <View style={styles.blobBrass} />
        <View style={styles.frame}>
          <View style={styles.frameInner}>
            <Ionicons name={icon} size={34} color={Lister.color.primary} />
          </View>
          <View style={styles.dotA} />
          <View style={styles.dotB} />
          <View style={styles.bar} />
        </View>
      </View>
      <LText variant="subtitle" style={styles.title}>
        {title}
      </LText>
      <LText variant="body" tone="muted" style={styles.body}>
        {body}
      </LText>
      {ctaLabel && onCta ? (
        <LButton label={ctaLabel} onPress={onCta} style={styles.cta} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: Lister.space.xxl,
    paddingHorizontal: Lister.space.lg,
    gap: 10,
  },
  art: {
    width: 168,
    height: 132,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  blobWash: {
    position: "absolute",
    width: 128,
    height: 88,
    borderRadius: 44,
    backgroundColor: Lister.color.primaryMist,
    top: 18,
    transform: [{ rotate: "-8deg" }],
  },
  blobBrass: {
    position: "absolute",
    width: 72,
    height: 56,
    borderRadius: 28,
    backgroundColor: Lister.color.brassSoft,
    borderWidth: 1,
    borderColor: "rgba(184,149,74,0.35)",
    right: 12,
    top: 8,
    transform: [{ rotate: "12deg" }],
  },
  frame: {
    width: 96,
    height: 96,
    borderRadius: Lister.radius.xl,
    backgroundColor: Lister.color.surface,
    borderWidth: 1.5,
    borderColor: Lister.color.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#14241E",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  frameInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Lister.color.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Lister.color.primaryMist,
  },
  dotA: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Lister.color.brass,
  },
  dotB: {
    position: "absolute",
    bottom: 18,
    left: 12,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Lister.color.primary,
    opacity: 0.55,
  },
  bar: {
    position: "absolute",
    bottom: 12,
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Lister.color.borderStrong,
  },
  title: {
    textAlign: "center",
    fontFamily: Lister.type.bodyBold,
  },
  body: {
    textAlign: "center",
    maxWidth: 300,
  },
  cta: {
    marginTop: 12,
    minWidth: 220,
  },
});

import { Pressable, StyleSheet, Text, View } from "react-native";
import { Skoun } from "@/constants/theme";

export function PopularPackBeam({
  children,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return <View style={styles.frame}>{children}</View>;
}

export function PopularBadge() {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>Popular</Text>
    </View>
  );
}

export function WhishPayButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.cta, disabled && styles.ctaDisabled]}
    >
      <Text style={styles.ctaText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    flexGrow: 1,
    flexBasis: 280,
    maxWidth: 380,
    minWidth: 260,
    alignSelf: "stretch",
  },
  badge: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  badgeText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 11,
    letterSpacing: 0.4,
    color: Skoun.color.ink,
  },
  cta: {
    marginTop: 8,
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDDDDD",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  ctaDisabled: {
    opacity: 0.55,
  },
  ctaText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: Skoun.color.ink,
  },
});

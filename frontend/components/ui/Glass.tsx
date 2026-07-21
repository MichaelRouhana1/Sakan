import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Skoun } from "@/constants/theme";

/** True on iPhone / iPad — native UIVisualEffectView via expo-blur. */
export const isAppleGlass = Platform.OS === "ios";

type Intensity = "soft" | "regular" | "chrome";

const INTENSITY: Record<Intensity, number> = {
  soft: 45,
  regular: 72,
  chrome: 95,
};

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: Intensity;
  /** Extra translucent wash over the blur */
  tintColor?: string;
};

/**
 * Frosted glass on Apple devices; solid surface fallback elsewhere.
 */
export function GlassSurface({
  children,
  style,
  intensity = "regular",
  tintColor = "rgba(255,255,255,0.38)",
}: Props) {
  if (!isAppleGlass) {
    return <View style={[styles.fallback, style]}>{children}</View>;
  }

  return (
    <BlurView
      intensity={INTENSITY[intensity]}
      tint="systemUltraThinMaterialLight"
      style={[styles.glass, style]}
    >
      <View pointerEvents="none" style={[styles.wash, { backgroundColor: tintColor }]} />
      <View style={styles.content}>{children}</View>
    </BlurView>
  );
}

/** Absolute-fill glass for tab bars / sticky chrome. */
export function GlassChrome({ intensity = "chrome" as Intensity }) {
  if (!isAppleGlass) {
    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: Skoun.color.surface },
        ]}
      />
    );
  }

  return (
    <BlurView
      intensity={INTENSITY[intensity]}
      tint="systemChromeMaterialLight"
      style={StyleSheet.absoluteFill}
    >
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(242,245,243,0.28)" },
        ]}
      />
    </BlurView>
  );
}

export const appleTabBarStyle = isAppleGlass
  ? ({
      position: "absolute" as const,
      backgroundColor: "transparent",
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "rgba(201,214,207,0.45)",
      elevation: 0,
      height: 64,
      paddingTop: 6,
      paddingBottom: 8,
    } as const)
  : ({
      backgroundColor: Skoun.color.surface,
      borderTopColor: Skoun.color.border,
      height: 64,
      paddingTop: 6,
      paddingBottom: 8,
    } as const);

/** Bottom inset so scroll content clears the native / glass tab bar. */
export const appleTabScrollInset = isAppleGlass ? 96 : 80;

const styles = StyleSheet.create({
  glass: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.65)",
    backgroundColor: "transparent",
  },
  wash: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    position: "relative",
    zIndex: 1,
  },
  fallback: {
    backgroundColor: Skoun.color.surface,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
});

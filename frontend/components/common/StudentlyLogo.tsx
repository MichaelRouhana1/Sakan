import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

type Props = {
  size?: number;
  /** Select from the actual backing surface; OS dark mode can still have white cards. */
  tone?: "color" | "white";
  style?: StyleProp<ViewStyle>;
};

/**
 * Approved logo-system artwork. The 16px cut uses one solid window.
 */
export function StudentlyLogo({ size = 32, tone = "color", style }: Props) {
  const source = size < 32
    ? tone === "white"
      ? size <= 16 ? require("../../assets/images/brand/small-knockout-white-16.png") : require("../../assets/images/brand/small-knockout-white-64.png")
      : size <= 16 ? require("../../assets/images/brand/small-color-16.png") : require("../../assets/images/brand/small-color-64.png")
    : tone === "white"
      ? require("../../assets/images/brand/knockout-white.png")
      : require("../../assets/images/splash-icon.png");
  return (
    <View style={[{ width: size, height: size, flexShrink: 0 }, style]}>
      <Image
        source={source}
        style={styles.img}
        resizeMode="contain"
        accessibilityLabel="Studently Logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  img: {
    width: "100%",
    height: "100%",
  },
});

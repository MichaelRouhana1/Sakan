import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

type Props = {
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Exact user-provided brand logo component for Skoun.
 */
export function SkounLogo({ size = 32, style }: Props) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Image
        source={require("../../assets/images/logo.png")}
        style={styles.img}
        resizeMode="contain"
        accessibilityLabel="Skoun Logo"
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

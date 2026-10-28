import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

type Props = {
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Approved glossy pin / S-arrow artwork shared by web and native branding.
 */
export function StudentlyLogo({ size = 32, style }: Props) {
  return (
    <View style={[{ width: size, height: size, flexShrink: 0 }, style]}>
      <Image
        source={require("../../assets/images/logo.png")}
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

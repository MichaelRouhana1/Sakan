import { Text as RNText, type TextProps, StyleSheet } from "react-native";

export function Text({ style, ...props }: TextProps) {
  return <RNText style={[styles.base, style]} {...props} />;
}

const styles = StyleSheet.create({
  base: {
    color: "#1a1a1a",
    fontSize: 16,
  },
});

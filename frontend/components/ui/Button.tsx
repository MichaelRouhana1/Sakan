import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Text } from "./Text";

type ButtonProps = PressableProps & {
  label: string;
  variant?: "primary" | "secondary";
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  variant = "primary",
  style,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" ? styles.primary : styles.secondary,
        (pressed || disabled) && styles.dimmed,
        style,
      ]}
      {...props}
    >
      <Text
        style={[
          styles.label,
          variant === "secondary" && styles.secondaryLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  primary: {
    backgroundColor: "#0B6E4F",
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#0B6E4F",
  },
  dimmed: {
    opacity: 0.6,
  },
  label: {
    color: "#ffffff",
    fontWeight: "600",
  },
  secondaryLabel: {
    color: "#0B6E4F",
  },
});

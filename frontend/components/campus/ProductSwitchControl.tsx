import { useRouter } from "expo-router";
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Skoun } from "@/constants/theme";
import { setSkounProduct } from "@/lib/skounProduct";

type Props = {
  variant: "toCampus" | "toHousing";
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  label?: string;
};

export function ProductSwitchControl({
  variant,
  style,
  textStyle,
  label,
}: Props) {
  const router = useRouter();
  const text =
    label ?? (variant === "toCampus" ? "Campus" : "Find a place");

  const onPress = () => {
    void setSkounProduct(variant === "toCampus" ? "campus" : "housing");
    if (variant === "toCampus") {
      router.push("/campus" as never);
      return;
    }
    router.push("/" as never);
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        variant === "toCampus" ? "Switch to Campus" : "Switch to Housing"
      }
      style={({ pressed }) => [styles.hit, pressed && styles.pressed, style]}
    >
      <Text style={[styles.text, textStyle]}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    cursor: "pointer",
  },
  pressed: {
    opacity: 0.8,
  },
  text: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 15,
    color: Skoun.color.ink,
    textDecorationLine: "underline",
  },
});

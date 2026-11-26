import { useDesktopDesign } from "@/components/ui/DesktopDesign";
import { useRouter } from "expo-router";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Studently } from "@/constants/theme";
import { setStudentlyProduct } from "@/lib/studentlyProduct";

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
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  const router = useRouter();
  const text =
    label ?? (variant === "toCampus" ? "Campus" : "Find a place");

  const onPress = () => {
    void setStudentlyProduct(variant === "toCampus" ? "campus" : "housing");
    const target = (variant === "toCampus" ? "/campus" : "/") as never;
    if (Platform.OS === "web") {
      router.push(target);
      return;
    }
    router.replace(target);
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

const baseStyles = StyleSheet.create({
  hit: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    cursor: "pointer",
  },
  pressed: {
    opacity: 0.8,
  },
  text: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 15,
    color: Studently.color.ink,
    textDecorationLine: "underline",
  },
});

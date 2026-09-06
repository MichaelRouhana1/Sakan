import { Pressable, StyleSheet, View } from "react-native";
import { PaperPlaneArrow } from "@/components/icons/PaperPlaneArrow";
import { Skoun } from "@/constants/theme";
import { OFFSCREEN_BEACON_SIZE } from "@/lib/offscreenBeacon";

type Props = {
  x: number;
  y: number;
  angleDeg: number;
  onPress: () => void;
  accessibilityLabel: string;
};

/**
 * Edge beacon for an off-screen campus pin — navy disc + paper-plane pointer.
 */
export function CampusOffscreenArrow({
  x,
  y,
  angleDeg,
  onPress,
  accessibilityLabel,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.circle,
        { left: x, top: y },
        hovered && styles.circleHover,
        pressed && styles.circlePressed,
      ]}
    >
      <View
        style={{
          transform: [{ rotate: `${angleDeg}deg` }, { translateX: 1.5 }],
        }}
      >
        <PaperPlaneArrow size={22} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    position: "absolute",
    zIndex: 480,
    width: OFFSCREEN_BEACON_SIZE,
    height: OFFSCREEN_BEACON_SIZE,
    borderRadius: OFFSCREEN_BEACON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Skoun.color.ink,
    borderWidth: 2,
    borderColor: "#E8EEF6",
    shadowColor: "#121826",
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
    cursor: "pointer" as unknown as undefined,
  },
  circleHover: {
    backgroundColor: Skoun.color.primary,
    borderColor: "#FFFFFF",
  },
  circlePressed: {
    transform: [{ scale: 0.96 }],
  },
});

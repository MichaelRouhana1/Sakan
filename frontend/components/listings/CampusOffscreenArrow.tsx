import { Pressable, StyleSheet, View } from "react-native";
import { PaperPlaneArrow } from "@/components/icons/PaperPlaneArrow";
import { Skoun } from "@/constants/theme";
import { OFFSCREEN_BEACON_SIZE } from "@/lib/offscreenBeacon";
import { skounShadow } from "@/lib/skounShadow";

export type OffscreenArrowTone = "ink" | "danger";

type Props = {
  x: number;
  y: number;
  angleDeg: number;
  onPress: () => void;
  accessibilityLabel: string;
  /** ink = selected campus. danger = selected listing pin red. */
  tone?: OffscreenArrowTone;
};

/** Same red as a selected listing teardrop (`.listing.selected`). */
const SELECTED_PIN_RED = "#C23B2E";
const SELECTED_PIN_RED_DEEP = "#8E241A";

const TONE = {
  ink: {
    backgroundColor: Skoun.color.ink,
    hoverBackgroundColor: Skoun.color.primary,
    borderColor: "#E8EEF6",
    hoverBorderColor: "#FFFFFF",
    zIndex: 480,
  },
  danger: {
    backgroundColor: SELECTED_PIN_RED,
    hoverBackgroundColor: SELECTED_PIN_RED_DEEP,
    borderColor: "#E8EEF6",
    hoverBorderColor: "#FFFFFF",
    zIndex: 482,
  },
} as const;

/**
 * Edge beacon for an off-screen target — disc + paper-plane pointer.
 * Ink points at the selected campus; danger points at the selected listing.
 */
export function CampusOffscreenArrow({
  x,
  y,
  angleDeg,
  onPress,
  accessibilityLabel,
  tone = "ink",
}: Props) {
  const colors = TONE[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.circle,
        {
          left: x,
          top: y,
          zIndex: colors.zIndex,
          backgroundColor: hovered
            ? colors.hoverBackgroundColor
            : colors.backgroundColor,
          borderColor: hovered ? colors.hoverBorderColor : colors.borderColor,
        },
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
    width: OFFSCREEN_BEACON_SIZE,
    height: OFFSCREEN_BEACON_SIZE,
    borderRadius: OFFSCREEN_BEACON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    ...skounShadow({ y: 3, blur: 8, opacity: 0.28, elevation: 6 }),
    cursor: "pointer" as unknown as undefined,
  },
  circlePressed: {
    transform: [{ scale: 0.96 }],
  },
});

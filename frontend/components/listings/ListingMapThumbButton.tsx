import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { ListingMapThumbArt } from "@/components/listings/ListingMapThumbArt";
import { studentlyShadow } from "@/lib/studentlyShadow";

const BUTTON_SIZE = 44;
const FRAME_PADDING = 2;
const ART_SIZE = BUTTON_SIZE - FRAME_PADDING * 2;
const LOGO_PIN_SIZE = 30;
const FULL_LOGO_SOURCE = require("../../assets/images/splash-icon.png");

type Props = {
  onPress: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

function stopPropagationOnly(e?: GestureResponderEvent) {
  e?.stopPropagation?.();
}

function stopPress(e?: GestureResponderEvent) {
  e?.preventDefault?.();
  e?.stopPropagation?.();
}

/**
 * Compact rounded-square mini-map button anchored to the bottom-right corner
 * of a mobile listing card's photo section. Features Studently's coastal stone
 * mini-map, dashed walking route, and the full Studently house-pin logo.
 */
export function ListingMapThumbButton({
  onPress,
  accessibilityLabel = "Show on map",
  style,
  testID = "listing-card-map-btn",
}: Props) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      onPressIn={stopPropagationOnly}
      onPress={(e) => {
        stopPress(e);
        onPress();
      }}
      style={({ pressed, hovered }) => [
        styles.outer,
        style,
        Platform.OS === "web" && hovered && styles.hovered,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={styles.clip}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <ListingMapThumbArt size={ART_SIZE} />
        <View style={styles.logoPinWrap}>
          <Image
            source={FULL_LOGO_SOURCE}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: 13,
    padding: FRAME_PADDING,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...studentlyShadow({
      color: "#1A1A1A",
      y: 3,
      blur: 10,
      opacity: 0.24,
      elevation: 6,
    }),
    ...(Platform.OS === "web"
      ? ({
          cursor: "pointer",
          transitionProperty: "transform, opacity, box-shadow",
          transitionDuration: "160ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        } as ViewStyle)
      : null),
  },
  clip: {
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: 11,
    overflow: "hidden",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F2ED",
  },
  logoPinWrap: {
    position: "absolute",
    top: 4,
    left: (ART_SIZE - LOGO_PIN_SIZE) / 2,
    width: LOGO_PIN_SIZE,
    height: LOGO_PIN_SIZE,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web"
      ? ({
          filter: "drop-shadow(0 1px 1.5px rgba(26, 26, 26, 0.24))",
        } as ViewStyle)
      : null),
  },
  logoImg: {
    width: "100%",
    height: "100%",
  },
  hovered: {
    transform: [{ translateY: -1 }, { scale: 1.04 }],
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.94 }],
  },
});

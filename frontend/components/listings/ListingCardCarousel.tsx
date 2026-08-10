import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

const MAX_PHOTOS = 5;

type Props = {
  urls: string[];
  style?: StyleProp<ViewStyle>;
  /** Always show chevrons (mobile). Web defaults to hover fade-in. */
  alwaysShowArrows?: boolean;
};

function stopCardNav(e?: GestureResponderEvent) {
  e?.preventDefault?.();
  e?.stopPropagation?.();
}

export function ListingCardCarousel({
  urls,
  style,
  alwaysShowArrows = Platform.OS !== "web",
}: Props) {
  const photos = urls.filter(Boolean).slice(0, MAX_PHOTOS);
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const count = photos.length;
  const safeIndex = count > 0 ? index % count : 0;
  const current = photos[safeIndex] ?? null;
  const arrowsVisible = count > 1 && (alwaysShowArrows || hovered);

  const go = (delta: number) => {
    if (count < 2) return;
    setIndex((i) => (i + delta + count) % count);
  };

  const webHoverHandlers =
    Platform.OS === "web"
      ? ({
          onMouseEnter: () => setHovered(true),
          onMouseLeave: () => setHovered(false),
          onPointerEnter: () => setHovered(true),
          onPointerLeave: () => setHovered(false),
        } as object)
      : {};

  return (
    <View style={[styles.root, style]} {...webHoverHandlers}>
      {/* Media — no pointer capture so the wrapper owns hover */}
      {current ? (
        <Image
          pointerEvents="none"
          source={{ uri: current }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={180}
        />
      ) : (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, styles.fallback]}
        />
      )}

      {/* Full-bleed overlay: box-none so empty space passes card presses */}
      <View style={styles.overlay} pointerEvents="box-none">
        {count > 1 ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous photo"
              hitSlop={8}
              onPress={(e) => {
                stopCardNav(e);
                go(-1);
              }}
              onPressIn={stopCardNav}
              style={({ hovered: arrowHover, pressed }) => [
                styles.arrow,
                styles.arrowLeft,
                styles.arrowMotion,
                {
                  opacity: arrowsVisible ? 1 : 0,
                  transform: [
                    { scale: pressed ? 0.95 : arrowHover ? 1.05 : 1 },
                  ],
                },
              ]}
              pointerEvents={arrowsVisible ? "auto" : "none"}
            >
              <Ionicons name="chevron-back" size={18} color="#121826" />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next photo"
              hitSlop={8}
              onPress={(e) => {
                stopCardNav(e);
                go(1);
              }}
              onPressIn={stopCardNav}
              style={({ hovered: arrowHover, pressed }) => [
                styles.arrow,
                styles.arrowRight,
                styles.arrowMotion,
                {
                  opacity: arrowsVisible ? 1 : 0,
                  transform: [
                    { scale: pressed ? 0.95 : arrowHover ? 1.05 : 1 },
                  ],
                },
              ]}
              pointerEvents={arrowsVisible ? "auto" : "none"}
            >
              <Ionicons name="chevron-forward" size={18} color="#121826" />
            </Pressable>
          </>
        ) : null}

        {count > 1 ? (
          <View style={styles.dots} pointerEvents="auto">
            {photos.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === safeIndex && styles.dotActive]}
              />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const arrowMotionWeb =
  Platform.OS === "web"
    ? ({
        transitionProperty: "opacity, transform",
        transitionDuration: "200ms",
      } as ViewStyle)
    : null;

const styles = StyleSheet.create({
  root: {
    position: "relative",
    flex: 1,
    alignSelf: "stretch",
    width: "100%",
    height: "100%",
    minHeight: "100%",
    backgroundColor: "#E8EEF6",
    overflow: "hidden",
  },
  fallback: {
    backgroundColor: "#E2E8F0",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  arrow: {
    position: "absolute",
    top: "50%",
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#121826",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  arrowMotion: {
    ...(arrowMotionWeb ?? {}),
  },
  arrowLeft: { left: 8 },
  arrowRight: { right: 8 },
  dots: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  dotActive: {
    backgroundColor: "#FFFFFF",
    width: 7,
    height: 7,
  },
});

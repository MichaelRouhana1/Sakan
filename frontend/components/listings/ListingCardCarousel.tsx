import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

const MAX_PHOTOS = 5;

type Props = {
  urls: string[];
  style?: StyleProp<ViewStyle>;
  /** Always show chevrons (mobile). Web defaults to hover. */
  alwaysShowArrows?: boolean;
};

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
  const showArrows = count > 1 && (alwaysShowArrows || hovered);

  const go = (delta: number) => {
    if (count < 2) return;
    setIndex((i) => (i + delta + count) % count);
  };

  return (
    <View
      // Hover only used on web to reveal arrows; ignored on native.
      {...(Platform.OS === "web"
        ? {
            onMouseEnter: () => setHovered(true),
            onMouseLeave: () => setHovered(false),
          }
        : {})}
      style={[styles.root, style]}
    >
      {current ? (
        <Image
          source={{ uri: current }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={180}
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.fallback]} />
      )}

      {showArrows ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous photo"
            hitSlop={6}
            onPress={(e) => {
              e?.stopPropagation?.();
              go(-1);
            }}
            style={[styles.arrow, styles.arrowLeft]}
          >
            <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next photo"
            hitSlop={6}
            onPress={(e) => {
              e?.stopPropagation?.();
              go(1);
            }}
            style={[styles.arrow, styles.arrowRight]}
          >
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </Pressable>
        </>
      ) : null}

      {count > 1 ? (
        <View style={styles.dots} pointerEvents="none">
          {photos.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === safeIndex && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "relative",
    backgroundColor: "#E8EEF6",
    overflow: "hidden",
  },
  fallback: {
    backgroundColor: "#E2E8F0",
  },
  arrow: {
    position: "absolute",
    top: "50%",
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "rgba(18,24,38,0.42)",
    alignItems: "center",
    justifyContent: "center",
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

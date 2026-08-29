import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Skoun } from "@/constants/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { TICKER } from "./homeData";

const PX_PER_SEC = 52;
const BAND = "#FFFFFF";
const BAND_FADE = "rgba(255, 255, 255, 0)";
const WHATSAPP = "#128C7E";

function TickItem({
  label,
  icon,
  id,
}: (typeof TICKER)[number]) {
  const accent = id === "wa" ? WHATSAPP : Skoun.color.primary;
  return (
    <View style={styles.item}>
      <View style={styles.diamond} />
      <Ionicons name={icon} size={14} color={accent} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function Segment({
  hidden,
  onLayout,
}: {
  hidden?: boolean;
  onLayout?: (e: LayoutChangeEvent) => void;
}) {
  return (
    <View
      style={styles.segment}
      onLayout={onLayout}
      pointerEvents={hidden ? "none" : "auto"}
      importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
      accessibilityElementsHidden={hidden}
    >
      {TICKER.map((t) => (
        <TickItem key={t.id} {...t} />
      ))}
    </View>
  );
}

export function InsightsMarquee() {
  const reduceMotion = useReducedMotion();
  const offset = useSharedValue(0);
  const widthRef = useRef(0);
  const [segW, setSegW] = useState(0);

  const tick = useCallback(() => {
    const w = widthRef.current;
    if (!w || reduceMotion) return;
    const remaining = Math.max(8, w + offset.value);
    const duration = (remaining / PX_PER_SEC) * 1000;
    offset.value = withTiming(
      -w,
      { duration, easing: Easing.linear },
      (finished) => {
        "worklet";
        if (finished) {
          offset.value = 0;
          runOnJS(tick)();
        }
      },
    );
  }, [offset, reduceMotion]);

  useEffect(() => {
    if (!segW || reduceMotion) {
      cancelAnimation(offset);
      offset.value = 0;
      return;
    }
    offset.value = 0;
    tick();
    return () => cancelAnimation(offset);
  }, [segW, reduceMotion, offset, tick]);

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const onSegmentLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w < 8 || Math.abs(w - widthRef.current) < 2) return;
    widthRef.current = w;
    setSegW(w);
  };

  return (
    <View
      style={styles.band}
      accessibilityLabel="Campuses, areas, and how Skoun works"
    >
      {reduceMotion ? (
        <View style={styles.staticRow}>
          {TICKER.map((t) => (
            <TickItem key={t.id} {...t} />
          ))}
        </View>
      ) : (
        <View style={styles.clip}>
          <Animated.View style={[styles.track, trackStyle]}>
            <Segment onLayout={onSegmentLayout} />
            <Segment hidden />
          </Animated.View>
        </View>
      )}
      <LinearGradient
        colors={[BAND, BAND_FADE]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.fadeLeft}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[BAND_FADE, BAND]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.fadeRight}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    width: "100%",
    height: 48,
    backgroundColor: BAND,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Skoun.color.border,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
  },
  clip: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
  },
  track: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    height: 48,
  },
  segment: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    flexShrink: 0,
    height: 48,
  },
  staticRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    height: 48,
    paddingHorizontal: 8,
  },
  item: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    flexShrink: 0,
    gap: 10,
    paddingHorizontal: 22,
    height: 48,
  },
  diamond: {
    width: 5,
    height: 5,
    backgroundColor: "#2F6FED",
    transform: [{ rotate: "45deg" }],
    flexShrink: 0,
  },
  label: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 13,
    letterSpacing: 0.4,
    color: Skoun.color.ink,
  },
  fadeLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 40,
  },
  fadeRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
  },
});

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
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
import {
  CAMPUS_TICKER,
  STATS,
  type HomeStat,
  type HomeTickerItem,
} from "./homeData";

const PX_PER_SEC = 52;
const BAND = "#FFFFFF";
const BAND_FADE = "rgba(255, 255, 255, 0)";
const ROW_H = 48;
const SELECTED_H = 40;

function TickItem({
  label,
  icon,
  selected,
}: HomeTickerItem) {
  const accent = selected ? "#FFFFFF" : Skoun.color.primary;
  return (
    <View style={[styles.item, selected && styles.itemSelected]}>
      {!selected ? <View style={styles.diamond} /> : null}
      <Ionicons
        name={icon as keyof typeof Ionicons.glyphMap}
        size={selected ? 17 : 14}
        color={accent}
      />
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {label}
      </Text>
    </View>
  );
}

function Segment({
  items,
  hidden,
  onLayout,
}: {
  items: HomeTickerItem[];
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
      {items.map((t) => (
        <TickItem key={t.id} {...t} />
      ))}
    </View>
  );
}

function MarqueeRow({
  items,
  accessibilityLabel,
  reverse,
  bandColor,
  fadeOpaque,
  fadeClear,
}: {
  items: HomeTickerItem[];
  accessibilityLabel: string;
  reverse?: boolean;
  bandColor: string;
  fadeOpaque: string;
  fadeClear: string;
}) {
  const reduceMotion = useReducedMotion();
  const offset = useSharedValue(0);
  const widthRef = useRef(0);
  const [segW, setSegW] = useState(0);

  const tick = useCallback(() => {
    const w = widthRef.current;
    if (!w || reduceMotion) return;
    if (reverse) {
      const remaining = Math.max(8, -offset.value);
      const duration = (remaining / PX_PER_SEC) * 1000;
      offset.value = withTiming(
        0,
        { duration, easing: Easing.linear },
        (finished) => {
          "worklet";
          if (finished) {
            offset.value = -w;
            runOnJS(tick)();
          }
        },
      );
      return;
    }
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
  }, [offset, reduceMotion, reverse]);

  useEffect(() => {
    if (!segW || reduceMotion) {
      cancelAnimation(offset);
      offset.value = 0;
      return;
    }
    offset.value = reverse ? -segW : 0;
    tick();
    return () => cancelAnimation(offset);
  }, [segW, reduceMotion, offset, tick, reverse]);

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
      style={[styles.band, { backgroundColor: bandColor }]}
      accessibilityLabel={accessibilityLabel}
    >
      {reduceMotion ? (
        <View style={styles.staticRow}>
          {items.map((t) => (
            <TickItem key={t.id} {...t} />
          ))}
        </View>
      ) : (
        <View style={styles.clip}>
          <Animated.View style={[styles.track, trackStyle]}>
            <Segment items={items} onLayout={onSegmentLayout} />
            <Segment items={items} hidden />
          </Animated.View>
        </View>
      )}
      <LinearGradient
        colors={[fadeOpaque, fadeClear]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.fadeLeft}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[fadeClear, fadeOpaque]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.fadeRight}
        pointerEvents="none"
      />
    </View>
  );
}

/** Stats with an `href` point at a shipped tool, so they become links. */
function StatBlock({ stat }: { stat: HomeStat }) {
  const router = useRouter();

  const inner = (
    <>
      <Ionicons
        name={stat.icon}
        size={22}
        color={Skoun.color.primary}
        style={styles.statIcon}
      />
      <View style={styles.statCopy}>
        <View style={styles.statTitleRow}>
          <Text style={styles.statTitle}>{stat.value}</Text>
          {stat.href ? (
            <Ionicons
              name="arrow-forward"
              size={14}
              color={Skoun.color.primary}
            />
          ) : null}
        </View>
        <Text style={styles.statBody}>{stat.body}</Text>
      </View>
    </>
  );

  if (!stat.href) {
    return <View style={styles.statBlock}>{inner}</View>;
  }

  return (
    <Pressable
      onPress={() => router.push(stat.href as never)}
      accessibilityRole="link"
      accessibilityLabel={stat.value}
      accessibilityHint={stat.body}
      style={({ hovered, pressed }) => [
        styles.statBlock,
        styles.statBlockLink,
        (hovered || pressed) && styles.statBlockLinkActive,
      ]}
    >
      {inner}
    </Pressable>
  );
}

export function InsightsMarquee() {
  return (
    <View>
      <MarqueeRow
        items={CAMPUS_TICKER}
        accessibilityLabel="Campus tools coming soon"
        bandColor={BAND}
        fadeOpaque={BAND}
        fadeClear={BAND_FADE}
      />
      <View style={styles.statsBand}>
        {STATS.map((s) => (
          <StatBlock key={s.id} stat={s} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    width: "100%",
    height: ROW_H,
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
    height: ROW_H,
  },
  segment: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    flexShrink: 0,
    height: ROW_H,
  },
  staticRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    height: ROW_H,
    paddingHorizontal: 8,
  },
  item: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    flexShrink: 0,
    gap: 10,
    paddingHorizontal: 22,
    height: ROW_H,
  },
  itemSelected: {
    height: SELECTED_H,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    gap: 8,
    borderRadius: Skoun.radius.pill,
    backgroundColor: Skoun.color.primary,
    transform: [{ scale: 1.12 }],
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
  labelSelected: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 14,
    letterSpacing: 0.6,
    color: "#FFFFFF",
    textTransform: "uppercase",
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
  statsBand: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: BAND,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Skoun.color.border,
    paddingHorizontal: 40,
    paddingVertical: 28,
    gap: 24,
  },
  statBlock: {
    flexGrow: 1,
    flexBasis: 220,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    minWidth: 200,
    maxWidth: 420,
  },
  // Negative margins cancel the padding, so hovering a link stat can't nudge
  // the row's layout.
  statBlockLink: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginVertical: -8,
    marginHorizontal: -10,
    borderRadius: Skoun.radius.md,
    ...(Platform.OS === "web"
      ? ({
          cursor: "pointer",
          transitionProperty: "background-color",
          transitionDuration: "200ms",
          transitionTimingFunction: "ease-out",
        } as object)
      : null),
  },
  statBlockLinkActive: {
    backgroundColor: Skoun.color.primaryMist,
  },
  statIcon: {
    marginTop: 2,
  },
  statCopy: {
    flex: 1,
    gap: 4,
  },
  statTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statTitle: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 16,
    color: Skoun.color.ink,
  },
  statBody: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    lineHeight: 19,
    color: Skoun.color.inkMuted,
  },
});

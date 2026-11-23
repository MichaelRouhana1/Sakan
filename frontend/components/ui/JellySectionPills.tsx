import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Lister } from "@/constants/listerTheme";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { JellySectionPillsProps } from "./JellySectionPills.types";

/** Mirrors desktop JellyRadio (size="sm", gap=2, radius=14) physics and palette. */
const CHIP_HEIGHT = 28;
const CHIP_RADIUS = 14;
const CHIP_PAD_X = 12;
const CHIP_GAP = 2;
const SWELL = 0.2;
const BARGE = 6;
const SHRINK = 0.05;
const JELLY = 1;
const BOUNCE = 0.25;
const STAGGER_MS = 22;
const STIFFNESS = 580;

type ChipAnim = {
  x: Animated.Value;
  sx: Animated.Value;
  sy: Animated.Value;
  press: Animated.Value;
  inFlight: boolean;
  running: Animated.CompositeAnimation | null;
};

function springConfig(stiffness: number, mass: number, bounce: number) {
  return {
    stiffness,
    mass,
    damping: 2 * Math.sqrt(stiffness * mass) * (1 - bounce),
    useNativeDriver: true,
  };
}

export function JellySectionPills({
  items,
  activeId,
  onSelect,
  ariaLabel = "Sections",
}: JellySectionPillsProps) {
  const reduced = useReducedMotion();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(0);
  const viewportWidth = useRef(0);
  const contentWidth = useRef(0);

  const chipLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const animsRef = useRef<ChipAnim[]>([]);

  const activeIndex = useMemo(() => {
    const idx = items.findIndex((item) => item.id === activeId);
    return idx >= 0 ? idx : 0;
  }, [items, activeId]);

  const animFor = useCallback((index: number): ChipAnim => {
    let entry = animsRef.current[index];
    if (!entry) {
      const on = index === activeIndex;
      entry = {
        x: new Animated.Value(0),
        sx: new Animated.Value(on ? 1 + SWELL : 1 - SHRINK),
        sy: new Animated.Value(on ? 1 + SWELL : 1 - SHRINK),
        press: new Animated.Value(1),
        inFlight: false,
        running: null,
      };
      animsRef.current[index] = entry;
    }
    return entry;
  }, [activeIndex]);

  const activeIndexRef = useRef(activeIndex);
  const hasInitialized = useRef(false);

  const applyPhysics = useCallback(
    (sel: number, instant: boolean) => {
      const selItem = items[sel];
      const selWidth = selItem ? chipLayouts.current[selItem.id]?.width ?? 72 : 72;
      const push = (selWidth * SWELL) / 2 + BARGE;

      for (let i = 0; i < items.length; i++) {
        const entry = animFor(i);
        const on = i === sel;
        const far = Math.abs(i - sel);
        const dir = Math.sign(i - sel);
        const targetX = dir * push;
        const targetS = on ? 1 + SWELL : 1 - SHRINK;

        if (entry.running) {
          entry.running.stop();
          entry.running = null;
        }

        if (instant || reduced) {
          entry.x.setValue(targetX);
          entry.sx.setValue(targetS);
          entry.sy.setValue(targetS);
          entry.inFlight = false;
          continue;
        }

        const k = STIFFNESS * (1 - 0.12 * Math.min(far, 3));
        const delayMs = entry.inFlight ? 0 : far * STAGGER_MS;
        entry.inFlight = true;

        const moveX = Animated.spring(entry.x, {
          toValue: targetX,
          ...springConfig(k, 0.9, BOUNCE),
        });
        const scaleX = Animated.spring(entry.sx, {
          toValue: targetS,
          ...springConfig(
            k * (1 + 0.24 * JELLY),
            0.9 - 0.1 * JELLY,
            Math.min(0.85, BOUNCE + 0.3 * JELLY),
          ),
        });
        const scaleY = Animated.sequence([
          Animated.delay(Math.round(50 * JELLY)),
          Animated.spring(entry.sy, {
            toValue: targetS,
            ...springConfig(k * (1 - 0.14 * JELLY), 0.9 + 0.05 * JELLY, BOUNCE),
          }),
        ]);

        const anim =
          delayMs > 0
            ? Animated.sequence([
                Animated.delay(delayMs),
                Animated.parallel([moveX, scaleX, scaleY]),
              ])
            : Animated.parallel([moveX, scaleX, scaleY]);

        entry.running = anim;
        anim.start(({ finished }) => {
          if (finished) {
            entry.inFlight = false;
            entry.running = null;
          }
        });
      }
    },
    [items, animFor, reduced],
  );

  const scrollActiveIntoView = useCallback(
    (id: string, animated: boolean) => {
      const box = chipLayouts.current[id];
      const viewW = viewportWidth.current;
      if (!box || viewW <= 0) return;
      const pad = 16;
      const left = box.x - pad;
      const right = box.x + box.width + pad;
      const cur = scrollX.current;
      let target = cur;
      if (left < cur) target = left;
      else if (right > cur + viewW) target = right - viewW;
      const max = Math.max(0, contentWidth.current - viewW);
      target = Math.max(0, Math.min(max, target));
      if (Math.abs(target - cur) < 1) return;
      scrollRef.current?.scrollTo({ x: target, animated: animated && !reduced });
    },
    [reduced],
  );

  useEffect(() => {
    const prev = activeIndexRef.current;
    activeIndexRef.current = activeIndex;
    const instant = !hasInitialized.current;
    hasInitialized.current = true;
    if (instant || prev !== activeIndex) {
      applyPhysics(activeIndex, instant);
    }
    scrollActiveIntoView(activeId, !instant);
  }, [activeIndex, activeId, applyPhysics, scrollActiveIntoView]);

  const handleChipLayout = (id: string, index: number, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    chipLayouts.current[id] = { x, width };
    if (index === activeIndexRef.current) {
      applyPhysics(activeIndexRef.current, true);
      scrollActiveIntoView(id, false);
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollX.current = e.nativeEvent.contentOffset.x;
  };

  return (
    <View style={styles.bar} accessibilityLabel={ariaLabel}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onLayout={(e) => {
          viewportWidth.current = e.nativeEvent.layout.width;
          scrollActiveIntoView(activeId, false);
        }}
        onContentSizeChange={(w) => {
          contentWidth.current = w;
        }}
        keyboardShouldPersistTaps="handled"
      >
        {items.map((item, i) => {
          const on = i === activeIndex;
          const anim = animFor(i);
          return (
            <Animated.View
              key={item.id}
              onLayout={(e) => handleChipLayout(item.id, i, e)}
              style={[
                styles.chipWrap,
                {
                  zIndex: on ? 2 : 1,
                  transform: [
                    { translateX: anim.x },
                    { scaleX: anim.sx },
                    { scaleY: anim.sy },
                  ],
                },
              ]}
            >
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: on, selected: on }}
                onPress={() => onSelect(item.id)}
                onPressIn={() => {
                  if (reduced) return;
                  Animated.timing(anim.press, {
                    toValue: 0.97,
                    duration: 100,
                    useNativeDriver: true,
                  }).start();
                }}
                onPressOut={() => {
                  if (reduced) return;
                  Animated.timing(anim.press, {
                    toValue: 1,
                    duration: 140,
                    useNativeDriver: true,
                  }).start();
                }}
              >
                <Animated.View
                  style={[
                    styles.skin,
                    on && styles.skinOn,
                    { transform: [{ scale: anim.press }] },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[styles.label, on && styles.labelOn]}
                  >
                    {item.label}
                  </Text>
                </Animated.View>
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexGrow: 0,
    backgroundColor: Lister.color.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Lister.color.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: CHIP_GAP,
    // Generous breathing room so the 1.2x swelled pill and outward barge never clip.
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  chipWrap: {
    position: "relative",
  },
  skin: {
    height: CHIP_HEIGHT,
    paddingHorizontal: CHIP_PAD_X,
    borderRadius: CHIP_RADIUS,
    backgroundColor: Lister.color.primaryMist,
    alignItems: "center",
    justifyContent: "center",
  },
  skinOn: {
    backgroundColor: Lister.color.ink,
  },
  label: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    color: Lister.color.ink,
  },
  labelOn: {
    color: Lister.color.surface,
  },
});

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LText } from "@/components/lister/Typography";
import { GlassSurface, isAppleGlass } from "@/components/ui/Glass";
import { Skoun } from "@/constants/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";

export const SEGMENTED_PILL_SLIDE_MS = 200;
const EASE = Easing.out(Easing.cubic);

export type SegmentedPillOption<T extends string> = {
  value: T;
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
};

type Appearance = "glass" | "chip";

type Props<T extends string> = {
  value: T;
  options: readonly SegmentedPillOption<T>[];
  onChange: (next: T) => void;
  accessibilityLabel?: string;
  appearance?: Appearance;
  /** Stretch the track to fill its parent (row beside Filters, etc.). */
  fill?: boolean;
  /** Split track into equal-width slots. When false with fill, the last slot grows. */
  equalWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

type SlotLayout = { x: number; width: number; height: number };

function near(a: number, b: number) {
  return Math.abs(a - b) < 0.5;
}

/**
 * Shared segmented control — jade thumb slides with ease-out (no spring / jiggle).
 * Thumb uses native-driver translateX so heavy siblings (e.g. map) can’t jank the slide.
 */
export function SegmentedPillTrack<T extends string>({
  value,
  options,
  onChange,
  accessibilityLabel,
  appearance = "chip",
  fill,
  equalWidth = true,
  style,
}: Props<T>) {
  const stretch = fill ?? equalWidth;
  const reduceMotion = useReducedMotion();
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const pad = appearance === "glass" ? 4 : 3;

  const layoutsRef = useRef<(SlotLayout | null)[]>(options.map(() => null));
  const [ready, setReady] = useState(false);
  const placedRef = useRef(false);

  const thumbX = useRef(new Animated.Value(0)).current;
  const [thumbSize, setThumbSize] = useState({ width: 0, height: 0 });
  const running = useRef<Animated.CompositeAnimation | null>(null);
  const animatingRef = useRef(false);

  const moveTo = (index: number, animated: boolean) => {
    const layout = layoutsRef.current[index];
    if (!layout || layout.width <= 0) return;

    running.current?.stop();
    running.current = null;
    animatingRef.current = false;

    const runAnim = animated && placedRef.current && !reduceMotion;

    setThumbSize({ width: layout.width, height: layout.height });

    if (!runAnim) {
      thumbX.setValue(layout.x);
      placedRef.current = true;
      return;
    }

    animatingRef.current = true;
    // Native driver: only translateX. Size is set above.
    const anim = Animated.timing(thumbX, {
      toValue: layout.x,
      duration: SEGMENTED_PILL_SLIDE_MS,
      easing: EASE,
      useNativeDriver: true,
    });
    running.current = anim;
    anim.start(({ finished }) => {
      if (finished && running.current === anim) {
        running.current = null;
        animatingRef.current = false;
        // Layout may have shifted mid-slide (Filters badge) — land on truth.
        const latest = layoutsRef.current[index];
        if (latest && latest.width > 0) {
          setThumbSize({ width: latest.width, height: latest.height });
          thumbX.setValue(latest.x);
        }
      }
    });
  };

  useEffect(() => {
    if (!ready) return;
    moveTo(selectedIndex, placedRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, ready, reduceMotion]);

  const onSlotLayout = (index: number, e: LayoutChangeEvent) => {
    const { x, width, height } = e.nativeEvent.layout;
    const prev = layoutsRef.current[index];
    if (
      prev &&
      near(prev.x, x) &&
      near(prev.width, width) &&
      near(prev.height, height)
    ) {
      return;
    }

    layoutsRef.current[index] = { x, width, height };

    const allMeasured = layoutsRef.current.every(
      (l) => l != null && l.width > 0,
    );
    if (!allMeasured) return;

    // Parent width can change (e.g. Filters badge) — keep thumb aligned.
    if (!ready) {
      setReady(true);
      return;
    }

    const selected = layoutsRef.current[selectedIndex];
    if (!selected) return;

    // Don’t cancel an in-flight slide; only track size until it finishes.
    if (animatingRef.current) {
      setThumbSize({ width: selected.width, height: selected.height });
      return;
    }

    moveTo(selectedIndex, false);
  };

  const row = (
    <View
      collapsable={false}
      style={[styles.row, stretch && styles.rowStretch]}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {ready ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            appearance === "glass" && styles.thumbGlass,
            appearance === "chip" && styles.thumbChip,
            {
              width: thumbSize.width,
              height: thumbSize.height,
              transform: [{ translateX: thumbX }],
            },
          ]}
        />
      ) : null}

      {options.map((option, index) => {
        const selected = option.value === value;
        const isLast = index === options.length - 1;
        const growLast = stretch && !equalWidth && isLast;
        return (
          <View
            key={option.value}
            collapsable={false}
            onLayout={(e) => onSlotLayout(index, e)}
            style={[
              styles.slotWrap,
              equalWidth && styles.slotEqual,
              growLast && styles.slotGrow,
              !equalWidth && !growLast && styles.slotHug,
              !isLast && styles.slotGap,
            ]}
          >
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => onChange(option.value)}
              style={[
                styles.slot,
                appearance === "glass" && styles.slotGlass,
                appearance === "chip" && styles.slotChip,
                option.icon ? styles.slotWithIcon : null,
              ]}
            >
              {option.icon ? (
                <Ionicons
                  name={option.icon}
                  size={16}
                  color={
                    selected ? Skoun.color.surface : Skoun.color.inkMuted
                  }
                />
              ) : null}
              <LText
                variant="caption"
                numberOfLines={1}
                style={[styles.label, selected && styles.labelOn]}
              >
                {option.label}
              </LText>
            </Pressable>
          </View>
        );
      })}
    </View>
  );

  const shell = (
    <View
      style={[
        appearance === "glass" ? styles.shellGlass : styles.shellChip,
        stretch ? styles.shellStretch : styles.shellHug,
        { padding: pad },
        style,
      ]}
    >
      {row}
    </View>
  );

  if (appearance === "glass") {
    return (
      <GlassSurface
        intensity="regular"
        style={[styles.glassWrap, stretch && styles.glassFill]}
      >
        {shell}
      </GlassSurface>
    );
  }

  return shell;
}

const styles = StyleSheet.create({
  glassWrap: {
    borderRadius: Skoun.radius.md,
  },
  glassFill: {
    alignSelf: "stretch",
  },
  shellGlass: {
    borderRadius: Skoun.radius.md,
  },
  shellChip: {
    backgroundColor: Skoun.color.surfaceMuted,
    borderRadius: Skoun.radius.pill,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  shellStretch: {
    alignSelf: "stretch",
  },
  shellHug: {
    alignSelf: "flex-start",
  },
  row: {
    position: "relative",
    flexDirection: "row",
    alignItems: "stretch",
  },
  rowStretch: {
    alignSelf: "stretch",
  },
  thumb: {
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 0,
  },
  thumbGlass: {
    borderRadius: Skoun.radius.sm,
    backgroundColor: isAppleGlass
      ? "rgba(79,183,159,0.92)"
      : Skoun.color.primary,
  },
  thumbChip: {
    borderRadius: Skoun.radius.pill,
    backgroundColor: Skoun.color.primary,
  },
  slotWrap: {
    zIndex: 1,
  },
  slotEqual: {
    flex: 1,
  },
  slotGrow: {
    flexGrow: 1,
    flexShrink: 0,
  },
  slotHug: {
    flexShrink: 0,
  },
  slotGap: {
    marginRight: 2,
  },
  slot: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  slotGlass: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  slotChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  slotWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  label: {
    fontFamily: Skoun.type.bodySemi,
    color: Skoun.color.inkMuted,
    textAlign: "center",
  },
  labelOn: {
    color: Skoun.color.surface,
  },
});

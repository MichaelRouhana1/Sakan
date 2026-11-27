import React, { useCallback, useEffect, type ReactNode } from "react";
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type AnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import { Studently } from "@/constants/theme";
import {
  COLLAPSING_HEADER_DEFAULTS,
  computeCollapsingHeaderMetrics,
  type CollapsingHeaderMetrics,
} from "@/lib/collapsingHeaderMath";
import { useReducedMotion } from "@/lib/useReducedMotion";

export {
  COLLAPSING_HEADER_DEFAULTS,
  computeCollapsingHeaderMetrics,
  type CollapsingHeaderMetrics,
};

export type UseCollapsingHeaderOptions = {
  /** Fallback scrollY (in pt) before `onLargeTitleLayout` fires. */
  defaultThreshold?: number;
  /**
   * Offset (in pt) from the scroll container's top to the parent of the measured
   * large title (e.g. ScrollView contentContainerStyle `paddingTop`).
   */
  extraTopOffset?: number;
  /** Scroll travel (in pt) over which the crossfade occurs. */
  fadeDistance?: number;
  /** Set false on desktop web to disable all scroll-driven header work. */
  enabled?: boolean;
};

export type CollapsingHeaderController = {
  scrollY: SharedValue<number>;
  titleBottom: SharedValue<number>;
  reducedMotion: SharedValue<boolean>;
  fadeDistance: number;
  enabled: boolean;
  onScroll: ReturnType<typeof useAnimatedScrollHandler>;
  scrollEventThrottle: 16;
  largeTitleStyle: AnimatedStyle<ViewStyle>;
  onLargeTitleLayout: (event: LayoutChangeEvent) => void;
  reset: () => void;
};

export function useCollapsingHeader(
  options: UseCollapsingHeaderOptions = {},
): CollapsingHeaderController {
  const {
    defaultThreshold = COLLAPSING_HEADER_DEFAULTS.threshold,
    extraTopOffset = 0,
    fadeDistance = COLLAPSING_HEADER_DEFAULTS.fadeDistance,
    enabled = true,
  } = options;

  const isReducedMotion = useReducedMotion();
  const scrollY = useSharedValue(0);
  const titleBottom = useSharedValue(defaultThreshold);
  const reducedMotion = useSharedValue(isReducedMotion);
  const enabledSV = useSharedValue(enabled);

  useEffect(() => {
    reducedMotion.value = isReducedMotion;
  }, [isReducedMotion, reducedMotion]);

  useEffect(() => {
    enabledSV.value = enabled;
  }, [enabled, enabledSV]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (!enabledSV.value) return;
      scrollY.value = event.contentOffset.y;
    },
  });

  const onLargeTitleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (!enabled) return;
      const { y, height } = event.nativeEvent.layout;
      const measured = y + height + extraTopOffset;
      if (measured > 12) {
        titleBottom.value = measured;
      }
    },
    [enabled, extraTopOffset, titleBottom],
  );

  const largeTitleStyle = useAnimatedStyle<ViewStyle>(() => {
    if (!enabledSV.value) {
      return { opacity: 1 };
    }
    const { largeTitleOpacity } = computeCollapsingHeaderMetrics(
      scrollY.value,
      titleBottom.value,
      fadeDistance,
      reducedMotion.value,
    );
    return { opacity: largeTitleOpacity };
  }, [fadeDistance]);

  const reset = useCallback(() => {
    scrollY.value = 0;
    titleBottom.value = defaultThreshold;
  }, [defaultThreshold, scrollY, titleBottom]);

  return {
    scrollY,
    titleBottom,
    reducedMotion,
    fadeDistance,
    enabled,
    onScroll,
    scrollEventThrottle: 16,
    largeTitleStyle,
    onLargeTitleLayout,
    reset,
  };
}

export type CollapsingHeaderBarProps = {
  controller: CollapsingHeaderController;
  title: string;
  /**
   * `"bar"` renders an in-flow sticky header row (sheets & pushed screens with
   * back/close controls). `"overlay"` renders a floating bar that fades into
   * place over the top of a top-level tab screen only once scrolled.
   */
  variant?: "bar" | "overlay";
  left?: ReactNode;
  right?: ReactNode;
  backgroundColor?: string;
  borderColor?: string;
  titleColor?: string;
  /** Horizontal inset keeping the centered title clear of side controls. */
  titleHorizontalInset?: number;
  /** Extra top padding for safe-area inset when not inside a SafeAreaView. */
  topInset?: number;
  barHeight?: number;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  testID?: string;
};

export function CollapsingHeaderBar({
  controller,
  title,
  variant = "bar",
  left,
  right,
  backgroundColor = "#FFFFFF",
  borderColor = "#ECEAE6",
  titleColor = "#1A1A1A",
  titleHorizontalInset = 68,
  topInset = 0,
  barHeight = variant === "overlay"
    ? COLLAPSING_HEADER_DEFAULTS.overlayHeight
    : COLLAPSING_HEADER_DEFAULTS.barHeight,
  style,
  titleStyle,
  testID,
}: CollapsingHeaderBarProps) {
  const { scrollY, titleBottom, reducedMotion, fadeDistance, enabled } =
    controller;

  const compactTitleStyle = useAnimatedStyle(() => {
    const { compactTitleOpacity, compactTitleTranslateY } =
      computeCollapsingHeaderMetrics(
        scrollY.value,
        titleBottom.value,
        fadeDistance,
        reducedMotion.value,
      );
    return {
      opacity: compactTitleOpacity,
      transform: [{ translateY: compactTitleTranslateY }],
    };
  }, [fadeDistance]);

  const dividerStyle = useAnimatedStyle(() => {
    const { dividerOpacity } = computeCollapsingHeaderMetrics(
      scrollY.value,
      titleBottom.value,
      fadeDistance,
      reducedMotion.value,
    );
    return { opacity: dividerOpacity };
  }, [fadeDistance]);

  const backdropStyle = useAnimatedStyle(() => {
    const { backdropOpacity } = computeCollapsingHeaderMetrics(
      scrollY.value,
      titleBottom.value,
      fadeDistance,
      reducedMotion.value,
    );
    return { opacity: backdropOpacity };
  }, [fadeDistance]);

  if (!enabled) return null;

  if (variant === "overlay") {
    return (
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.overlayRoot, { height: topInset + barHeight }, style]}
        testID={testID}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor },
            backdropStyle,
          ]}
        />
        <View
          style={[
            styles.overlayTitleRow,
            {
              marginTop: topInset,
              height: barHeight,
              paddingHorizontal: titleHorizontalInset,
            },
          ]}
        >
          <Animated.Text
            numberOfLines={1}
            ellipsizeMode="tail"
            allowFontScaling
            maxFontSizeMultiplier={1.25}
            style={[
              styles.compactTitle,
              { color: titleColor },
              titleStyle,
              compactTitleStyle,
            ]}
          >
            {title}
          </Animated.Text>
        </View>
        <Animated.View
          style={[
            styles.hairline,
            { backgroundColor: borderColor },
            dividerStyle,
          ]}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.barRoot,
        { backgroundColor, paddingTop: topInset },
        style,
      ]}
      testID={testID}
    >
      <View style={[styles.barRow, { minHeight: barHeight }]}>
        <View style={styles.sideSlotLeft}>
          {left ?? <View style={styles.emptySlot} />}
        </View>
        <View style={styles.sideSlotRight}>
          {right ?? <View style={styles.emptySlot} />}
        </View>
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.titleCenterLayer,
            { paddingHorizontal: titleHorizontalInset },
          ]}
        >
          <Animated.Text
            numberOfLines={1}
            ellipsizeMode="tail"
            allowFontScaling
            maxFontSizeMultiplier={1.25}
            style={[
              styles.compactTitle,
              { color: titleColor },
              titleStyle,
              compactTitleStyle,
            ]}
          >
            {title}
          </Animated.Text>
        </View>
      </View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.hairline,
          { backgroundColor: borderColor },
          dividerStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  barRoot: {
    position: "relative",
    zIndex: 10,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  sideSlotLeft: {
    zIndex: 2,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  sideSlotRight: {
    zIndex: 2,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  emptySlot: {
    width: 40,
    height: 40,
  },
  titleCenterLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  overlayRoot: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  overlayTitleRow: {
    alignItems: "center",
    justifyContent: "center",
  },
  compactTitle: {
    fontFamily: Studently.type.bodySemi,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
    textAlign: "center",
  },
  hairline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
});

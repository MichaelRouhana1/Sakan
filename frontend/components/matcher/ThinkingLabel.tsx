import { useEffect, useId, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from "react-native-svg";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { matcherStyles as s } from "./matcherStyles";

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

export function ThinkingLabel() {
  const id = `thinking-${useId().replace(/:/g, "")}`;
  const reduce = useReducedMotion();
  const { fontScale } = useWindowDimensions();
  const [metrics, setMetrics] = useState({ width: 0, height: 0, baseline: 0 });
  const phase = useSharedValue(0);

  useEffect(() => {
    phase.value = 0;
    if (!reduce) {
      phase.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.linear }),
        -1,
      );
    }
    return () => cancelAnimation(phase);
  }, [phase, reduce]);

  const gradientProps = useAnimatedProps(() => ({
    // Match desktop's 400%-wide gradient sweeping from 100% to 0%.
    x1: (phase.value * 3 - 3) * metrics.width,
    x2: (phase.value * 3 + 1) * metrics.width,
  }));

  return (
    <View
      accessible
      accessibilityLabel="Thinking..."
      accessibilityLiveRegion="polite"
      style={{ alignSelf: "flex-start" }}
    >
      <Text
        style={[
          s.prompt,
          { color: "rgba(18, 24, 38, 0.45)", opacity: metrics.width ? 0 : 1 },
        ]}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onTextLayout={({ nativeEvent: { lines } }) => {
          const line = lines[0];
          if (line) {
            setMetrics({
              width: line.width,
              height: line.height,
              baseline: line.y + line.ascender,
            });
          }
        }}
      >
        Thinking...
      </Text>
      {metrics.width > 0 && (
        <Svg
          width={metrics.width}
          height={metrics.height}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Defs>
            <AnimatedGradient
              id={id}
              gradientUnits="userSpaceOnUse"
              y1={0}
              y2={0}
              animatedProps={gradientProps}
            >
              <Stop offset="0" stopColor="#121826" stopOpacity={0.45} />
              <Stop offset="0.4" stopColor="#121826" stopOpacity={0.45} />
              <Stop offset="0.5" stopColor="#121826" />
              <Stop offset="0.6" stopColor="#121826" stopOpacity={0.45} />
              <Stop offset="1" stopColor="#121826" stopOpacity={0.45} />
            </AnimatedGradient>
          </Defs>
          <SvgText
            x={0}
            y={metrics.baseline}
            fontFamily={s.prompt.fontFamily}
            fontSize={s.prompt.fontSize * fontScale}
            letterSpacing={s.prompt.letterSpacing}
            fill={`url(#${id})`}
          >
            Thinking...
          </SvgText>
        </Svg>
      )}
    </View>
  );
}

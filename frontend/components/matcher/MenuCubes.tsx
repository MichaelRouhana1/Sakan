import { useId, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Mask,
  Pattern,
  Rect,
  Stop,
} from "react-native-svg";

const CELL = 56;

export function MenuCubes() {
  const id = useId().replace(/:/g, "");
  const [size, setSize] = useState({ width: 0, height: 0 });

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}
      onLayout={({ nativeEvent: { layout } }) =>
        setSize({ width: layout.width, height: layout.height })
      }
    >
      {size.width > 0 && size.height > 0 && (
        <Svg width={size.width} height={size.height}>
          <Defs>
            <Pattern
              id={`grid-${id}`}
              width={CELL}
              height={CELL}
              patternUnits="userSpaceOnUse"
              x={0}
            >
              <Rect
                x={0.25}
                y={0.25}
                width={CELL - 0.5}
                height={CELL - 0.5}
                fill="rgba(47, 111, 237, 0.1)"
                stroke="#D5DCE7"
                strokeWidth={0.5}
              />
            </Pattern>
            <LinearGradient id={`fade-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0" stopColor="white" />
              <Stop offset="0.46" stopColor="white" />
              <Stop offset="0.6" stopColor="white" stopOpacity={0} />
            </LinearGradient>
            <Mask id={`mask-${id}`} x={0} y={0} width="100%" height="100%">
              <Rect width="100%" height="100%" fill={`url(#fade-${id})`} />
            </Mask>
          </Defs>
          <Rect
            width="100%"
            height="100%"
            fill={`url(#grid-${id})`}
            opacity={0.4}
            mask={`url(#mask-${id})`}
          />
        </Svg>
      )}
    </View>
  );
}

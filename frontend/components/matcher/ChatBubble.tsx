import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  Platform,
  Pressable,
  View,
  type AccessibilityState,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Defs, FeDropShadow, Filter, Path } from "react-native-svg";

const REF = 48;
const RADIUS = 18;

/** Reference silhouette, x outward from the body edge, y up from the baseline. */
const UNDER: ReadonlyArray<readonly [number, number]> = [
  [-48, 0],
  [-40, 3],
  [-32, 6],
  [-26, 9],
  [-22, 12],
  [-16, 9],
  [-10, 6],
  [-4, 4],
  [2, 2],
  [8, 1],
  [14, 0.4],
  [16.8, 0],
];

const OUTER: ReadonlyArray<readonly [number, number]> = [
  [16.8, 0],
  [14.5, 5],
  [11, 10],
  [7.5, 16],
  [4.5, 24],
  [2, 33],
  [0.6, 41],
  [0, 48],
];

const PAD = 28;

function n(value: number) {
  return (Math.round(value * 100) / 100).toString();
}

function geometry(width: number, height: number) {
  const radius = Math.min(RADIUS, height / 2, Math.max(0, (width - 4) / 2));
  const scale = radius / REF;
  return { radius, scale, overhang: 16.8 * scale };
}

function place(
  xOut: number,
  yUp: number,
  width: number,
  height: number,
  scale: number,
  side: "left" | "right",
  ox: number,
  oy: number,
): [number, number] {
  const outward = xOut * scale;
  const x = side === "right" ? width + outward : -outward;
  return [x + ox, height - yUp * scale + oy];
}

function smooth(points: Array<[number, number]>) {
  if (points.length < 2) return "";
  const parts: string[] = [];
  for (let i = 1; i < points.length - 1; i++) {
    const [cx, cy] = points[i];
    if (i < points.length - 2) {
      const [nx, ny] = points[i + 1];
      parts.push(
        `Q ${n(cx)} ${n(cy)} ${n((cx + nx) / 2)} ${n((cy + ny) / 2)}`,
      );
    } else {
      const [ex, ey] = points[points.length - 1];
      parts.push(`Q ${n(cx)} ${n(cy)} ${n(ex)} ${n(ey)}`);
    }
  }
  if (points.length === 2) {
    const [ex, ey] = points[1];
    parts.push(`L ${n(ex)} ${n(ey)}`);
  }
  return parts.join(" ");
}

export function chatBubblePath(
  width: number,
  height: number,
  side: "left" | "right",
  ox = 0,
  oy = 0,
) {
  const { radius: r, scale } = geometry(width, height);
  const at = (xOut: number, yUp: number) =>
    place(xOut, yUp, width, height, scale, side, ox, oy);
  const arc = (x: number, y: number) =>
    `A ${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y)}`;
  const topLeft = [ox + r, oy] as const;
  const topRight = [ox + width - r, oy] as const;
  const rightTop = [ox + width, oy + r] as const;
  const leftTop = [ox, oy + r] as const;
  const leftBottom = [ox, oy + height - r] as const;
  const bottomLeft = [ox + r, oy + height] as const;
  const bottomRight = [ox + width - r, oy + height] as const;

  if (side === "right") {
    const outer = [...OUTER]
      .reverse()
      .map(([x, y]) => at(x, y));
    const under = [...UNDER].reverse().map(([x, y]) => at(x, y));
    return [
      `M ${n(topLeft[0])} ${n(topLeft[1])}`,
      `H ${n(topRight[0])}`,
      arc(rightTop[0], rightTop[1]),
      `V ${n(outer[0][1])}`,
      smooth(outer),
      smooth(under),
      `H ${n(bottomLeft[0])}`,
      arc(leftBottom[0], leftBottom[1]),
      `V ${n(leftTop[1])}`,
      arc(topLeft[0], topLeft[1]),
      "Z",
    ].join(" ");
  }

  const under = UNDER.map(([x, y]) => at(x, y));
  const outer = OUTER.map(([x, y]) => at(x, y));
  return [
    `M ${n(topLeft[0])} ${n(topLeft[1])}`,
    `H ${n(topRight[0])}`,
    arc(rightTop[0], rightTop[1]),
    `V ${n(oy + height - r)}`,
    arc(bottomRight[0], bottomRight[1]),
    `H ${n(under[0][0])}`,
    smooth(under),
    smooth(outer),
    `V ${n(leftTop[1])}`,
    arc(topLeft[0], topLeft[1]),
    "Z",
  ].join(" ");
}

function BubbleSvg({
  width,
  height,
  side,
  color,
  stroke,
  shadow,
}: {
  width: number;
  height: number;
  side: "left" | "right";
  color: string;
  stroke?: string;
  shadow: { y: number; blur: number; opacity: number };
}) {
  const rawId = useId().replace(/:/g, "");
  const filterId = `bubble-shadow-${rawId}`;
  const { overhang } = geometry(width, height);
  const ox = PAD + (side === "left" ? overhang : 0);
  const d = chatBubblePath(width, height, side, ox, PAD);
  const web = Platform.OS === "web";

  const frame = {
    position: "absolute" as const,
    left: -PAD - (side === "left" ? overhang : 0),
    top: -PAD,
    width: width + overhang + PAD * 2,
    height: height + PAD * 2,
    overflow: "visible" as const,
    ...(web
      ? {
          filter: `drop-shadow(0px ${shadow.y}px ${shadow.blur}px rgba(18, 24, 38, ${shadow.opacity}))`,
        }
      : null),
  };

  return (
    <View pointerEvents="none" style={frame}>
      <Svg
        width={width + overhang + PAD * 2}
        height={height + PAD * 2}
        style={{ overflow: "visible" }}
      >
        {web ? null : (
          <Defs>
            <Filter
              id={filterId}
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <FeDropShadow
                dx="0"
                dy={shadow.y}
                stdDeviation={shadow.blur / 2}
                floodColor="#121826"
                floodOpacity={shadow.opacity}
              />
            </Filter>
          </Defs>
        )}
        <Path
          d={d}
          fill={color}
          stroke={stroke ?? "none"}
          strokeWidth={stroke ? 1.5 : 0}
          filter={web ? undefined : `url(#${filterId})`}
        />
      </Svg>
    </View>
  );
}

const clearShape: ViewStyle = {
  backgroundColor: "transparent",
  borderRadius: 0,
  borderTopLeftRadius: 0,
  borderTopRightRadius: 0,
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
  borderWidth: 0,
  boxShadow: "none",
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
  overflow: "visible",
};

export function ChatBubble({
  side,
  color,
  hoverColor,
  stroke,
  tailed = false,
  onPress,
  accessibilityLabel,
  accessibilityState,
  shadow = { y: 4, blur: 14, opacity: 0.12 },
  style,
  children,
}: {
  side: "left" | "right";
  color: string;
  hoverColor?: string;
  stroke?: string;
  tailed?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  shadow?: { y: number; blur: number; opacity: number };
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const ref = useRef<View>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const commit = (width: number, height: number) => {
    if (width < 1 || height < 1) return;
    setSize((prev) =>
      Math.abs(prev.w - width) < 0.5 && Math.abs(prev.h - height) < 0.5
        ? prev
        : { w: width, h: height },
    );
  };

  useLayoutEffect(() => {
    if (!tailed || Platform.OS !== "web") return;
    const node = ref.current as unknown as HTMLElement | null;
    if (!node || typeof node.offsetWidth !== "number") return;
    commit(node.offsetWidth, node.offsetHeight);
  });

  const ready = tailed && size.w > 1 && size.h > 1;
  const shell = (fill: string) => [
    style,
    { backgroundColor: fill, overflow: "visible" as const },
    ready ? clearShape : null,
  ];
  const body = (fill: string) => (
    <>
      {ready ? (
        <BubbleSvg
          width={size.w}
          height={size.h}
          side={side}
          color={fill}
          stroke={stroke}
          shadow={shadow}
        />
      ) : null}
      {children}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={accessibilityState}
        onPress={onPress}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          commit(width, height);
        }}
        style={({ pressed, hovered }) =>
          shell(pressed || hovered ? (hoverColor ?? color) : color)
        }
      >
        {({ pressed, hovered }) =>
          body(pressed || hovered ? (hoverColor ?? color) : color)
        }
      </Pressable>
    );
  }

  return (
    <View
      ref={ref}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        commit(width, height);
      }}
      style={shell(color)}
    >
      {body(color)}
    </View>
  );
}

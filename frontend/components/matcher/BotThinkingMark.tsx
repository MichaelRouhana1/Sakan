import { useEffect, useState } from "react";
import { AppState, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { MODE_FRAMES, resolvePreset } from "thinking-orbs/engine";
import { useReducedMotion } from "@/lib/useReducedMotion";

const SIZE = 20;
const preset = resolvePreset("breathing", SIZE);
const frameAt = (time: number) => MODE_FRAMES[preset.mode](SIZE, time, preset.opts);

export function BotThinkingMark() {
  const reduce = useReducedMotion();
  const [frame, setFrame] = useState(() => frameAt(0.6));

  useEffect(() => {
    if (reduce) {
      setFrame(frameAt(0.6));
      return;
    }
    let raf = 0;
    let active = AppState.currentState === "active";
    const tick = () => {
      if (!active) return;
      // Use the desktop orb's geometry, speed, and shared clock.
      setFrame(frameAt((performance.now() / 1000) * preset.speed));
      raf = requestAnimationFrame(tick);
    };
    if (active) raf = requestAnimationFrame(tick);
    const subscription = AppState.addEventListener("change", (state) => {
      active = state === "active";
      cancelAnimationFrame(raf);
      if (active) raf = requestAnimationFrame(tick);
    });
    return () => {
      active = false;
      cancelAnimationFrame(raf);
      subscription.remove();
    };
  }, [reduce]);

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: "absolute",
        top: -4,
        right: -4,
        width: SIZE,
        height: SIZE,
        zIndex: 2,
      }}
    >
      <Svg width={SIZE} height={SIZE}>
        {frame.dots.map((dot, index) => {
          const gray = Math.round(Math.min(1, Math.max(0, dot.white)) * 255);
          return (
            <Circle
              key={index}
              cx={dot.x}
              cy={dot.y}
              r={dot.r}
              fill={`rgb(${gray},${gray},${gray})`}
              opacity={dot.a ?? 1}
            />
          );
        })}
      </Svg>
    </View>
  );
}

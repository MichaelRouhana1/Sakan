import { useId } from "react";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

/** Native equivalent of the desktop cards' 220px radial background. */
export function HostCreditsAura({ starter }: { starter: boolean }) {
  const id = `credit-aura-${useId().replace(/:/g, "")}`;
  return (
    <Svg width={220} height={220} pointerEvents="none" accessibilityElementsHidden>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="70.71%">
          <Stop offset="0" stopColor="#2F6FED" stopOpacity={starter ? 0.14 : 0.12} />
          <Stop offset="0.42" stopColor="#2F6FED" stopOpacity={starter ? 0.05 : 0.04} />
          <Stop offset="0.7" stopColor="#2F6FED" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={220} height={220} fill={`url(#${id})`} />
    </Svg>
  );
}

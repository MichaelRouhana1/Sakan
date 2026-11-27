import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";

/**
 * Architectural mini-map artwork for the mobile listing card map button.
 * Uses Studently's warm stone & coastal palette plus a dashed madder walking
 * route terminating under the Studently logo pin.
 */
export function ListingMapThumbArt({ size = 40 }: { size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      accessibilityElementsHidden
    >
      {/* Warm architectural stone land */}
      <Rect x="0" y="0" width="40" height="40" fill="#F4F2ED" />

      {/* Subtle Mediterranean coast arc (top-left) */}
      <Path d="M0 0H15.5C13.8 7 9 12.5 0 15Z" fill="#D5E7F2" />

      {/* Quiet urban block tint (bottom-right) */}
      <Path d="M25 20L40 16.5V40H21.5Z" fill="#EAE6DE" />

      {/* Crisp white street grid */}
      <Path
        d="M-2 19L42 10.5"
        stroke="#FFFFFF"
        strokeWidth={2.8}
        strokeLinecap="round"
      />
      <Path
        d="M16.5 -2L11 42"
        stroke="#FFFFFF"
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      <Path
        d="M28.5 13L25.5 42"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M12 30.5L42 33.5"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
      />

      {/* Signature Studently dashed walking route leading into the logo pin */}
      <Path
        d="M3.5 34Q11.5 32.5 20 32"
        stroke="#EA3F4A"
        strokeOpacity={0.8}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeDasharray="2.3 2.5"
        fill="none"
      />

      {/* Soft madder target ring & ground shadow directly beneath the logo pin tip */}
      <Circle cx="20" cy="32" r="5" fill="rgba(234, 63, 74, 0.14)" />
      <Ellipse cx="20" cy="32.6" rx="3.8" ry="1.4" fill="rgba(26, 26, 26, 0.22)" />
    </Svg>
  );
}

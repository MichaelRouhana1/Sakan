import Svg, { Path } from "react-native-svg";

/** Filled stacked swap arrows — top →, bottom ←. Matches Material swap_horiz. */
export function SwapHorizIcon({
  size = 18,
  color = "#121826",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      accessibilityElementsHidden
    >
      <Path d="M2 6h13.5V3.5L22 7.5 15.5 11.5V9H2zM22 15H8.5v-2.5L2 16.5 8.5 20.5V18H22z" />
    </Svg>
  );
}

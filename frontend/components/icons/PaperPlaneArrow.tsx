import Svg, { Path } from "react-native-svg";

/**
 * Split paper-plane pointer — rounded tails, sharp nose, fold gap like Telegram.
 * Drawn pointing right so CSS/RN rotate(angle) maps 0° to screen-east.
 */
export function PaperPlaneArrow({
  size = 20,
  color = "#FFFFFF",
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
      <Path
        d="M2.3 20.7L21.5 12 2.3 3.3l.12 6.7 13.05 2-13.05 2z"
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

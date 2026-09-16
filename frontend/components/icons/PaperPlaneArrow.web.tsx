/**
 * Native SVG on web — react-native-svg's WebShape uses
 * `unstable_createElement`, which react-native-web 0.21 no longer exports.
 */
export function PaperPlaneArrow({
  size = 20,
  color = "#FFFFFF",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2.3 20.7L21.5 12 2.3 3.3l.12 6.7 13.05 2-13.05 2z"
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

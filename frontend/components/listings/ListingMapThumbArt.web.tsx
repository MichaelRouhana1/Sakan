/**
 * Architectural mini-map artwork for the mobile listing card map button.
 * Uses native DOM `<svg>` on web because react-native-svg's WebShape relies on
 * `unstable_createElement`, removed in react-native-web 0.21.
 */
export function ListingMapThumbArt({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
    >
      {/* Warm architectural stone land */}
      <rect x="0" y="0" width="40" height="40" fill="#F4F2ED" />

      {/* Subtle Mediterranean coast arc (top-left) */}
      <path d="M0 0H15.5C13.8 7 9 12.5 0 15Z" fill="#D5E7F2" />

      {/* Quiet urban block tint (bottom-right) */}
      <path d="M25 20L40 16.5V40H21.5Z" fill="#EAE6DE" />

      {/* Crisp white street grid */}
      <path
        d="M-2 19L42 10.5"
        stroke="#FFFFFF"
        strokeWidth={2.8}
        strokeLinecap="round"
      />
      <path
        d="M16.5 -2L11 42"
        stroke="#FFFFFF"
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      <path
        d="M28.5 13L25.5 42"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d="M12 30.5L42 33.5"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
      />

      {/* Signature Studently dashed walking route leading into the logo pin */}
      <path
        d="M3.5 34Q11.5 32.5 20 32"
        stroke="var(--sk-primary, #EA3F4A)"
        strokeOpacity={0.8}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeDasharray="2.3 2.5"
        fill="none"
      />

      {/* Soft madder target ring & ground shadow directly beneath the logo pin tip */}
      <circle cx="20" cy="32" r="5" fill="rgba(234, 63, 74, 0.14)" />
      <ellipse cx="20" cy="32.6" rx="3.8" ry="1.4" fill="rgba(26, 26, 26, 0.22)" />
    </svg>
  );
}

export const COLLAPSING_HEADER_DEFAULTS = {
  threshold: 52,
  fadeDistance: 28,
  titleLiftPx: 6,
  barHeight: 52,
  overlayHeight: 46,
} as const;

export type CollapsingHeaderMetrics = {
  largeTitleOpacity: number;
  compactTitleOpacity: number;
  compactTitleTranslateY: number;
  dividerOpacity: number;
  backdropOpacity: number;
};

function clamp01(value: number): number {
  "worklet";
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function easeOutCubic(t: number): number {
  "worklet";
  const inv = 1 - clamp01(t);
  return 1 - inv * inv * inv;
}

/**
 * Computes all scroll-driven opacities and vertical settle offsets for the
 * Airbnb-style large-title-to-compact-header handoff. Pure worklet so both
 * UI-thread Reanimated styles and Node unit tests share identical math.
 */
export function computeCollapsingHeaderMetrics(
  scrollY: number,
  titleBottom: number,
  fadeDistance: number,
  reducedMotion: boolean,
): CollapsingHeaderMetrics {
  "worklet";
  const safeBottom = Math.max(24, titleBottom);
  const safeFade = Math.max(16, fadeDistance);

  // 1. Inline large title dissolves as it approaches the header edge.
  const largeStart = Math.max(0, safeBottom - safeFade);
  const largeEnd = Math.max(largeStart + 16, safeBottom - 2);
  const largeProgress = clamp01(
    (scrollY - largeStart) / (largeEnd - largeStart),
  );
  const largeTitleOpacity = 1 - largeProgress;

  // 2. Compact centered header title rises and eases in right as the large title clears.
  const compactStart = Math.max(4, safeBottom - safeFade * 0.72);
  const compactEnd = Math.max(compactStart + 18, safeBottom + 6);
  const compactRaw = clamp01(
    (scrollY - compactStart) / (compactEnd - compactStart),
  );
  const compactTitleOpacity = easeOutCubic(compactRaw);
  const compactTitleTranslateY = reducedMotion
    ? 0
    : (1 - compactTitleOpacity) * COLLAPSING_HEADER_DEFAULTS.titleLiftPx;

  // 3. Hairline bottom border leads the compact title slightly so scrolled cards
  // tuck cleanly behind a defined edge.
  const dividerStart = Math.max(2, compactStart - 6);
  const dividerEnd = compactEnd;
  const dividerOpacity = clamp01(
    (scrollY - dividerStart) / (dividerEnd - dividerStart),
  );

  // 4. Overlay surface backdrop (for top-level tabs with no permanent top chrome)
  // reaches full opacity right before the compact title peaks.
  const backdropStart = Math.max(0, compactStart - 10);
  const backdropEnd = Math.max(backdropStart + 14, compactEnd - 4);
  const backdropOpacity = clamp01(
    (scrollY - backdropStart) / (backdropEnd - backdropStart),
  );

  return {
    largeTitleOpacity,
    compactTitleOpacity,
    compactTitleTranslateY,
    dividerOpacity,
    backdropOpacity,
  };
}

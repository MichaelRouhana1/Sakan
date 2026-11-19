/** Opt-in web sizing. Existing pages/native keep their base tokens until migrated. */
export const DESKTOP_DESIGN_SCALE = 1.10;

export function scaleLength(value: number, scale: number): number {
  if (scale === 1) return value;
  return Math.round(value * scale * 1000) / 1000;
}

export function desktopSize(value: number): number {
  return scaleLength(value, DESKTOP_DESIGN_SCALE);
}

/** Shared sizes for desktop pages adopting the 100%-display-scale design. */
export const DesktopDesign = {
  scale: DESKTOP_DESIGN_SCALE,
  layout: {
    minWidth: 900,
    contentMax: desktopSize(1400),
    gutterMin: desktopSize(40),
    gutterMax: desktopSize(80),
    relaxedWidth: 1200,
  },
  space: { xs: desktopSize(4), sm: desktopSize(8), md: desktopSize(16), lg: desktopSize(24), xl: desktopSize(32), xxl: desktopSize(48) },
  type: { caption: desktopSize(12), body: desktopSize(16), section: desktopSize(36), hero: desktopSize(56) },
  cards: { areaMax: desktopSize(300), ideal: desktopSize(240), min: desktopSize(168), gap: desktopSize(12) },
} as const;

export function desktopGutter(width: number, scale = DESKTOP_DESIGN_SCALE): number {
  const { minWidth, relaxedWidth } = DesktopDesign.layout;
  const gutterMin = scaleLength(40, scale);
  const gutterMax = scaleLength(80, scale);
  const progress = Math.min(1, Math.max(0, (width - minWidth) / (relaxedWidth - minWidth)));
  return gutterMin + (gutterMax - gutterMin) * progress;
}

// Scale lengths only: flex ratios, opacity, z-index, animation times, percentages,
// viewport units and transforms must retain their original meaning.
const lengthProperties = new Set([
  'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'flexBasis',
  'top', 'right', 'bottom', 'left', 'start', 'end',
  'fontSize', 'lineHeight', 'letterSpacing', 'textIndent', 'outlineOffset',
  'scrollMargin', 'scrollMarginTop', 'scrollMarginBottom', 'scrollMarginLeft', 'scrollMarginRight',
  'gap', 'rowGap', 'columnGap', 'shadowRadius',
  ...['padding', 'margin'].flatMap(prefix => ['', 'Top', 'Right', 'Bottom', 'Left', 'Start', 'End', 'Horizontal', 'Vertical', 'Block', 'Inline'].map(suffix => prefix + suffix)),
  ...['', 'Top', 'Right', 'Bottom', 'Left', 'Start', 'End'].map(side => `border${side}Width`),
  ...['', 'TopLeft', 'TopRight', 'BottomLeft', 'BottomRight', 'TopStart', 'TopEnd', 'BottomStart', 'BottomEnd'].map(corner => `border${corner}Radius`),
]);

/** CSS shorthands whose px lengths are design sizes. Times, colors and percentages are left alone. */
const stringLengthProperties = new Set([
  ...lengthProperties,
  'boxShadow', 'textShadow', 'border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft',
  'outline', 'clipPath', 'WebkitClipPath', 'filter', 'backdropFilter',
  'gridTemplateColumns', 'gridTemplateRows',
]);

const shadowOffsetProperties = new Set(['shadowOffset', 'textShadowOffset']);

const cache = new WeakMap<object, Map<number, object>>();

function scaleCssPx(value: string, scale: number): string {
  return value.replace(/(-?\d*\.?\d+)px\b/gi, (match, raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return match;
    return `${scaleLength(n, scale)}px`;
  });
}

function scaleStyleValue(property: string, value: unknown, scale: number): unknown {
  if (typeof value === 'number') {
    return lengthProperties.has(property) ? scaleLength(value, scale) : value;
  }
  if (typeof value === 'string') {
    if (property === 'transform' || property === 'fontFamily' || !/px/i.test(value)) return value;
    return stringLengthProperties.has(property) ? scaleCssPx(value, scale) : value;
  }
  if (value && typeof value === 'object' && !Array.isArray(value) && shadowOffsetProperties.has(property)) {
    const record = value as { width?: unknown; height?: unknown };
    return {
      ...record,
      width: typeof record.width === 'number' ? scaleLength(record.width, scale) : record.width,
      height: typeof record.height === 'number' ? scaleLength(record.height, scale) : record.height,
    };
  }
  return value;
}

/** Convert existing style lengths once, keeping a single shared scaling policy. */
export function scaleDesktopStyles<T extends object>(base: T, scale: number): T {
  if (scale === 1) return base;
  let byScale = cache.get(base);
  const cached = byScale?.get(scale);
  if (cached) return cached as T;
  const scaled = Object.fromEntries(Object.entries(base).map(([name, style]) => [
    name,
    style && typeof style === 'object'
      ? Object.fromEntries(Object.entries(style as object).map(([property, value]) => [
          property,
          scaleStyleValue(property, value, scale),
        ]))
      : style,
  ])) as T;
  if (!byScale) {
    byScale = new Map();
    cache.set(base, byScale);
  }
  byScale.set(scale, scaled);
  return scaled;
}

export function desktopStyles<T extends object>(base: T): T {
  return scaleDesktopStyles(base, DESKTOP_DESIGN_SCALE);
}

/** Lengths inside injected CSS. Unset variable keeps other pages at the authored size. */
export function desktopCssLengths(css: string): string {
  return css.replace(/(-?\d*\.?\d+)px\b/gi, (match, raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return match;
    return `calc(${raw}px * var(--sk-desktop-scale, 1))`;
  });
}

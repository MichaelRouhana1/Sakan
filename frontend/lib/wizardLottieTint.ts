import type { WizardLottieAssetId } from "@/lib/wizardLottieFrame";

type Rgba = [number, number, number, number];

/** #EA3F4A */
const BRAND_HUE = 356.14 / 360;
/** #2F6FED. Seats and every other blue in the rules animation use this hue. */
const OCEAN = rgbToHsl(47 / 255, 111 / 255, 237 / 255);
/** Lightness of the original seat fill, so that fill lands on #2F6FED. */
const SOURCE_SEAT_L = rgbToHsl(0.329, 0.686, 0.906)[2];

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h /= 6;
  if (h < 0) h += 1;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}

function isBlue(h: number, s: number, l: number, b: number, r: number): boolean {
  const hue = h * 360;
  return hue >= 165 && hue <= 255 && s > 0.12 && l > 0.08 && l < 0.97 && b > r;
}

function isShirt(h: number, s: number, l: number): boolean {
  const hue = h * 360;
  return (hue <= 20 || hue >= 340) && s > 0.18 && l > 0.22 && l < 0.9;
}

function paint(h: number, s: number, l: number, a: number): Rgba {
  const [r, g, b] = hslToRgb(h, Math.max(0, Math.min(1, s)), Math.max(0, Math.min(1, l)));
  return [r, g, b, a];
}

function retint(color: Rgba, assetId: WizardLottieAssetId): Rgba | null {
  const [r, g, b, a] = color;
  const [h, s, l] = rgbToHsl(r, g, b);
  if (assetId === "rules") {
    if (isShirt(h, s, l)) return paint(BRAND_HUE, Math.min(1, 0.5 + s * 0.4), l, a);
    if (isBlue(h, s, l, b, r)) {
      return paint(OCEAN[0], OCEAN[1], l * (OCEAN[2] / SOURCE_SEAT_L), a);
    }
    return null;
  }
  if (isBlue(h, s, l, b, r)) {
    const sat = l > 0.86 ? s : Math.min(1, s * (0.8 / 0.7));
    return paint(BRAND_HUE, sat, l, a);
  }
  return null;
}

function asColor(value: unknown): Rgba | null {
  if (!Array.isArray(value) || value.length < 4) return null;
  const [r, g, b, a] = value;
  if (![r, g, b, a].every((n) => typeof n === "number" && n >= 0 && n <= 1)) return null;
  return [r, g, b, a];
}

function tintColorSlot(slot: { k?: unknown }, assetId: WizardLottieAssetId) {
  const key = slot.k;
  const solid = asColor(key);
  if (solid) {
    const next = retint(solid, assetId);
    if (next) slot.k = next;
    return;
  }
  if (!Array.isArray(key)) return;
  for (const frame of key) {
    if (!frame || typeof frame !== "object") continue;
    const point = frame as { s?: unknown; e?: unknown };
    for (const field of ["s", "e"] as const) {
      const color = asColor(point[field]);
      if (!color) continue;
      const next = retint(color, assetId);
      if (next) point[field] = next;
    }
  }
}

function walk(node: unknown, assetId: WizardLottieAssetId) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) walk(item, assetId);
    return;
  }
  const record = node as { ty?: string; c?: { k?: unknown }; [key: string]: unknown };
  if ((record.ty === "fl" || record.ty === "st") && record.c) tintColorSlot(record.c, assetId);
  for (const value of Object.values(record)) walk(value, assetId);
}

/** Ocean keeps the authored blue. Madder recolors blue fills; the rules scene keeps a new blue seat. */
export function tintWizardLottie<T>(data: T, palette: "ocean" | "madder", assetId: WizardLottieAssetId): T {
  if (palette === "ocean") return data;
  const clone = JSON.parse(JSON.stringify(data)) as T;
  walk(clone, assetId);
  return clone;
}

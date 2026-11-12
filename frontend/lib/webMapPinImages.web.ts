/** Canvas sprites stay client-side; no glyph service or remote image is needed. */
import { readSkColor } from "@/constants/brandPalette";

export const PIN_IMAGE_PREFIX = "studently-price-image:";
export const CLUSTER_IMAGE_PREFIX = "studently-cluster-count:";
export const PIN_IMAGE_RATIO = 2;

function canvas(width: number, height: number) {
  const element = document.createElement("canvas");
  element.width = Math.ceil(width * PIN_IMAGE_RATIO);
  element.height = Math.ceil(height * PIN_IMAGE_RATIO);
  const context = element.getContext("2d");
  if (!context) throw new Error("Map pin canvas is unavailable");
  context.scale(PIN_IMAGE_RATIO, PIN_IMAGE_RATIO);
  return { element, context };
}

export function priceImageId(label: string, highlighted = false): string {
  return `${PIN_IMAGE_PREFIX}${highlighted ? 'highlight:' : ''}${encodeURIComponent(label)}`;
}

function pricePinMetrics(label: string) {
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("Map pin canvas is unavailable");
  measure.font = '600 12px "DM Sans", system-ui, sans-serif';
  const pillWidth = Math.ceil(measure.measureText(label).width) + 18;
  const width = Math.max(pillWidth, 30) + 8;
  return { pillWidth, width };
}

/** Keep a DOM popup outside the highlighted GL sprite's screen bounds. */
export function highlightedPinPopupOffset(label: string, side: "n" | "s" | "e" | "w"): [number, number] {
  if (side === "n") return [0, -(68 * 1.06 + 8)];
  if (side === "s") return [0, 8];
  const gap = pricePinMetrics(label).width * 1.06 / 2 + 8;
  return [side === "e" ? gap : -gap, 0];
}

export function makePricePinImage(label: string, highlighted = false): ImageData {
  const { pillWidth, width } = pricePinMetrics(label);
  const { element, context: ctx } = canvas(width, 72);
  const center = width / 2;
  const ink = readSkColor("ink");
  const border = readSkColor("border");
  const primary = readSkColor("primary");
  ctx.shadowColor = "rgba(18,24,38,.22)";
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = highlighted ? ink : "#FFFFFF";
  ctx.strokeStyle = highlighted ? ink : border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect((width - pillWidth) / 2, 3, pillWidth, 22, 8);
  ctx.fill();
  ctx.stroke();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = highlighted ? "#FFFFFF" : ink;
  ctx.font = '600 12px "DM Sans", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, center, 14);
  ctx.shadowColor = "rgba(18,24,38,.28)";
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = highlighted ? "#8E241A" : ink;
  ctx.beginPath();
  ctx.moveTo(center - 9, 54);
  ctx.lineTo(center + 9, 54);
  ctx.lineTo(center, 68);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = highlighted ? "#C23B2E" : primary;
  ctx.beginPath();
  ctx.arc(center, 44, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(center, 44, 5, 0, Math.PI * 2);
  ctx.fill();
  return ctx.getImageData(0, 0, element.width, element.height);
}

const compactCount = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export function formatClusterListingCount(count: number): string {
  return count < 1000 ? String(count) : compactCount.format(count);
}

export function makeClusterCountImage(count: number): ImageData {
  const label = formatClusterListingCount(count);
  const font = '700 16px "DM Sans", system-ui, sans-serif';
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("Map count canvas is unavailable");
  measure.font = font;
  const { element, context: ctx } = canvas(Math.max(36, measure.measureText(label).width + 8), 24);
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(label, element.width / PIN_IMAGE_RATIO / 2, 12);
  return ctx.getImageData(0, 0, element.width, element.height);
}

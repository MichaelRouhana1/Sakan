import { memo, useId } from "react";
import { StyleSheet } from "react-native";
import Svg, { ClipPath, Defs, Path, Rect } from "react-native-svg";

export type TicketTear =
  | { axis: "vertical"; at: number }
  | { axis: "horizontal"; at: number };

type Props = {
  w: number;
  h: number;
  /** Diameter of the concave corner bites. */
  corner: number;
  /** Diameter of the tear punches at either end of the perforation. */
  notch: number;
  tear: TicketTear;
  fill: string;
  stubFill: string;
  stubOpacity?: number;
};

/**
 * No SVG filters here on purpose: a per-card Gaussian blur rasterises a
 * ~415x308pt region x5 primitives on the CPU for every card in the list
 * (~2GB across 94 cards) and gets the app jetsammed. The shadow is cast
 * natively by the parent (see BenefitCard `shadowHost`).
 */
const PAD = 0;

/**
 * Ticket outline traced clockwise from just after the top-left bite.
 * Every arc is concave (sweep=0 while going clockwise), so corners read as
 * bites and the tear punches read as half-circles cut into the edge.
 */
export function ticketOutline(
  w: number,
  h: number,
  corner: number,
  notch: number,
  tear: TicketTear,
): string {
  const cr = corner / 2;
  const nr = notch / 2;
  const at = Math.min(
    Math.max(cr + nr, tear.at),
    (tear.axis === "vertical" ? w : h) - cr - nr,
  );
  const bite = (x: number, y: number) => `A ${cr} ${cr} 0 0 0 ${x} ${y}`;
  const punch = (x: number, y: number) => `A ${nr} ${nr} 0 0 0 ${x} ${y}`;
  const vertical = tear.axis === "vertical";

  let d = `M ${cr} 0`;
  if (vertical) d += ` L ${at - nr} 0 ${punch(at + nr, 0)}`;
  d += ` L ${w - cr} 0 ${bite(w, cr)}`;
  if (!vertical) d += ` L ${w} ${at - nr} ${punch(w, at + nr)}`;
  d += ` L ${w} ${h - cr} ${bite(w - cr, h)}`;
  if (vertical) d += ` L ${at + nr} ${h} ${punch(at - nr, h)}`;
  d += ` L ${cr} ${h} ${bite(0, h - cr)}`;
  if (!vertical) d += ` L 0 ${at + nr} ${punch(0, at - nr)}`;
  d += ` L 0 ${cr} ${bite(cr, 0)} Z`;
  return d;
}

/**
 * Native-only ticket surface. Web masks the DOM box with an SVG luminance
 * mask and casts a CSS drop-shadow; native has neither, so this draws the
 * silhouette and the tinted stub. Only cheap path fills — no filters.
 */
function TicketBackdropBase({
  w,
  h,
  corner,
  notch,
  tear,
  fill,
  stubFill,
  stubOpacity = 1,
}: Props) {
  const clipId = useId().replace(/:/g, "");
  if (w < 8 || h < 8) return null;

  const d = ticketOutline(w, h, corner, notch, tear);
  const stub =
    tear.axis === "vertical"
      ? { x: tear.at, y: 0, width: Math.max(0, w - tear.at), height: h }
      : { x: 0, y: tear.at, width: w, height: Math.max(0, h - tear.at) };

  return (
    <Svg
      pointerEvents="none"
      style={styles.svg}
      width={w + PAD * 2}
      height={h + PAD * 2}
      viewBox={`${-PAD} ${-PAD} ${w + PAD * 2} ${h + PAD * 2}`}
    >
      <Defs>
        <ClipPath id={clipId}>
          <Path d={d} />
        </ClipPath>
      </Defs>
      <Path d={d} fill={fill} />
      <Rect
        x={stub.x}
        y={stub.y}
        width={stub.width}
        height={stub.height}
        fill={stubFill}
        fillOpacity={stubOpacity}
        clipPath={`url(#${clipId})`}
      />
    </Svg>
  );
}

export const TicketBackdrop = memo(TicketBackdropBase);

const styles = StyleSheet.create({
  svg: {
    position: "absolute",
    top: -PAD,
    left: -PAD,
  },
});

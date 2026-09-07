import { Platform } from "react-native";

/** Web drop-shadow for masked tickets — follows the cutout silhouette. */
export const TICKET_SHADOW =
  "drop-shadow(0 6px 12px rgba(18, 24, 38, 0.16)) drop-shadow(0 16px 32px rgba(18, 24, 38, 0.22))";

export type TicketTear =
  | { axis: "vertical"; x: number }
  | { axis: "horizontal"; y: number };

type Options = {
  w: number;
  h: number;
  /** Diameter of the concave corner bites. */
  corner: number;
  /** Diameter of the tear punches at either end of the perforation. */
  notch: number;
  tear: TicketTear | null;
};

/**
 * Web-only SVG luminance mask that punches concave corners and tear notches
 * out of a ticket surface — white keeps, black removes. Native callers paint
 * page-coloured circles instead (see BenefitHeroTicket / BenefitRedeemPanel).
 */
export function ticketMaskStyle({ w, h, corner, notch, tear }: Options): object {
  if (Platform.OS !== "web" || w < 8 || h < 8) return {};

  const cr = corner / 2;
  const nr = notch / 2;

  let cutouts = "";
  if (tear?.axis === "vertical") {
    const x = Math.min(Math.max(cr + nr, tear.x), w - cr - nr);
    cutouts = `<circle cx="${x}" cy="0" r="${nr}" fill="#000"/><circle cx="${x}" cy="${h}" r="${nr}" fill="#000"/>`;
  } else if (tear?.axis === "horizontal") {
    const y = Math.min(Math.max(cr + nr, tear.y), h - cr - nr);
    cutouts = `<circle cx="0" cy="${y}" r="${nr}" fill="#000"/><circle cx="${w}" cy="${y}" r="${nr}" fill="#000"/>`;
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">` +
    `<rect width="${w}" height="${h}" fill="#fff"/>` +
    `<circle cx="0" cy="0" r="${cr}" fill="#000"/><circle cx="${w}" cy="0" r="${cr}" fill="#000"/>` +
    `<circle cx="0" cy="${h}" r="${cr}" fill="#000"/><circle cx="${w}" cy="${h}" r="${cr}" fill="#000"/>` +
    cutouts +
    `</svg>`;

  const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  return {
    maskImage: url,
    WebkitMaskImage: url,
    maskSize: "100% 100%",
    WebkitMaskSize: "100% 100%",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskMode: "luminance",
  };
}

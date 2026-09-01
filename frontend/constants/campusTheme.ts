import { Lister } from "./listerTheme";

/**
 * Campus product tokens — same Skoun bank-blue system as Housing.
 * Aliases (`paper`, `hairline`) keep existing Campus screens compiling
 * while mapping onto `bg` / `border`.
 */
export const Campus = {
  color: {
    ...Lister.color,
    paper: Lister.color.bg,
    paperDeep: Lister.color.bgWash,
    hairline: Lister.color.border,
    hairlineStrong: Lister.color.borderStrong,
    rule: Lister.color.border,
  },
  space: Lister.space,
  radius: Lister.radius,
  type: {
    display: Lister.type.display,
    body: Lister.type.body,
    bodyMedium: Lister.type.bodyMedium,
    bodySemi: Lister.type.bodySemi,
    bodyBold: Lister.type.bodyBold,
  },
  motion: Lister.motion,
} as const;

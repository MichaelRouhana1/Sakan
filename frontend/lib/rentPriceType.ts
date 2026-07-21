import type { TextStyle } from "react-native";
import { Lister } from "@/constants/listerTheme";

/**
 * Rent / price type — UI tabular sans, never display/title faces.
 * Use with LText variant="body" (or caption for map pills).
 */
export const rentPriceType: TextStyle = {
  fontFamily: Lister.type.bodyBold,
  fontVariant: ["tabular-nums"],
};

/** Compact map / chip prices. */
export const rentPriceTypeCompact: TextStyle = {
  fontFamily: Lister.type.bodySemi,
  fontVariant: ["tabular-nums"],
  fontSize: 12,
  lineHeight: 16,
};

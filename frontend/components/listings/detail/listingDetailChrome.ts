import { StyleSheet } from "react-native";
import { Skoun } from "@/constants/theme";

/** Shared listing-detail sections: cards on mobile, un-carded on desktop. */
export type ListingDetailVariant = "card" | "web";

export const listingDetailChrome = StyleSheet.create({
  card: {
    backgroundColor: Skoun.color.surface,
    borderRadius: Skoun.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  web: {
    paddingHorizontal: 24,
  },
  cardHeading: { fontSize: 18 },
  webHeading: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    fontFamily: Skoun.type.bodyBold,
  },
});

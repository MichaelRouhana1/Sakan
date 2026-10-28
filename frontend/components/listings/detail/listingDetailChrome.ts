import { StyleSheet } from "react-native";
import { Studently } from "@/constants/theme";

/** Shared listing-detail sections: cards on mobile, un-carded on desktop. */
export type ListingDetailVariant = "card" | "web";

export const listingDetailChrome = StyleSheet.create({
  card: {
    backgroundColor: Studently.color.surface,
    borderRadius: Studently.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Studently.color.border,
  },
  web: {
    paddingHorizontal: 24,
  },
  cardHeading: { fontSize: 18 },
  webHeading: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    fontFamily: Studently.type.bodyBold,
  },
});

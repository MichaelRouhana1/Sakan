import { StyleSheet, Text, View } from "react-native";
import { Skoun } from "@/constants/theme";
import type { ListingAvailability } from "@/types/listing";

export function availabilityLabel(
  availability: ListingAvailability | null | undefined,
): string | null {
  if (availability === "pending") return "Under offer";
  if (availability === "rented") return "Rented";
  return null;
}

/** Renter-facing offer badge. Available listings stay unmarked. */
export function ListingAvailabilityBadge({
  availability,
}: {
  availability?: ListingAvailability | null;
}) {
  const label = availabilityLabel(availability);
  if (!label) return null;
  const pending = availability === "pending";
  return (
    <View
      style={[styles.badge, pending ? styles.pending : styles.rented]}
      accessibilityLabel={label}
    >
      <Text style={[styles.text, pending ? styles.pendingText : styles.rentedText]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  pending: {
    backgroundColor: "#FEF3C7",
    borderColor: "rgba(146, 64, 14, 0.28)",
  },
  rented: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
  },
  text: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.2,
  },
  pendingText: {
    color: "#92400E",
  },
  rentedText: {
    color: Skoun.color.inkMuted,
  },
});

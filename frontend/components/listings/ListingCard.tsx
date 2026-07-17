import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { formatFreshUsd } from "@/lib/format";
import type { Listing } from "@/types/listing";
import { UtilityBadges } from "./UtilityBadges";

type Props = {
  listing: Listing;
  onPress?: () => void;
};

export function ListingCard({ listing, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.area}>{listing.area}</Text>
        <Text style={styles.price}>{formatFreshUsd(listing.monthlyRentUsd)}</Text>
      </View>
      <Text style={styles.type}>{listing.listingType.replace(/_/g, " ")}</Text>
      <UtilityBadges listing={listing} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#d0d0d0",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  area: {
    fontWeight: "700",
    fontSize: 17,
  },
  price: {
    fontWeight: "600",
    color: "#0B6E4F",
  },
  type: {
    marginBottom: 8,
    textTransform: "capitalize",
    color: "#555",
  },
});

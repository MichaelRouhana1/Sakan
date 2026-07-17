import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Linking, StyleSheet, View } from "react-native";
import { UtilityBadges } from "@/components/listings/UtilityBadges";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useListing } from "@/features/listings/useListing";
import { formatFreshUsd } from "@/lib/format";
import { buildWhatsAppListingUrl } from "@/lib/whatsapp";

export default function RenterListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: listing, isLoading, isError } = useListing(id ?? "");

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isError || !listing) {
    return (
      <View style={styles.center}>
        <Text>Listing not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.area}>{listing.area}</Text>
      <Text style={styles.price}>{formatFreshUsd(listing.monthlyRentUsd)}</Text>
      <Text style={styles.type}>{listing.listingType.replace(/_/g, " ")}</Text>
      <UtilityBadges listing={listing} />
      <Button
        label="Contact on WhatsApp"
        style={styles.cta}
        onPress={() => {
          // Poster phone wired when auth/listing join is available
          const url = buildWhatsAppListingUrl({
            phone: "96100000000",
            propertyType: listing.listingType,
            area: listing.area,
          });
          void Linking.openURL(url);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
    gap: 8,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  area: {
    fontSize: 24,
    fontWeight: "800",
  },
  price: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0B6E4F",
  },
  type: {
    textTransform: "capitalize",
    color: "#555",
    marginBottom: 8,
  },
  cta: {
    marginTop: 24,
  },
});

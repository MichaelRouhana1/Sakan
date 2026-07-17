import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useListing } from "@/features/listings/useListing";

export default function PosterListingDetailScreen() {
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
      <Text style={styles.title}>{listing.area}</Text>
      <Text>Status: {listing.status}</Text>
      <Text>Views: {listing.viewCount}</Text>
      <Text>
        Expires:{" "}
        {listing.expiresAt
          ? new Date(listing.expiresAt).toLocaleDateString()
          : "—"}
      </Text>
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
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
});

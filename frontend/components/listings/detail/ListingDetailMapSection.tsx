import { StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { ListingPinMap } from "@/components/listings/detail/ListingPinMap";
import { Skoun } from "@/constants/theme";
import { formatDistanceMeters } from "@/lib/formatDistance";
import type { Listing } from "@/types/listing";

type Props = {
  listing: Listing;
};

export function ListingDetailMapSection({ listing }: Props) {
  if (listing.lat == null || listing.lng == null) return null;
  const distance = formatDistanceMeters(
    listing.distanceMeters,
    listing.nearestCampusName,
  );

  return (
    <View style={styles.card}>
      <LText variant="title" style={styles.heading}>
        Nearby locations and map
      </LText>
      <View style={styles.mapClip}>
        <ListingPinMap
          lat={listing.lat}
          lng={listing.lng}
          height={220}
          interactive
        />
      </View>
      {distance ? (
        <View style={styles.row}>
          <LText variant="body" style={{ flex: 1 }}>
            {listing.nearestCampusName ?? "Campus"}
          </LText>
          <LText variant="caption" tone="muted">
            {distance}
          </LText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Skoun.color.surface,
    borderRadius: Skoun.radius.lg,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  heading: { fontSize: 18 },
  mapClip: {
    borderRadius: Skoun.radius.md,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
  },
});

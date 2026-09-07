import { StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { ListingPinMap } from "@/components/listings/detail/ListingPinMap";
import { InstitutionLogo } from "@/components/universities/InstitutionLogo";
import { Skoun } from "@/constants/theme";
import { useUniversities } from "@/features/universities/useUniversities";
import { formatDistanceShort } from "@/lib/formatDistance";
import { nearbyCampusesForListing } from "@/lib/nearbyCampuses";
import type { Listing } from "@/types/listing";

type Props = {
  listing: Listing;
};

export function ListingDetailMapSection({ listing }: Props) {
  const campuses = useUniversities();
  if (listing.lat == null || listing.lng == null) return null;

  const nearby = nearbyCampusesForListing(listing, campuses.data ?? []);
  const nearest = nearby[0] ?? null;
  const dist = formatDistanceShort(nearest?.meters ?? listing.distanceMeters);
  const campusName = nearest?.name ?? listing.nearestCampusName;

  return (
    <View style={styles.wrap}>
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
      {campusName ? (
        <View style={styles.row}>
          <InstitutionLogo
            shortName={nearest?.shortName ?? campusName.slice(0, 3)}
            slug={nearest?.institutionSlug ?? listing.nearestCampusSlug}
            logoUrl={nearest?.logoUrl ?? null}
            size={28}
          />
          <LText variant="body" style={styles.name} numberOfLines={1}>
            {campusName}
          </LText>
          {dist ? (
            <LText variant="caption" tone="muted">
              {dist}
            </LText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
    paddingHorizontal: 24,
  },
  heading: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    fontFamily: Skoun.type.bodyBold,
  },
  mapClip: {
    borderRadius: Skoun.radius.md,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 4,
  },
  name: {
    flex: 1,
    minWidth: 0,
    fontFamily: Skoun.type.bodySemi,
  },
});

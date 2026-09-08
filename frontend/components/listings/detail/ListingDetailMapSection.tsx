import { StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import {
  listingDetailChrome as chrome,
  type ListingDetailVariant,
} from "@/components/listings/detail/listingDetailChrome";
import { ListingPinMap } from "@/components/listings/detail/ListingPinMap";
import { InstitutionLogo } from "@/components/universities/InstitutionLogo";
import { Skoun } from "@/constants/theme";
import { useUniversities } from "@/features/universities/useUniversities";
import {
  formatDistanceMeters,
  formatDistanceShort,
} from "@/lib/formatDistance";
import { nearbyCampusesForListing } from "@/lib/nearbyCampuses";
import type { Listing } from "@/types/listing";

type Props = {
  listing: Listing;
  variant?: ListingDetailVariant;
};

export function ListingDetailMapSection({ listing, variant = "card" }: Props) {
  const campuses = useUniversities();
  if (listing.lat == null || listing.lng == null) return null;

  const web = variant === "web";
  const nearby = nearbyCampusesForListing(listing, campuses.data ?? []);
  const nearest = nearby[0] ?? null;
  const dist = formatDistanceShort(nearest?.meters ?? listing.distanceMeters);
  const campusName = nearest?.name ?? listing.nearestCampusName;
  const distance = formatDistanceMeters(
    listing.distanceMeters,
    listing.nearestCampusName,
  );

  return (
    <View style={[web ? chrome.web : chrome.card, styles.gap]}>
      <LText variant="title" style={web ? chrome.webHeading : chrome.cardHeading}>
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
      {web ? (
        campusName ? (
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
        ) : null
      ) : distance ? (
        <View style={styles.cardRow}>
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
  gap: { gap: 12 },
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
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
  },
  name: {
    flex: 1,
    minWidth: 0,
    fontFamily: Skoun.type.bodySemi,
  },
});

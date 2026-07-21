import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { NearLandmark } from "@/components/listings/NearLandmark";
import { Skoun } from "@/constants/theme";
import { formatFreshUsd } from "@/lib/format";
import { formatDistanceMeters } from "@/lib/formatDistance";
import { labelGenderRestriction, labelListingType } from "@/lib/listingLabels";
import { rentPriceType } from "@/lib/rentPriceType";
import type { Listing } from "@/types/listing";

type Props = {
  listings: Listing[];
  showDistance?: boolean;
  onSelect: (listing: Listing) => void;
  onDismiss?: () => void;
};

/**
 * Multi-listing picker when several homes share one map pin (same building).
 */
export function ListingMapPicker({
  listings,
  showDistance,
  onSelect,
  onDismiss,
}: Props) {
  const count = listings.length;

  return (
    <View
      style={styles.shell}
      accessibilityRole="menu"
      accessibilityLabel={`${count} listings at this location`}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <LText variant="subtitle">{count} places here</LText>
          <LText variant="caption" tone="muted">
            Same pin — pick one to preview
          </LText>
        </View>
        {onDismiss ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss picker"
            onPress={onDismiss}
            hitSlop={10}
            style={styles.dismiss}
          >
            <Ionicons name="close" size={18} color={Skoun.color.inkMuted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {listings.map((listing) => {
          const cover = listing.coverUrl ?? listing.photos[0]?.url ?? null;
          const distance = showDistance
            ? formatDistanceMeters(
                listing.distanceMeters,
                listing.nearestCampusName,
              )
            : null;

          return (
            <Pressable
              key={listing.id}
              accessibilityRole="menuitem"
              accessibilityLabel={`${listing.area}, ${formatFreshUsd(listing.monthlyRentUsd)}${distance ? `, ${distance}` : ""}`}
              onPress={() => onSelect(listing)}
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
              ]}
            >
              <View style={styles.thumb}>
                {cover ? (
                  <Image
                    source={{ uri: cover }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={180}
                  />
                ) : (
                  <View style={styles.thumbFallback}>
                    <Ionicons
                      name="home-outline"
                      size={18}
                      color={Skoun.color.inkFaint}
                    />
                  </View>
                )}
              </View>

              <View style={styles.rowBody}>
                <LText
                  variant="body"
                  style={[rentPriceType, styles.price]}
                  numberOfLines={1}
                >
                  {formatFreshUsd(listing.monthlyRentUsd)}
                </LText>
                <LText variant="caption" tone="muted" numberOfLines={1}>
                  {labelListingType(listing.listingType)}
                  {listing.targetAudience === "students_only"
                    ? " · Students"
                    : ""}
                  {listing.genderRestriction !== "anyone"
                    ? ` · ${labelGenderRestriction(listing.genderRestriction)}`
                    : ""}
                </LText>
                <NearLandmark landmark={listing.landmark} compact />
                {distance ? (
                  <View style={styles.distance}>
                    <Ionicons
                      name="navigate-outline"
                      size={13}
                      color={Skoun.color.primary}
                    />
                    <LText
                      variant="caption"
                      tone="primary"
                      style={styles.distanceText}
                    >
                      {distance}
                    </LText>
                  </View>
                ) : null}
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={Skoun.color.inkFaint}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: Skoun.radius.lg,
    backgroundColor: Skoun.color.surface,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    overflow: "hidden",
    maxHeight: 280,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: Skoun.space.md,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Skoun.color.border,
    backgroundColor: Skoun.color.primaryMist,
  },
  headerCopy: { flex: 1, gap: 2 },
  dismiss: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Skoun.color.surface,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { maxHeight: 220 },
  listContent: { paddingVertical: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: Skoun.space.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Skoun.color.border,
  },
  rowPressed: {
    backgroundColor: Skoun.color.primaryMist,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Skoun.radius.sm,
    overflow: "hidden",
    backgroundColor: Skoun.color.bgWash,
  },
  thumbFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Skoun.color.primaryMist,
  },
  rowBody: { flex: 1, gap: 2 },
  price: {
    fontSize: 15,
    lineHeight: 20,
  },
  distance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  distanceText: {
    fontFamily: Skoun.type.bodySemi,
  },
});

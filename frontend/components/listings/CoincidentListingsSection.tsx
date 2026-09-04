import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { NearLandmark } from "@/components/listings/NearLandmark";
import { Skoun } from "@/constants/theme";
import { formatFreshUsd } from "@/lib/format";
import { labelGenderRestriction, labelListingType } from "@/lib/listingLabels";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { rentPriceType } from "@/lib/rentPriceType";
import type { Listing } from "@/types/listing";

type Props = {
  listings: Listing[];
};

/**
 * Sibling units at the same map pin (~10m). Hidden by the parent when empty.
 */
export function CoincidentListingsSection({ listings }: Props) {
  if (listings.length === 0) return null;

  return (
    <View
      style={styles.shell}
      accessibilityRole="summary"
      accessibilityLabel={`${listings.length} more listings at this location`}
    >
      <View style={styles.header}>
        <LText variant="subtitle">More at this location</LText>
        <LText variant="caption" tone="muted">
          Other active listings within ~10m (same building)
        </LText>
      </View>

      <View style={styles.list}>
        {listings.map((listing) => {
          const cover = resolveMediaUrl(
            listing.coverUrl ?? listing.photos[0]?.url ?? null,
          );

          return (
            <Pressable
              key={listing.id}
              accessibilityRole="button"
              accessibilityLabel={`${listing.area}, ${formatFreshUsd(listing.monthlyRentUsd)}`}
              onPress={() =>
                router.push(`/(renter)/listing/${listing.id}` as never)
              }
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
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={Skoun.color.inkFaint}
              />
            </Pressable>
          );
        })}
      </View>
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
  },
  header: {
    gap: 2,
    paddingHorizontal: Skoun.space.md,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Skoun.color.border,
    backgroundColor: Skoun.color.primaryMist,
  },
  list: { paddingVertical: 4 },
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
});

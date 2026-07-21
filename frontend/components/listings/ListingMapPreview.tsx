import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { NearLandmark } from "@/components/listings/NearLandmark";
import { Skoun } from "@/constants/theme";
import { formatFreshUsd } from "@/lib/format";
import { formatDistanceMeters } from "@/lib/formatDistance";
import { labelGenderRestriction, labelListingType } from "@/lib/listingLabels";
import { rentPriceType } from "@/lib/rentPriceType";
import type { Listing } from "@/types/listing";

type Props = {
  listing: Listing;
  showDistance?: boolean;
  onPress?: () => void;
  onDismiss?: () => void;
};

/**
 * Floating bottom preview — reuses ListingCard cover / meta patterns.
 */
export function ListingMapPreview({
  listing,
  showDistance,
  onPress,
  onDismiss,
}: Props) {
  const distance = showDistance
    ? formatDistanceMeters(
        listing.distanceMeters,
        listing.nearestCampusName,
      )
    : null;
  const cover = listing.coverUrl ?? listing.photos[0]?.url ?? null;

  return (
    <View style={styles.shell}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${listing.area}, ${formatFreshUsd(listing.monthlyRentUsd)}. Open listing.`}
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.cover}>
          {cover ? (
            <Image
              source={{ uri: cover }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={220}
            />
          ) : (
            <View style={styles.coverFallback}>
              <Ionicons
                name="home-outline"
                size={22}
                color={Skoun.color.inkFaint}
              />
            </View>
          )}
          <LinearGradient
            colors={["transparent", "rgba(20,36,30,0.78)"]}
            locations={[0.35, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.coverMeta}>
            <View style={styles.coverChips}>
              {listing.targetAudience === "students_only" ? (
                <View style={styles.studentChip}>
                  <Ionicons
                    name="school-outline"
                    size={11}
                    color={Skoun.color.brass}
                  />
                  <LText variant="caption" style={styles.studentLabel}>
                    Students
                  </LText>
                </View>
              ) : null}
              {listing.genderRestriction !== "anyone" ? (
                <View style={styles.genderChip}>
                  <LText variant="caption" style={styles.genderLabel}>
                    {labelGenderRestriction(listing.genderRestriction)}
                  </LText>
                </View>
              ) : null}
            </View>
            <LText variant="body" style={[rentPriceType, styles.priceOnImage]}>
              {formatFreshUsd(listing.monthlyRentUsd)}
            </LText>
          </View>
        </View>

        <View style={styles.body}>
          <LText variant="subtitle" numberOfLines={1}>
            {listing.area}
          </LText>
          <LText variant="caption" tone="muted" numberOfLines={1}>
            {labelListingType(listing.listingType)}
          </LText>
          <NearLandmark landmark={listing.landmark} compact />
          {distance ? (
            <View style={styles.distance}>
              <Ionicons
                name="navigate-outline"
                size={14}
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
      </Pressable>

      {onDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss preview"
          onPress={onDismiss}
          hitSlop={10}
          style={styles.dismiss}
        >
          <Ionicons name="close" size={18} color={Skoun.color.inkMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: "relative",
  },
  card: {
    borderRadius: Skoun.radius.lg,
    overflow: "hidden",
    backgroundColor: Skoun.color.surface,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    flexDirection: "row",
    minHeight: 112,
  },
  pressed: { opacity: 0.92 },
  cover: {
    width: 118,
    backgroundColor: Skoun.color.bgWash,
  },
  coverFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Skoun.color.primaryMist,
  },
  coverMeta: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 6,
  },
  coverChips: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    alignItems: "center",
  },
  priceOnImage: {
    color: Skoun.color.surface,
    fontSize: 16,
    lineHeight: 20,
  },
  studentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(243,235,214,0.92)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Skoun.radius.pill,
    borderWidth: 1,
    borderColor: Skoun.color.brass,
  },
  studentLabel: {
    color: Skoun.color.draft,
    fontFamily: Skoun.type.bodySemi,
    fontSize: 10,
  },
  genderChip: {
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Skoun.radius.pill,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  genderLabel: {
    color: Skoun.color.ink,
    fontFamily: Skoun.type.bodySemi,
    fontSize: 10,
  },
  body: {
    flex: 1,
    padding: Skoun.space.md,
    gap: 4,
    justifyContent: "center",
  },
  distance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  distanceText: {
    fontFamily: Skoun.type.bodySemi,
  },
  dismiss: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: Skoun.color.border,
    alignItems: "center",
    justifyContent: "center",
  },
});

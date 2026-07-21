import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import { formatFreshUsd } from "@/lib/format";
import { formatDistanceMeters } from "@/lib/formatDistance";
import { labelGenderRestriction, labelListingType } from "@/lib/listingLabels";
import { rentPriceType } from "@/lib/rentPriceType";
import type { Listing } from "@/types/listing";
import { NearLandmark } from "./NearLandmark";
import { UtilityBadges } from "./UtilityBadges";

type Props = {
  listing: Listing;
  index?: number;
  onPress?: () => void;
  showDistance?: boolean;
};

export function ListingCard({ listing, onPress, showDistance }: Props) {
  const distance = showDistance
    ? formatDistanceMeters(
        listing.distanceMeters,
        listing.nearestCampusName,
      )
    : null;
  const cover = listing.coverUrl ?? listing.photos[0]?.url ?? null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${listing.area}, ${formatFreshUsd(listing.monthlyRentUsd)}`}
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
              size={28}
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
                  size={12}
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
        <UtilityBadges listing={listing} compact />
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
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Skoun.radius.lg,
    overflow: "hidden",
    backgroundColor: Skoun.color.surface,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  pressed: { opacity: 0.92 },
  cover: {
    height: 188,
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
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 8,
  },
  coverChips: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  priceOnImage: {
    color: Skoun.color.surface,
    fontSize: 20,
    lineHeight: 24,
  },
  studentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(243,235,214,0.92)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Skoun.radius.pill,
    borderWidth: 1,
    borderColor: Skoun.color.brass,
  },
  studentLabel: {
    color: Skoun.color.draft,
    fontFamily: Skoun.type.bodySemi,
  },
  genderChip: {
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Skoun.radius.pill,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  genderLabel: {
    color: Skoun.color.ink,
    fontFamily: Skoun.type.bodySemi,
  },
  body: {
    padding: Skoun.space.md,
    gap: 8,
  },
  distance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  distanceText: {
    fontFamily: Skoun.type.bodySemi,
  },
});

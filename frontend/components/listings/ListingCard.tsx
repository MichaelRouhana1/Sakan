import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  useIsSaved,
  useToggleSaved,
} from "@/features/saved/useSavedListings";
import { Skoun } from "@/constants/theme";
import { formatFreshUsd } from "@/lib/format";
import {
  formatCampusWalkLine,
  listingAmberPills,
  listingCardSubtitle,
  listingCardTitle,
} from "@/lib/listingCardMeta";
import { labelListingType } from "@/lib/listingLabels";
import type { Listing } from "@/types/listing";

type Props = {
  listing: Listing;
  index?: number;
  onPress?: () => void;
  showDistance?: boolean;
};

const CARD_BORDER = "#E2E8F0";

export function ListingCard({ listing, onPress, showDistance }: Props) {
  const cover = listing.coverUrl ?? listing.photos[0]?.url ?? null;
  const title = listingCardTitle(listing);
  const subtitle = listingCardSubtitle(listing);
  const rentLabel = formatFreshUsd(listing.monthlyRentUsd);
  const typeBadge = labelListingType(listing.listingType);
  const proximity = showDistance
    ? formatCampusWalkLine(
        listing.distanceMeters,
        listing.nearestCampusName,
      )
    : null;
  const pills = listingAmberPills(listing);
  const { data: isSaved = false } = useIsSaved(listing.id);
  const toggleSaved = useToggleSaved();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${rentLabel} per month`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.media}>
        {cover ? (
          <Image
            source={{ uri: cover }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={220}
          />
        ) : (
          <View style={styles.mediaFallback}>
            <Ionicons
              name="home-outline"
              size={28}
              color={Skoun.color.inkFaint}
            />
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isSaved ? "Remove from saved" : "Save listing"}
          hitSlop={8}
          onPress={(e) => {
            e?.stopPropagation?.();
            toggleSaved.mutate(listing);
          }}
          style={styles.heart}
        >
          <Text style={[styles.heartGlyph, isSaved && styles.heartOn]}>
            {isSaved ? "♥" : "♡"}
          </Text>
        </Pressable>

        <View style={styles.mediaBadge}>
          <Text style={styles.mediaBadgeText} numberOfLines={1}>
            {rentLabel}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {subtitle} · {typeBadge}
        </Text>

        {proximity ? (
          <Text style={styles.proximity} numberOfLines={2}>
            {proximity}
          </Text>
        ) : null}

        {pills.length > 0 ? (
          <View style={styles.tags}>
            {pills.map((pill) => (
              <View key={pill.key} style={styles.tag}>
                <Text style={styles.tagText}>{pill.label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.priceRow}>
          <View>
            <Text style={styles.priceFrom}>FROM</Text>
            <Text style={styles.price}>
              {rentLabel}
              <Text style={styles.priceUnit}> / mo</Text>
            </Text>
          </View>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>View Listing</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: Skoun.color.surface,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  pressed: { opacity: 0.94 },
  media: {
    height: 188,
    backgroundColor: Skoun.color.bgWash,
    position: "relative",
  },
  mediaFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Skoun.color.primaryMist,
  },
  heart: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  heartGlyph: {
    fontSize: 16,
    color: Skoun.color.inkMuted,
  },
  heartOn: {
    color: Skoun.color.primary,
  },
  mediaBadge: {
    position: "absolute",
    left: 10,
    bottom: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(18,24,38,0.72)",
  },
  mediaBadgeText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 12,
    color: "#FFFFFF",
  },
  body: {
    padding: 14,
    gap: 6,
  },
  title: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 16,
    color: Skoun.color.ink,
    letterSpacing: -0.2,
  },
  meta: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    color: Skoun.color.inkMuted,
  },
  proximity: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    color: Skoun.color.inkMuted,
    lineHeight: 17,
    marginTop: 2,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  tag: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  tagText: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 12,
    color: Skoun.color.ink,
  },
  priceRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  priceFrom: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 11,
    color: Skoun.color.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  price: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 20,
    color: Skoun.color.ink,
    letterSpacing: -0.3,
  },
  priceUnit: {
    fontSize: 13,
    fontFamily: Skoun.type.bodyMedium,
    color: Skoun.color.inkMuted,
  },
  cta: {
    backgroundColor: Skoun.color.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  ctaText: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 13,
    color: "#FFFFFF",
  },
});

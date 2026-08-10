import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ListingCardCarousel } from "@/components/listings/ListingCardCarousel";
import {
  ListingFeatureBadge,
  ListingRatingBadge,
  listingImageCornerBadge,
} from "@/components/listings/ListingRatingBadge";
import {
  useIsSaved,
  useToggleSaved,
} from "@/features/saved/useSavedListings";
import { Skoun } from "@/constants/theme";
import { formatFreshUsd } from "@/lib/format";
import {
  formatCampusWalkLine,
  listingAmberPillGroups,
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

function photoUrls(listing: Listing): string[] {
  const fromPhotos = (listing.photos ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => p.url)
    .filter(Boolean);
  if (fromPhotos.length > 0) return fromPhotos;
  return listing.coverUrl ? [listing.coverUrl] : [];
}

function ImageCornerBadge({ listing }: { listing: Listing }) {
  const badge = listingImageCornerBadge(listing);
  if (!badge) return null;
  if (badge.kind === "rating") {
    return (
      <ListingRatingBadge
        rating={badge.rating!}
        reviewCount={badge.reviewCount!}
      />
    );
  }
  return <ListingFeatureBadge label={badge.label!} />;
}

export function ListingCard({ listing, onPress, showDistance }: Props) {
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
  const { highlights, amenities } = listingAmberPillGroups(listing);
  const { data: isSaved = false } = useIsSaved(listing.id);
  const toggleSaved = useToggleSaved();
  const urls = photoUrls(listing);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${rentLabel} per month`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.mediaShell}>
        <ListingCardCarousel urls={urls} alwaysShowArrows />
        <ImageCornerBadge listing={listing} />
      </View>

      {/* Column 2 — details */}
      <View style={styles.middle}>
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

        <View style={styles.divider} />

        {highlights.length > 0 ? (
          <View style={styles.tags}>
            {highlights.map((pill) => (
              <View key={pill.key} style={[styles.tag, styles.tagHighlight]}>
                <Text style={styles.tagText}>{pill.label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {amenities.length > 0 ? (
          <View style={styles.tags}>
            {amenities.map((pill) => (
              <View key={pill.key} style={styles.tag}>
                <Text style={styles.tagText}>{pill.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {/* Column 3 — favorite + price + CTA */}
      <View style={styles.rightCol}>
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
          <Ionicons
            name={isSaved ? "heart" : "heart-outline"}
            size={20}
            color={isSaved ? "#C23B2E" : "#475569"}
          />
        </Pressable>

        <View style={styles.priceBlock}>
          <Text style={styles.priceFrom}>From</Text>
          <Text style={styles.price}>
            {rentLabel}
            <Text style={styles.priceUnit}> / month</Text>
          </Text>
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
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 168,
  },
  pressed: { opacity: 0.94 },
  mediaShell: {
    position: "relative",
    width: 118,
    alignSelf: "stretch",
    flexShrink: 0,
    overflow: "hidden",
  },
  middle: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 4,
  },
  title: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 14,
    color: Skoun.color.ink,
    letterSpacing: -0.2,
  },
  meta: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    color: Skoun.color.inkMuted,
  },
  proximity: {
    fontFamily: Skoun.type.body,
    fontSize: 11,
    color: Skoun.color.inkMuted,
    lineHeight: 15,
    marginTop: 2,
  },
  divider: {
    marginTop: 6,
    marginBottom: 2,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: CARD_BORDER,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 2,
  },
  tag: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  tagHighlight: {
    backgroundColor: "rgba(47, 111, 237, 0.06)",
    borderColor: "rgba(47, 111, 237, 0.2)",
  },
  tagText: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 11,
    color: Skoun.color.ink,
  },
  rightCol: {
    width: 112,
    flexShrink: 0,
    borderLeftWidth: 1,
    borderLeftColor: CARD_BORDER,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: "space-between",
    alignItems: "stretch",
  },
  heart: {
    alignSelf: "flex-end",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  heartGlyph: {
    fontSize: 14,
    color: Skoun.color.inkMuted,
  },
  heartOn: {
    color: Skoun.color.primary,
  },
  priceBlock: {
    gap: 2,
  },
  priceFrom: {
    fontFamily: Skoun.type.body,
    fontSize: 11,
    color: Skoun.color.inkFaint,
  },
  price: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 16,
    color: Skoun.color.ink,
    letterSpacing: -0.3,
  },
  priceUnit: {
    fontSize: 11,
    fontFamily: Skoun.type.bodyMedium,
    color: Skoun.color.inkMuted,
  },
  cta: {
    marginTop: 8,
    backgroundColor: Skoun.color.primary,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  ctaText: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 11,
    color: "#FFFFFF",
  },
});

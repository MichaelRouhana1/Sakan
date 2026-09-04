import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  ListingFeatureBadge,
  ListingGridRatingBadge,
  listingImageCornerBadge,
} from "@/components/listings/ListingRatingBadge";
import {
  useIsSaved,
  useToggleSaved,
} from "@/features/saved/useSavedListings";
import { Skoun } from "@/constants/theme";
import { formatFreshUsd } from "@/lib/format";
import { listingCardSubtitle, listingCardTitle } from "@/lib/listingCardMeta";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import type { Listing } from "@/types/listing";

const CARD_BORDER = "#E2E8F0";

type Props = {
  listing: Listing;
  width: number;
  onPress: () => void;
};

function coverUrl(listing: Listing): string | null {
  const fromPhotos = (listing.photos ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => p.url)
    .find(Boolean);
  return resolveMediaUrl(fromPhotos ?? listing.coverUrl ?? null);
}

export const MAP_CAROUSEL_BODY_H = 96;

export function ListingMapCarouselCard({ listing, width, onPress }: Props) {
  const title = listingCardTitle(listing);
  const subtitle = listingCardSubtitle(listing);
  const rentLabel = formatFreshUsd(listing.monthlyRentUsd);
  const { data: isSaved = false } = useIsSaved(listing.id);
  const toggleSaved = useToggleSaved();
  const cover = coverUrl(listing);
  const badge = listingImageCornerBadge(listing, "grid");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${rentLabel} per month. Open listing.`}
      onPress={onPress}
      style={[styles.card, { width }]}
    >
      <View style={[styles.media, { height: width * (10 / 16) }]}>
        {cover ? (
          <Image
            source={{ uri: cover }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={180}
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
            e?.preventDefault?.();
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

        {badge?.kind === "rating" ? (
          <ListingGridRatingBadge
            rating={badge.rating!}
            reviewCount={badge.reviewCount!}
          />
        ) : badge?.kind === "feature" ? (
          <ListingFeatureBadge label={badge.label!} />
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {subtitle}
        </Text>
        <View style={styles.divider} />
        <Text style={styles.priceLine}>
          <Text style={styles.from}>From </Text>
          <Text style={styles.price}>{rentLabel}</Text>
          <Text style={styles.unit}>/month</Text>
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Skoun.color.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: "hidden",
  },
  media: {
    position: "relative",
    width: "100%",
    overflow: "hidden",
    backgroundColor: Skoun.color.primaryMist,
  },
  mediaFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  heart: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: CARD_BORDER,
    shadowColor: "#121826",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  body: {
    height: MAP_CAROUSEL_BODY_H,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 16,
    lineHeight: 21,
    color: Skoun.color.ink,
    letterSpacing: -0.15,
  },
  meta: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    lineHeight: 17,
    color: Skoun.color.inkMuted,
    marginTop: 2,
  },
  divider: {
    marginTop: 10,
    marginBottom: 8,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: CARD_BORDER,
  },
  priceLine: {
    fontFamily: Skoun.type.body,
  },
  from: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    color: Skoun.color.inkMuted,
  },
  price: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 17,
    color: Skoun.color.ink,
  },
  unit: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    color: Skoun.color.inkMuted,
  },
});

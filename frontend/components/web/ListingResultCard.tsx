import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ListingCardCarousel } from "@/components/listings/ListingCardCarousel";
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
  variant?: "grid" | "list";
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

export function ListingResultCard({ listing, variant = "grid" }: Props) {
  const router = useRouter();
  const isList = variant === "list";
  const title = listingCardTitle(listing);
  const subtitle = listingCardSubtitle(listing);
  const rentLabel = formatFreshUsd(listing.monthlyRentUsd);
  const proximity = formatCampusWalkLine(
    listing.distanceMeters,
    listing.nearestCampusName,
  );
  const { highlights, amenities } = listingAmberPillGroups(listing);
  const typeBadge = labelListingType(listing.listingType);
  const { data: isSaved = false } = useIsSaved(listing.id);
  const toggleSaved = useToggleSaved();
  const urls = photoUrls(listing);

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${title}, ${rentLabel} per month`}
      onPress={() => router.push(`/(renter)/listing/${listing.id}`)}
      style={({ hovered, pressed }) => [
        styles.card,
        isList ? styles.cardRow : styles.cardGrid,
        (hovered || pressed) && styles.cardHover,
      ]}
    >
      {/* Column 1 — full-height image shell owns carousel hover */}
      <View
        style={[styles.mediaShell, isList ? styles.mediaList : styles.mediaGrid]}
      >
        <ListingCardCarousel urls={urls} />
      </View>

      {/* Column 2 — details */}
      <View style={[styles.middle, isList && styles.middleList]}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {subtitle}
          {listing.landmark ? ` · ${typeBadge}` : ""}
        </Text>

        {proximity ? (
          <Text style={styles.proximityText} numberOfLines={2}>
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
      <View style={[styles.rightCol, isList && styles.rightColList]}>
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
    backgroundColor: Skoun.color.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: "hidden",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 220,
  },
  cardGrid: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 200,
  },
  cardHover: {
    shadowColor: "#121826",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  mediaShell: {
    position: "relative",
    flexShrink: 0,
    alignSelf: "stretch",
    overflow: "hidden",
  },
  mediaList: {
    width: 248,
    minHeight: 220,
  },
  mediaGrid: {
    width: 168,
    minHeight: 200,
  },
  middle: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 6,
    justifyContent: "flex-start",
  },
  middleList: {
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  title: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 17,
    color: Skoun.color.ink,
    letterSpacing: -0.25,
  },
  meta: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    color: Skoun.color.inkMuted,
  },
  proximityText: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    color: Skoun.color.inkMuted,
    marginTop: 2,
    lineHeight: 17,
  },
  divider: {
    marginTop: 8,
    marginBottom: 2,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: CARD_BORDER,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  tag: {
    paddingVertical: 5,
    paddingHorizontal: 10,
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
    fontSize: 12,
    color: Skoun.color.ink,
  },
  rightCol: {
    width: 148,
    flexShrink: 0,
    borderLeftWidth: 1,
    borderLeftColor: CARD_BORDER,
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: "space-between",
    alignItems: "stretch",
  },
  rightColList: {
    width: 160,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  heart: {
    alignSelf: "flex-end",
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
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
  priceBlock: {
    gap: 4,
    alignItems: "stretch",
  },
  priceFrom: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    color: Skoun.color.inkFaint,
  },
  price: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 22,
    color: Skoun.color.ink,
    letterSpacing: -0.3,
  },
  priceUnit: {
    fontSize: 13,
    fontFamily: Skoun.type.bodyMedium,
    color: Skoun.color.inkMuted,
  },
  cta: {
    marginTop: 10,
    backgroundColor: Skoun.color.primary,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  ctaText: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 13,
    color: "#FFFFFF",
  },
});

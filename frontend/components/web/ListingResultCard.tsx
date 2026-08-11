import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ListingCardCarousel } from "@/components/listings/ListingCardCarousel";
import {
  ListingFeatureBadge,
  ListingGridRatingBadge,
  ListingListRatingDisplay,
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
  type ListingAmberPill,
} from "@/lib/listingCardMeta";
import { labelListingType } from "@/lib/listingLabels";
import type { Listing } from "@/types/listing";

type Props = {
  listing: Listing;
  variant?: "grid" | "list";
};

const CARD_BORDER = "#E2E8F0";
const GRID_TAG_LIMIT = 4;

function photoUrls(listing: Listing): string[] {
  const fromPhotos = (listing.photos ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => p.url)
    .filter(Boolean);
  if (fromPhotos.length > 0) return fromPhotos;
  return listing.coverUrl ? [listing.coverUrl] : [];
}

function HeartButton({
  isSaved,
  onToggle,
  style,
}: {
  isSaved: boolean;
  onToggle: () => void;
  style?: object;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isSaved ? "Remove from saved" : "Save listing"}
      hitSlop={8}
      onPress={(e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        onToggle();
      }}
      onPressIn={(e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
      }}
      style={style}
    >
      <Ionicons
        name={isSaved ? "heart" : "heart-outline"}
        size={20}
        color={isSaved ? "#C23B2E" : "#475569"}
      />
    </Pressable>
  );
}

function PillRow({
  pills,
  highlight,
  compact,
}: {
  pills: ListingAmberPill[];
  highlight?: boolean;
  compact?: boolean;
}) {
  if (pills.length === 0) return null;
  return (
    <View style={[styles.tags, compact && styles.tagsCompact]}>
      {pills.map((pill) => (
        <View
          key={pill.key}
          style={[
            styles.tag,
            compact && styles.tagCompact,
            highlight && styles.tagHighlight,
          ]}
        >
          <Text style={[styles.tagText, compact && styles.tagTextCompact]}>
            {pill.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ImageCornerBadge({
  listing,
  variant = "grid",
}: {
  listing: Listing;
  variant?: "grid" | "list";
}) {
  const badge = listingImageCornerBadge(listing, variant);
  if (!badge) return null;
  if (badge.kind === "rating") {
    return (
      <ListingGridRatingBadge
        rating={badge.rating!}
        reviewCount={badge.reviewCount!}
      />
    );
  }
  return <ListingFeatureBadge label={badge.label!} />;
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
  const onOpen = () => router.push(`/(renter)/listing/${listing.id}`);
  const onToggleSave = () => toggleSaved.mutate(listing);

  const hasRating =
    (listing.reviewCount ?? 0) > 0 &&
    listing.rating != null &&
    Number.isFinite(listing.rating);

  if (isList) {
    return (
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${title}, ${rentLabel} per month`}
        onPress={onOpen}
        style={({ hovered, pressed }) => [
          styles.card,
          styles.cardList,
          (hovered || pressed) && styles.cardHover,
        ]}
      >
        <View style={[styles.mediaShell, styles.mediaList]}>
          <ListingCardCarousel urls={urls} />
          <ImageCornerBadge listing={listing} variant="list" />
        </View>

        <View style={[styles.middle, styles.middleList]}>
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

          <PillRow pills={highlights} highlight />
          <PillRow pills={amenities} />
        </View>

        <View style={[styles.rightCol, styles.rightColList]}>
          <View style={styles.listHeaderRow}>
            {hasRating ? (
              <ListingListRatingDisplay
                rating={listing.rating!}
                reviewCount={listing.reviewCount!}
              />
            ) : (
              <View />
            )}
            <HeartButton
              isSaved={isSaved}
              onToggle={onToggleSave}
              style={styles.heart}
            />
          </View>
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

  // ── Grid (vertical Amber card) ───────────────────────────────────
  const gridPills = [...highlights, ...amenities].slice(0, GRID_TAG_LIMIT);
  const metaLine = [subtitle, typeBadge].filter(Boolean).join(" · ");

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${title}, ${rentLabel} per month`}
      onPress={onOpen}
      style={({ hovered, pressed }) => [
        styles.card,
        styles.cardGrid,
        (hovered || pressed) && styles.cardHover,
      ]}
    >
      <View style={styles.gridMedia}>
        <ListingCardCarousel urls={urls} />

        <HeartButton
          isSaved={isSaved}
          onToggle={onToggleSave}
          style={styles.gridHeart}
        />

        <ImageCornerBadge listing={listing} variant="grid" />
      </View>

      <View style={styles.gridBody}>
        <View style={styles.gridHeader}>
          <View style={styles.gridHeaderLeft}>
            <Text style={styles.gridTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.gridMeta} numberOfLines={1}>
              {metaLine}
            </Text>
          </View>
          <View style={styles.gridPriceCol}>
            <Text style={styles.gridFrom}>From</Text>
            <Text style={styles.gridPrice}>
              {rentLabel}
              <Text style={styles.gridPriceUnit}>/month</Text>
            </Text>
          </View>
        </View>

        {proximity ? (
          <Text style={styles.gridProximity} numberOfLines={1}>
            {proximity}
          </Text>
        ) : null}

        <View style={styles.gridDivider} />

        <PillRow pills={gridPills} compact />
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
  cardList: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 220,
  },
  cardGrid: {
    flexDirection: "column",
    // Content-sized height — do not stretch to match tallest grid sibling
    alignSelf: "stretch",
  },
  cardHover: {
    shadowColor: "#121826",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  mediaShell: {
    position: "relative",
    flexShrink: 0,
    alignSelf: "stretch",
    overflow: "hidden",
  },
  mediaList: {
    width: 280,
    minHeight: 220,
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
  tagsCompact: {
    gap: 5,
    marginTop: 0,
  },
  tag: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  tagCompact: {
    paddingVertical: 3,
    paddingHorizontal: 7,
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
  tagTextCompact: {
    fontSize: 11,
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
    width: 185,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    width: "100%",
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
    fontSize: 18,
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

  // Grid — Amber density (~40% image, tight body, compact pills)
  gridMedia: {
    position: "relative",
    width: "100%",
    aspectRatio: 16 / 10,
    backgroundColor: Skoun.color.primaryMist,
  },
  gridHeart: {
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
  gridBody: {
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 12,
    gap: 6,
  },
  gridHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  gridHeaderLeft: {
    flex: 1,
    minWidth: 0,
    gap: 1,
    paddingRight: 4,
  },
  gridTitle: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 16,
    lineHeight: 21,
    color: Skoun.color.ink,
    letterSpacing: -0.15,
  },
  gridMeta: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    lineHeight: 16,
    color: Skoun.color.inkMuted,
  },
  gridPriceCol: {
    alignItems: "flex-end",
    flexShrink: 0,
    paddingTop: 1,
  },
  gridFrom: {
    fontFamily: Skoun.type.body,
    fontSize: 11,
    lineHeight: 14,
    color: Skoun.color.inkFaint,
  },
  gridPrice: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 17,
    lineHeight: 21,
    color: Skoun.color.ink,
    letterSpacing: -0.2,
  },
  gridPriceUnit: {
    fontSize: 11,
    fontFamily: Skoun.type.body,
    color: Skoun.color.inkMuted,
  },
  gridProximity: {
    fontFamily: Skoun.type.body,
    fontSize: 11,
    lineHeight: 15,
    color: Skoun.color.inkMuted,
  },
  gridDivider: {
    marginTop: 2,
    marginBottom: 2,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: CARD_BORDER,
  },
});

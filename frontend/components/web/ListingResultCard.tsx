import { Image } from "expo-image";
import { useRouter } from "expo-router";
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
  variant?: "grid" | "list";
};

const CARD_BORDER = "#E2E8F0";

export function ListingResultCard({ listing, variant = "grid" }: Props) {
  const router = useRouter();
  const isList = variant === "list";
  const cover = listing.coverUrl ?? listing.photos?.[0]?.url;
  const title = listingCardTitle(listing);
  const subtitle = listingCardSubtitle(listing);
  const rentLabel = formatFreshUsd(listing.monthlyRentUsd);
  const proximity = formatCampusWalkLine(
    listing.distanceMeters,
    listing.nearestCampusName,
  );
  const pills = listingAmberPills(listing);
  const typeBadge = labelListingType(listing.listingType);
  const { data: isSaved = false } = useIsSaved(listing.id);
  const toggleSaved = useToggleSaved();

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${title}, ${rentLabel} per month`}
      onPress={() => router.push(`/(renter)/listing/${listing.id}`)}
      style={({ hovered, pressed }) => [
        styles.card,
        isList && styles.cardList,
        (hovered || pressed) && styles.cardHover,
      ]}
    >
      <View style={[styles.media, isList && styles.mediaList]}>
        {cover ? (
          <Image
            source={{ uri: cover }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, styles.mediaFallback]} />
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
            {isList ? typeBadge : rentLabel}
          </Text>
        </View>
      </View>

      <View style={[styles.body, isList && styles.bodyList]}>
        <View style={styles.bodyMain}>
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

          {pills.length > 0 ? (
            <View style={styles.tags}>
              {pills.map((pill) => (
                <View key={pill.key} style={styles.tag}>
                  <Text style={styles.tagText}>{pill.label}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={[styles.priceCol, isList && styles.priceColList]}>
          <Text style={styles.priceFrom}>FROM</Text>
          <Text style={styles.price}>
            {rentLabel}
            <Text style={styles.priceUnit}> / mo</Text>
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
  cardList: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  cardHover: {
    shadowColor: "#121826",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  media: {
    height: 188,
    backgroundColor: Skoun.color.primaryMist,
    position: "relative",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  mediaList: {
    width: 260,
    height: "100%",
    minHeight: 220,
    flexShrink: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 16,
  },
  mediaFallback: {
    backgroundColor: Skoun.color.bgWash,
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
    maxWidth: "70%",
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
    padding: 16,
    gap: 10,
  },
  bodyList: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
    padding: 20,
  },
  bodyMain: {
    flex: 1,
    gap: 6,
    minWidth: 0,
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
  priceCol: {
    marginTop: 4,
    gap: 4,
  },
  priceColList: {
    marginTop: 0,
    alignItems: "stretch",
    justifyContent: "flex-start",
    minWidth: 140,
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
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  ctaText: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 13,
    color: "#FFFFFF",
  },
});

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { ListingCardCarousel } from "@/components/listings/ListingCardCarousel";
import { listingImageCornerBadge } from "@/components/listings/ListingRatingBadge";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { Studently } from "@/constants/theme";
import { rememberPlacement } from "@/features/promotions/activity";
import { useIsSaved, useToggleSaved } from "@/features/saved/useSavedListings";
import { bedsAvailableLabel } from "@/lib/bedsAvailability";
import { formatFreshUsd } from "@/lib/format";
import { listingCardSubtitle, listingCardTitle } from "@/lib/listingCardMeta";
import { studentlyShadow } from "@/lib/studentlyShadow";
import type { Listing } from "@/types/listing";

const CARD_WIDTH = 184;
const BRAND_RED = "#EA3F4A";

/**
 * Native iOS/Android equivalent of HomePropertyCard, matching its exact square
 * photo frame, top-right favorite heart, bottom-left curved cutout pill, and
 * 3-line metadata block.
 */
export function HomePropertyCardNative({
  listing,
  testID,
  hideTitle = false,
}: {
  listing: Listing;
  testID?: string;
  hideTitle?: boolean;
}) {
  const { data: saved = false } = useIsSaved(listing.id);
  const toggleSaved = useToggleSaved();

  const title = listingCardTitle(listing);
  const area = listingCardSubtitle(listing);
  const price = formatFreshUsd(listing.monthlyRentUsd);
  const bedsLabel = bedsAvailableLabel(listing.bedsAvailable, listing.bedsTotal);
  const photos = [...(listing.photos ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((photo) => photo.url)
    .filter(Boolean);
  if (!photos.length && listing.coverUrl) photos.push(listing.coverUrl);

  const badge = listingImageCornerBadge(listing);
  const featured = badge?.label === "Featured";
  const rating = listing.rating;
  const hasRating =
    rating != null && Number.isFinite(rating) && (listing.reviewCount ?? 0) > 0;
  const isNew = badge?.label === "New";
  const hasBadge = hasRating || isNew;

  const open = () => {
    rememberPlacement(listing);
    router.push(`/(renter)/listing/${listing.id}` as never);
  };

  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.media}>
        <View style={styles.photoFrame}>
          <ListingCardCarousel
            urls={photos}
            fill
            presentation="home"
            onPressCard={open}
          />
          {hasBadge ? (
            <Svg
              width={CARD_WIDTH * 0.49}
              height={CARD_WIDTH * 0.21}
              viewBox="0 0 90 38"
              style={styles.cutoutOverlay}
              pointerEvents="none"
            >
              <Path
                d="M0 38V0C0.7 4.7 5.9 7.2 11.8 7.2H51.1C57 7.2 61.9 11.6 65.4 19C70.2 28.9 78.7 37.6 88.8 37.6L90 38H0Z"
                fill={Studently.color.surface}
              />
            </Svg>
          ) : null}
        </View>

        {featured ? (
          <View style={styles.offer} pointerEvents="none">
            <Text style={styles.offerText}>Featured</Text>
          </View>
        ) : null}

        <View style={styles.favorite}>
          <FavoriteButton
            saved={saved}
            onPress={() => toggleSaved.mutate(listing)}
            iconSize={24}
            variant="overlay"
            style={styles.favoriteButton}
          />
        </View>

        {hasBadge ? (
          <View style={styles.badgeWrap} pointerEvents="none">
            {hasRating ? (
              <View
                style={styles.badge}
                accessibilityLabel={`${rating.toFixed(1)} out of 5`}
              >
                <Ionicons name="star" size={11} color={BRAND_RED} />
                <Text style={styles.badgeRatingText}>
                  {rating.toFixed(1)}/5
                </Text>
              </View>
            ) : (
              <View style={styles.badge}>
                <Text style={styles.badgeNewText}>New</Text>
              </View>
            )}
          </View>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel={
          hideTitle
            ? `${area}, From ${price} per month`
            : `${title}, ${area}, From ${price} per month`
        }
        onPress={open}
        style={({ pressed }) => [
          styles.body,
          hideTitle && styles.bodyCompact,
          pressed && styles.pressed,
        ]}
      >
        {!hideTitle ? (
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        ) : null}
        <Text
          style={hideTitle ? styles.areaPrimary : styles.area}
          numberOfLines={1}
        >
          {area}
        </Text>
        <Text style={styles.price} numberOfLines={1}>
          From {price}/month
        </Text>
        {bedsLabel ? (
          <Text style={styles.beds} numberOfLines={1}>
            {bedsLabel}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
  },
  media: {
    position: "relative",
    width: CARD_WIDTH,
    height: CARD_WIDTH,
  },
  photoFrame: {
    ...StyleSheet.absoluteFill,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#E8EEF6",
  },
  offer: {
    position: "absolute",
    top: 10,
    left: 10,
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    justifyContent: "center",
    ...studentlyShadow({ color: "#000000", y: 2, blur: 6, opacity: 0.14, elevation: 2 }),
  },
  offerText: {
    color: "#222222",
    fontSize: 11.5,
    fontFamily: Studently.type.bodySemi,
  },
  favorite: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 42,
    height: 40,
    zIndex: 3,
  },
  favoriteButton: {
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
  cutoutOverlay: {
    position: "absolute",
    left: -0.5,
    bottom: -0.5,
    zIndex: 2,
  },
  badgeWrap: {
    position: "absolute",
    left: 0,
    bottom: -1,
    width: CARD_WIDTH * 0.36,
    paddingHorizontal: 4,
    zIndex: 3,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    ...studentlyShadow({ color: "#111111", y: 2, blur: 6, opacity: 0.12, elevation: 2 }),
  },
  badgeRatingText: {
    color: "#111111",
    fontSize: 12,
    lineHeight: 16,
    fontFamily: Studently.type.bodyMedium,
  },
  badgeNewText: {
    color: BRAND_RED,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: Studently.type.bodyMedium,
  },
  body: {
    paddingTop: 11,
    gap: 5,
  },
  bodyCompact: {
    paddingTop: 10,
    gap: 3,
  },
  pressed: {
    opacity: 0.85,
  },
  title: {
    color: "#202020",
    fontSize: 13.5,
    lineHeight: 17,
    fontFamily: Studently.type.bodyMedium,
  },
  areaPrimary: {
    color: "#202020",
    fontSize: 14,
    lineHeight: 18,
    fontFamily: Studently.type.bodyMedium,
  },
  area: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 16,
    fontFamily: Studently.type.body,
  },
  price: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 16,
    fontFamily: Studently.type.body,
  },
  beds: {
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 15,
    fontFamily: Studently.type.body,
  },
});

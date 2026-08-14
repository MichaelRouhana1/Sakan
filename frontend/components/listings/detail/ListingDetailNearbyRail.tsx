import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { Skoun } from "@/constants/theme";
import { formatFreshUsd } from "@/lib/format";
import { listingCardSubtitle, listingCardTitle } from "@/lib/listingCardMeta";
import { rentPriceType } from "@/lib/rentPriceType";
import type { Listing } from "@/types/listing";

type Props = {
  listings: Listing[];
};

export function ListingDetailNearbyRail({ listings }: Props) {
  if (listings.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <LText variant="title" style={styles.heading}>
        Nearby listings
      </LText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {listings.map((listing) => {
          const cover = listing.coverUrl ?? listing.photos[0]?.url ?? null;
          return (
            <Pressable
              key={listing.id}
              accessibilityRole="button"
              accessibilityLabel={`${listingCardTitle(listing)}, ${formatFreshUsd(listing.monthlyRentUsd)}`}
              onPress={() =>
                router.push(`/(renter)/listing/${listing.id}` as never)
              }
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.cover}>
                {cover ? (
                  <Image
                    source={{ uri: cover }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
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
              </View>
              <View style={styles.meta}>
                <LText variant="subtitle" numberOfLines={1}>
                  {listingCardTitle(listing)}
                </LText>
                <LText variant="caption" tone="muted" numberOfLines={1}>
                  {listingCardSubtitle(listing)}
                </LText>
                <LText
                  variant="body"
                  style={[rentPriceType, styles.price]}
                  numberOfLines={1}
                >
                  From {formatFreshUsd(listing.monthlyRentUsd)}/mo
                </LText>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const CARD_W = 220;

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  heading: {
    fontSize: 18,
    paddingHorizontal: 16,
  },
  rail: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  card: {
    width: CARD_W,
    backgroundColor: Skoun.color.surface,
    borderRadius: Skoun.radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  pressed: { opacity: 0.92 },
  cover: {
    height: 128,
    backgroundColor: Skoun.color.bgWash,
  },
  coverFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  meta: {
    padding: 12,
    gap: 4,
  },
  price: { fontSize: 15, marginTop: 2 },
});

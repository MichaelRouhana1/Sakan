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
  labelElectricity,
  labelListingType,
  labelWater,
} from "@/lib/listingLabels";
import type { Listing } from "@/types/listing";

type Props = {
  listing: Listing;
  variant?: "grid" | "list";
};

function formatDistance(meters?: number | null): string | null {
  if (meters == null || !Number.isFinite(meters)) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function listingTitle(listing: Listing): string {
  return `${listing.area} · ${labelListingType(listing.listingType)}`;
}

function listingTags(listing: Listing): { label: string; accent?: boolean }[] {
  const tags: { label: string; accent?: boolean }[] = [];
  if (listing.wifiIncluded) tags.push({ label: "Wi‑Fi", accent: true });
  if (listing.elevator24_7) tags.push({ label: "Elevator 24/7" });
  tags.push({ label: labelElectricity(listing.electricity) });
  tags.push({ label: labelWater(listing.water) });
  return tags.slice(0, 5);
}

export function ListingResultCard({ listing, variant = "grid" }: Props) {
  const router = useRouter();
  const isList = variant === "list";
  const cover = listing.coverUrl ?? listing.photos?.[0]?.url;
  const title = listingTitle(listing);
  const rentLabel = formatFreshUsd(listing.monthlyRentUsd);
  const dist = formatDistance(listing.distanceMeters);
  const campusLabel = listing.nearestCampusName;
  const tags = listingTags(listing);
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
      </View>

      <View style={[styles.body, isList && styles.bodyList]}>
        <View style={styles.bodyMain}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {[listing.landmark, labelListingType(listing.listingType)]
              .filter(Boolean)
              .join(" · ")}
          </Text>

          {(dist || campusLabel) && (
            <View style={styles.proximity}>
              {dist ? (
                <Text style={styles.proximityText}>
                  {campusLabel ? `${dist} from ${campusLabel}` : dist}
                </Text>
              ) : campusLabel ? (
                <Text style={styles.proximityText} numberOfLines={1}>
                  Near {campusLabel}
                </Text>
              ) : null}
            </View>
          )}

          {isList && tags.length > 0 ? (
            <View style={styles.tags}>
              {tags.map((tag) => (
                <View
                  key={tag.label}
                  style={[styles.tag, tag.accent && styles.tagAccent]}
                >
                  <Text
                    style={[
                      styles.tagText,
                      tag.accent && styles.tagTextAccent,
                    ]}
                  >
                    {tag.label}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={[styles.priceCol, isList && styles.priceColList]}>
          <Text style={styles.priceFrom}>From</Text>
          <Text style={styles.price}>
            {rentLabel}
            <Text style={styles.priceUnit}> / mo</Text>
          </Text>
          {isList ? (
            <View style={styles.cta}>
              <Text style={styles.ctaText}>View listing</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Skoun.color.surface,
    borderRadius: Skoun.radius.md,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    overflow: "hidden",
  },
  cardList: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  cardHover: {
    shadowColor: "#121826",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  media: {
    height: 180,
    backgroundColor: Skoun.color.primaryMist,
    position: "relative",
  },
  mediaList: {
    width: 280,
    height: 200,
    flexShrink: 0,
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
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(18,24,38,0.08)",
  },
  heartGlyph: {
    fontSize: 16,
    color: Skoun.color.inkMuted,
  },
  heartOn: {
    color: Skoun.color.primary,
  },
  body: {
    padding: 14,
    gap: 6,
  },
  bodyList: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    padding: 18,
  },
  bodyMain: {
    flex: 1,
    gap: 6,
    minWidth: 0,
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
    gap: 2,
    marginTop: 2,
  },
  proximityText: {
    fontFamily: Skoun.type.body,
    fontSize: 12,
    color: Skoun.color.inkMuted,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Skoun.radius.sm,
    backgroundColor: Skoun.color.primaryMist,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  tagAccent: {
    backgroundColor: "rgba(47, 111, 237, 0.08)",
    borderColor: "rgba(47, 111, 237, 0.22)",
  },
  tagText: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 11,
    color: Skoun.color.inkMuted,
  },
  tagTextAccent: {
    color: Skoun.color.primaryDeep,
  },
  priceCol: {
    marginTop: 4,
  },
  priceColList: {
    marginTop: 0,
    alignItems: "flex-end",
    justifyContent: "space-between",
    minWidth: 120,
  },
  priceFrom: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 11,
    color: Skoun.color.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  price: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 18,
    color: Skoun.color.ink,
  },
  priceUnit: {
    fontSize: 13,
    fontFamily: Skoun.type.bodyMedium,
    color: Skoun.color.inkMuted,
  },
  cta: {
    marginTop: 12,
    backgroundColor: Skoun.color.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Skoun.radius.sm,
  },
  ctaText: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 13,
    color: "#FFFFFF",
  },
});

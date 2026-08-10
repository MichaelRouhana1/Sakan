import { StyleSheet, Text, View } from "react-native";
import type { Listing } from "@/types/listing";

type Props = {
  rating: number;
  reviewCount: number;
};

/**
 * Amber List Mode Rating Display:
 * Positioned in top-right header area.
 * Layout: flex items-center gap-1.5 font-sans
 * Score: text-sm font-bold text-[#111928] (e.g. "4.3")
 * Stars: 5 small emerald green stars (#0E9F6E fill)
 * Count: text-xs text-[#6B7280] (e.g. "(7)")
 */
export function ListingListRatingDisplay({ rating, reviewCount }: Props) {
  if (!Number.isFinite(rating) || reviewCount <= 0) return null;

  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const isFull = rating >= i;
    const isHalf = !isFull && rating >= i - 0.5;
    stars.push(
      <Text
        key={i}
        style={[
          styles.listStar,
          { color: isFull || isHalf ? "#0E9F6E" : "#E5E7EB", opacity: isHalf ? 0.7 : 1 },
        ]}
      >
        ★
      </Text>
    );
  }

  return (
    <View style={styles.listWrap} accessibilityLabel={`${rating.toFixed(1)} rating from ${reviewCount} reviews`}>
      <Text style={styles.listScore}>{rating.toFixed(1)}</Text>
      <View style={styles.listStarsRow}>{stars}</View>
      <Text style={styles.listCount}>({reviewCount})</Text>
    </View>
  );
}

/**
 * Amber Grid Mode Rating Badge (Bottom Curved Notch):
 * Positioned at absolute bottom-0 left-0 z-10 over listing image.
 * Outer Notch: bg-white rounded-tr-xl px-3 py-1 border-t border-r border-slate-100 flex items-center gap-1 shadow-sm
 * Star: ⭐ / #F59500
 * Score: text-xs font-bold text-[#111928]
 * Count: text-xs text-[#6B7280]
 */
export function ListingGridRatingBadge({ rating, reviewCount }: Props) {
  if (!Number.isFinite(rating) || reviewCount <= 0) return null;

  return (
    <View style={styles.gridNotchWrap} pointerEvents="none" accessibilityLabel={`${rating.toFixed(1)} from ${reviewCount} reviews`}>
      <Text style={styles.gridNotchStar}>⭐</Text>
      <Text style={styles.gridNotchScore}>{rating.toFixed(1)}</Text>
      <Text style={styles.gridNotchCount}>({reviewCount})</Text>
    </View>
  );
}

/** Backwards-compatible main rating badge */
export function ListingRatingBadge(props: Props) {
  return <ListingGridRatingBadge {...props} />;
}

/** Featured / New chip when a listing has no reviews yet. */
export function ListingFeatureBadge({ label }: { label: string }) {
  return (
    <View style={styles.feature} pointerEvents="none">
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
}

/** Prefer rating pill for grid mode; otherwise Top Featured / New. */
export function listingImageCornerBadge(
  listing: Listing,
  variant: "grid" | "list" = "grid"
): {
  kind: "rating" | "feature";
  rating?: number;
  reviewCount?: number;
  label?: string;
} | null {
  const count = listing.reviewCount ?? 0;
  const rating = listing.rating;

  if (variant === "grid" && count > 0 && rating != null && Number.isFinite(rating)) {
    return { kind: "rating", rating, reviewCount: count };
  }

  if (listing.boostedUntil && new Date(listing.boostedUntil) > new Date()) {
    return { kind: "feature", label: "Top Featured" };
  }

  if (listing.publishedAt) {
    const ageMs = Date.now() - new Date(listing.publishedAt).getTime();
    if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs < 1000 * 60 * 60 * 24 * 14) {
      return { kind: "feature", label: "New" };
    }
  }

  return null;
}

const styles = StyleSheet.create({
  // List Mode Rating Display Styles
  listWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6, // gap-1.5 (6px)
  },
  listScore: {
    fontWeight: "700", // font-bold
    fontSize: 14,     // text-sm
    color: "#111928", // text-[#111928]
    lineHeight: 18,
  },
  listStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  listStar: {
    fontSize: 12,
    lineHeight: 14,
  },
  listCount: {
    fontSize: 12,     // text-xs
    color: "#6B7280", // text-[#6B7280]
    fontWeight: "400",
    lineHeight: 18,
  },

  // Grid Mode Amber Notch Badge Styles
  gridNotchWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    zIndex: 10,
    backgroundColor: "#FFFFFF", // bg-white
    paddingHorizontal: 12,      // px-3
    paddingVertical: 4,         // py-1
    borderTopRightRadius: 12,   // rounded-tr-xl
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderColor: "#F1F5F9",     // border-slate-100
    shadowColor: "#121826",
    shadowOpacity: 0.05,        // shadow-sm
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,                     // gap-1
  },
  gridNotchStar: {
    fontSize: 12,
    lineHeight: 14,
  },
  gridNotchScore: {
    fontSize: 12,               // text-xs
    fontWeight: "700",          // font-bold
    color: "#111928",           // text-[#111928]
    lineHeight: 16,
  },
  gridNotchCount: {
    fontSize: 12,               // text-xs
    fontWeight: "400",
    color: "#6B7280",           // text-[#6B7280]
    lineHeight: 16,
  },

  feature: {
    position: "absolute",
    left: 8,
    bottom: 8,
    zIndex: 10,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#121826",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  featureText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#121826",
  },
});



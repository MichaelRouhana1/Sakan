import { StyleSheet, Text, View } from "react-native";
import type { Listing } from "@/types/listing";

type Props = {
  rating: number;
  reviewCount: number;
};

/**
 * Amber-style rating chip — bottom-left on listing card images.
 * Only mount when `reviewCount >= 1` and rating is finite.
 */
export function ListingRatingBadge({ rating, reviewCount }: Props) {
  if (!Number.isFinite(rating) || reviewCount < 1) return null;

  const high = rating >= 4;

  return (
    <View style={styles.wrap} pointerEvents="none" accessibilityLabel={`${rating.toFixed(1)} from ${reviewCount} reviews`}>
      <Text style={styles.star}>⭐</Text>
      <Text style={[styles.score, high ? styles.scoreHigh : styles.scoreLow]}>
        {rating.toFixed(1)}
      </Text>
      <Text style={styles.count}>({reviewCount})</Text>
    </View>
  );
}

/** Featured / New chip when a listing has no reviews yet. */
export function ListingFeatureBadge({ label }: { label: string }) {
  return (
    <View style={styles.feature} pointerEvents="none">
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
}

/** Prefer rating pill; otherwise Top Featured / New. */
export function listingImageCornerBadge(listing: Listing): {
  kind: "rating" | "feature";
  rating?: number;
  reviewCount?: number;
  label?: string;
} | null {
  const count = listing.reviewCount ?? 0;
  const rating = listing.rating;
  if (count >= 1 && rating != null && Number.isFinite(rating)) {
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
  wrap: {
    position: "absolute",
    left: 8,
    bottom: 8,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderBottomLeftRadius: 4,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#121826",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  star: {
    fontSize: 11,
    lineHeight: 14,
  },
  score: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 14,
  },
  scoreHigh: {
    color: "#059669",
  },
  scoreLow: {
    color: "#334155",
  },
  count: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 14,
    color: "#64748B",
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

import { Platform, StyleSheet, Text, View } from "react-native";
import type { Listing } from "@/types/listing";

// Conditionally import react-native-svg only on native platforms.
// On web we render raw HTML <svg>/<path> elements instead.
let Svg: any = null;
let Path: any = null;

if (Platform.OS !== "web") {
  try {
    const rnsvg = require("react-native-svg");
    Svg = rnsvg.Svg ?? rnsvg.default;
    Path = rnsvg.Path;
  } catch {
    // Fallback — will use the simple View approach
  }
}

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

// ────────────────────────────────────────────────────────────────────────────
// The SVG path that draws the curved notch tab.
// ViewBox: 0 0 160 26
//
// Shape anatomy:
//   ┌────────────────────── flat top (y = 0) ──────────────────────┐
//   │  The tab rises from the baseline with inverted-curve edges  │
//   │  that taper smoothly into the straight baseline on each     │
//   │  side, creating a seamless "emerging tab" effect.           │
//   └── baseline (y ≈ 16.68 → 26, solid fill) ───────────────────┘
// ────────────────────────────────────────────────────────────────────────────
const NOTCH_PATH =
  "M18.0139 15.6092L0 16.6792V26H160V16.6792L141.9861 15.6092" +
  "C138.134 15.3803 134.4944 13.767 131.7378 11.0665L127.5 6.91468" +
  "L123.9412 3.42813C121.6982 1.23073 118.6834 0 115.5434 0H44.4566" +
  "C41.3166 0 38.3018 1.23073 36.0588 3.42813L32.5 6.91468L28.2622 11.0665" +
  "C25.5056 13.767 21.866 15.3803 18.0139 15.6092Z";

/**
 * Grid Mode Rating Badge — curved SVG notch banner.
 *
 * Positioned absolute bottom-0 left-0, overlapping the image bottom edge.
 * Uses the exact same SVG path on both web and native to produce identical
 * inverted-curve transitions at the base of the tab.
 */
export function ListingGridRatingBadge({ rating, reviewCount }: Props) {
  if (!Number.isFinite(rating) || reviewCount <= 0) return null;

  // ── Web: render raw HTML <svg>/<path> ──────────────────────────
  if (Platform.OS === "web") {
    const SVGElement = "svg" as any;
    const PathElement = "path" as any;
    return (
      <View
        style={styles.notchBanner}
        pointerEvents="none"
        accessibilityLabel={`${rating.toFixed(1)} from ${reviewCount} reviews`}
      >
        <SVGElement
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "100%",
            fill: "#FFFFFF",
          }}
          viewBox="0 0 160 26"
          preserveAspectRatio="none"
        >
          <PathElement d={NOTCH_PATH} />
        </SVGElement>
        <View style={styles.notchContent}>
          <Text style={styles.notchStar}>★</Text>
          <Text style={styles.notchScore}>{rating.toFixed(1)}</Text>
          <Text style={styles.notchCount}>({reviewCount})</Text>
        </View>
      </View>
    );
  }

  // ── Native: render via react-native-svg ────────────────────────
  if (Svg && Path) {
    return (
      <View
        style={styles.notchBanner}
        pointerEvents="none"
        accessibilityLabel={`${rating.toFixed(1)} from ${reviewCount} reviews`}
      >
        <Svg
          style={StyleSheet.absoluteFill}
          viewBox="0 0 160 26"
          preserveAspectRatio="none"
        >
          <Path d={NOTCH_PATH} fill="#FFFFFF" />
        </Svg>
        <View style={styles.notchContent}>
          <Text style={styles.notchStar}>★</Text>
          <Text style={styles.notchScore}>{rating.toFixed(1)}</Text>
          <Text style={styles.notchCount}>({reviewCount})</Text>
        </View>
      </View>
    );
  }

  // ── Fallback (if SVG fails to load): clean rounded tab ─────────
  return (
    <View
      style={styles.fallbackNotch}
      pointerEvents="none"
      accessibilityLabel={`${rating.toFixed(1)} from ${reviewCount} reviews`}
    >
      <Text style={styles.notchStar}>★</Text>
      <Text style={styles.notchScore}>{rating.toFixed(1)}</Text>
      <Text style={styles.notchCount}>({reviewCount})</Text>
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
    gap: 6,
  },
  listScore: {
    fontWeight: "700",
    fontSize: 14,
    color: "#111928",
    lineHeight: 18,
  },
  listStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  listStar: {
    fontSize: 15,
    lineHeight: 17,
  },
  listCount: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "400",
    lineHeight: 18,
  },

  // ── Curved Notch Banner (shared web + native) ─────────────────
  // On web: bottom -9 bleeds below the image edge so the white
  //   SVG baseline merges with the card body. CSS overflow:hidden
  //   doesn't clip z-indexed absolute children.
  // On native: bottom 0 keeps it inside the clipped parent. The
  //   SVG baseline fill (white) sits at the very bottom of the
  //   image container; the white card body below creates seamless
  //   visual continuity.
  notchBanner: {
    position: "absolute",
    bottom: Platform.OS === "web" ? -9 : 0,
    left: 0,
    width: 126,
    height: Platform.OS === "web" ? 24 : 26,
    zIndex: 10,
  },
  notchContent: {
    position: "absolute",
    bottom: 4.5,
    left: 21,
    width: 84,
    height: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    zIndex: 20,
  },

  // Text styles inside the notch
  notchStar: {
    fontSize: 12,
    color: "#F59E0B",
  },
  notchScore: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0E9F6E",
  },
  notchCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0E9F6E",
    marginLeft: 1,
  },

  // ── Fallback: simple rounded tab (no SVG) ─────────────────────
  fallbackNotch: {
    position: "absolute",
    bottom: 0,
    left: 0,
    zIndex: 10,
    backgroundColor: "#FFFFFF",
    height: 26,
    paddingHorizontal: 12,
    borderTopRightRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: -1 },
    elevation: 2,
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

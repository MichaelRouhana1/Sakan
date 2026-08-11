import { Platform, StyleSheet, Text, View } from "react-native";
import type { Listing } from "@/types/listing";

// Conditionally import react-native-svg only on native platforms.
// On web we render raw HTML <svg>/<path> elements instead.
let Svg: any = null;
let SvgPath: any = null;

if (Platform.OS !== "web") {
  try {
    const rnsvg = require("react-native-svg");
    Svg = rnsvg.Svg ?? rnsvg.default;
    SvgPath = rnsvg.Path;
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
// SVG path for the curved notch tab.
// ViewBox: 0 0 160 26
//
// Shape anatomy (bottom-to-top):
// 1. Flat baseline fill from y≈16.68 to y=26 across full width (0–160).
//    This white strip sits flush against the card body below.
// 2. A raised tab from ~x44 to ~x115 peaking at y=0.
// 3. Smooth inverted-curve transitions where the tab meets the baseline.
// ────────────────────────────────────────────────────────────────────────────
const NOTCH_PATH =
  "M18.0139 15.6092L0 16.6792V26H160V16.6792L141.9861 15.6092" +
  "C138.134 15.3803 134.4944 13.767 131.7378 11.0665L127.5 6.91468" +
  "L123.9412 3.42813C121.6982 1.23073 118.6834 0 115.5434 0H44.4566" +
  "C41.3166 0 38.3018 1.23073 36.0588 3.42813L32.5 6.91468L28.2622 11.0665" +
  "C25.5056 13.767 21.866 15.3803 18.0139 15.6092Z";

/**
 * The shared inner notch content — star + score + count
 */
function NotchText({ rating, reviewCount }: Props) {
  return (
    <>
      <Text style={styles.notchStar}>★</Text>
      <Text style={styles.notchScore}>{rating.toFixed(1)}</Text>
      <Text style={styles.notchCount}>({reviewCount})</Text>
    </>
  );
}

/**
 * Grid Mode Rating Badge — curved SVG notch banner.
 *
 * This badge spans the FULL WIDTH of its parent image container.
 * The SVG draws a white shape with:
 *   - A flat baseline across the entire width (merging with the card body)
 *   - A raised curved tab in the center containing the rating text
 *   - Smooth inverted curves where the tab meets the baseline
 *
 * On web: uses raw HTML <svg>/<path>
 * On native: uses react-native-svg <Svg>/<Path>
 */
export function ListingGridRatingBadge({ rating, reviewCount }: Props) {
  if (!Number.isFinite(rating) || reviewCount <= 0) return null;

  // ── Web: raw HTML svg/path ─────────────────────────────────────
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
          <NotchText rating={rating} reviewCount={reviewCount} />
        </View>
      </View>
    );
  }

  // ── Native: react-native-svg ───────────────────────────────────
  if (Svg && SvgPath) {
    return (
      <View
        style={styles.notchBannerNative}
        pointerEvents="none"
        accessibilityLabel={`${rating.toFixed(1)} from ${reviewCount} reviews`}
      >
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 160 26"
          preserveAspectRatio="none"
          style={StyleSheet.absoluteFill}
        >
          <SvgPath d={NOTCH_PATH} fill="#FFFFFF" />
        </Svg>
        <View style={styles.notchContentNative}>
          <NotchText rating={rating} reviewCount={reviewCount} />
        </View>
      </View>
    );
  }

  // ── Fallback (if SVG fails to load): rounded tab ───────────────
  return (
    <View
      style={styles.fallbackNotch}
      pointerEvents="none"
      accessibilityLabel={`${rating.toFixed(1)} from ${reviewCount} reviews`}
    >
      <NotchText rating={rating} reviewCount={reviewCount} />
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
  // ── List Mode Rating Display ──────────────────────────────────
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

  // ── Curved Notch Banner — Web ─────────────────────────────────
  // Spans full width of parent. bottom: -9 lets the white baseline
  // bleed below the image into the card body (CSS overflow:hidden
  // doesn't clip z-indexed abs children on web).
  notchBanner: {
    position: "absolute",
    bottom: -9,
    left: 0,
    right: 0,
    height: 26,
    zIndex: 10,
  },
  notchContent: {
    position: "absolute",
    bottom: 4,
    left: 0,
    right: 0,
    height: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    zIndex: 20,
  },

  // ── Curved Notch Banner — Native ──────────────────────────────
  // On native, overflow:hidden clips strictly, so bottom: 0.
  // The SVG baseline white fill sits at the image bottom edge;
  // the white card body below creates visual continuity.
  notchBannerNative: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 26,
    zIndex: 10,
  },
  notchContentNative: {
    position: "absolute",
    bottom: 2,
    left: 0,
    right: 0,
    height: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    zIndex: 20,
  },

  // ── Notch text styles ─────────────────────────────────────────
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

  // ── Fallback: rounded tab (no SVG available) ──────────────────
  fallbackNotch: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#FFFFFF",
    height: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },

  // ── Feature chip ──────────────────────────────────────────────
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

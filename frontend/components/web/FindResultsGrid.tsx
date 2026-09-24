import type { MatchPresentation } from "@/features/matcher/types";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { CampusFarSeparator } from "@/components/listings/CampusFarSeparator";
import { ListingResultCard } from "@/components/web/ListingResultCard";
import { WebEmptyState } from "@/components/web/WebEmptyState";
import { Skoun } from "@/constants/theme";
import {
  campusFarSeparatorKey,
  withCampusDistanceSeparator,
  type MixedListingRow,
} from "@/lib/campusProximity";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { Listing } from "@/types/listing";

const CARD_BORDER = "#E2E8F0";
const GRID_BODY_HEIGHT = 143;

type Props = {
  matches?: Record<string, MatchPresentation>;
  listings: Listing[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  variant?: "grid" | "list";
  /** Desktop column count for grid mode (1–3). */
  columns?: 1 | 2 | 3;
  onHoverListing?: (
    id: string | null,
    point?: { x: number; y: number },
  ) => void;
  showDistanceSplit?: boolean;
  universityLabel?: string;
};

function skeletonCount(columns: 1 | 2 | 3, list: boolean) {
  if (list || columns === 1) return 3;
  if (columns === 2) return 4;
  return 6;
}

const SKELETON_SHINE_CSS = `
@keyframes sk-skel-shine {
  0% { transform: translate3d(-100%, 0, 0); }
  100% { transform: translate3d(280%, 0, 0); }
}
.sk-skel-sweep,
[data-skel-sweep="1"] {
  position: absolute !important;
  top: 0 !important;
  right: auto !important;
  bottom: 0 !important;
  left: 0 !important;
  width: 38% !important;
  height: auto !important;
  pointer-events: none;
  background-image: linear-gradient(
    90deg,
    rgba(91, 101, 112, 0) 0%,
    rgba(91, 101, 112, 0.07) 50%,
    rgba(91, 101, 112, 0) 100%
  );
  animation: sk-skel-shine 1s linear infinite;
  will-change: transform;
}
@media (prefers-reduced-motion: reduce) {
  .sk-skel-sweep,
  [data-skel-sweep="1"] {
    animation: none !important;
    opacity: 0;
  }
}
`;

function ensureSkeletonShineCss() {
  if (typeof document === "undefined") return;
  const id = "skoun-skel-shine-css";
  let style = document.getElementById(id) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = id;
    document.head.appendChild(style);
  }
  style.textContent = SKELETON_SHINE_CSS;
}

export function FindSkeletonBone({
  style,
  shine,
}: {
  style?: object;
  shine: boolean;
}) {
  if (shine) ensureSkeletonShineCss();

  return (
    <View style={[styles.bone, style]}>
      {shine ? (
        <View
          {...({
            className: "sk-skel-sweep",
            dataSet: { skelSweep: "1" },
          } as object)}
        />
      ) : null}
    </View>
  );
}

function SkeletonCard({
  list,
  shine,
}: {
  list?: boolean;
  shine: boolean;
}) {
  if (list) {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.skeleton, styles.skeletonList]}
      >
        <View style={styles.skeletonPhotoList}>
          <FindSkeletonBone style={styles.boneFill} shine={shine} />
        </View>
        <View style={styles.skeletonListMiddle}>
          <FindSkeletonBone style={styles.boneTitle} shine={shine} />
          <FindSkeletonBone style={styles.boneMeta} shine={shine} />
          <FindSkeletonBone style={styles.boneProximity} shine={shine} />
          <View style={styles.skeletonDivider} />
          <View style={styles.skeletonPills}>
            <FindSkeletonBone style={styles.bonePill} shine={shine} />
            <FindSkeletonBone style={styles.bonePillWide} shine={shine} />
            <FindSkeletonBone style={styles.bonePill} shine={shine} />
          </View>
        </View>
        <View style={styles.skeletonListRight}>
          <FindSkeletonBone style={styles.boneHeart} shine={shine} />
          <View style={styles.skeletonPriceBlock}>
            <FindSkeletonBone style={styles.boneFrom} shine={shine} />
            <FindSkeletonBone style={styles.bonePrice} shine={shine} />
            <FindSkeletonBone style={styles.boneCta} shine={shine} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.skeleton}
    >
      <View style={styles.skeletonPhoto}>
        <FindSkeletonBone style={styles.boneFill} shine={shine} />
        <FindSkeletonBone style={styles.skeletonHeart} shine={shine} />
      </View>
      <View style={styles.skeletonGridBody}>
        <View style={styles.skeletonGridHeader}>
          <View style={styles.skeletonGridHeaderLeft}>
            <FindSkeletonBone style={styles.boneTitle} shine={shine} />
            <FindSkeletonBone style={styles.boneMeta} shine={shine} />
          </View>
          <View style={styles.skeletonGridPriceCol}>
            <FindSkeletonBone style={styles.boneFrom} shine={shine} />
            <FindSkeletonBone style={styles.boneGridPrice} shine={shine} />
          </View>
        </View>
        <FindSkeletonBone style={styles.boneProximity} shine={shine} />
        <View style={styles.skeletonDivider} />
        <View style={styles.skeletonPills}>
          <FindSkeletonBone style={styles.bonePill} shine={shine} />
          <FindSkeletonBone style={styles.bonePillWide} shine={shine} />
          <FindSkeletonBone style={styles.bonePill} shine={shine} />
          <FindSkeletonBone style={styles.bonePillSm} shine={shine} />
        </View>
      </View>
    </View>
  );
}

function gridColumnStyle(columns: 1 | 2 | 3) {
  if (columns === 1) return styles.grid1;
  if (columns === 2) return styles.grid2;
  return styles.grid3;
}

function rowKey(row: MixedListingRow): string {
  return row.kind === "separator"
    ? campusFarSeparatorKey(row.km)
    : row.listing.id;
}

export function FindResultsGrid({
  listings,
  matches,
  loading,
  error,
  onRetry,
  variant = "grid",
  columns = 3,
  onHoverListing,
  showDistanceSplit = false,
  universityLabel = "",
}: Props) {
  const reduced = useReducedMotion();
  const isList = variant === "list";
  const layoutStyle = isList
    ? styles.list
    : [styles.grid, gridColumnStyle(columns)];
  const shine = !reduced;

  if (loading && listings.length === 0) {
    const count = skeletonCount(columns, isList);
    return (
      <View style={styles.wrap}>
        <View style={layoutStyle}>
          {Array.from({ length: count }, (_, index) => (
            <View
              key={`skel-${index}`}
              style={isList ? undefined : styles.gridCell}
            >
              <SkeletonCard list={isList} shine={shine} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <WebEmptyState
        icon="cloud-offline-outline"
        title="Couldn’t load listings"
        message="Check your connection and try again."
        actionLabel="Retry"
        onAction={onRetry}
      />
    );
  }

  if (listings.length === 0) {
    return (
      <WebEmptyState
        icon="search-outline"
        title="No listings match"
        message="Try widening your areas or clearing a few filters."
      />
    );
  }

  const rows: MixedListingRow[] = withCampusDistanceSeparator(listings, {
    enabled: showDistanceSplit,
    universityLabel,
  });

  return (
    <View style={styles.wrap}>
      <View style={layoutStyle}>
        {rows.map((row: MixedListingRow) => {
          if (row.kind === "separator") {
            return (
              <View
                key={rowKey(row)}
                style={isList ? undefined : styles.gridSpan}
              >
                <CampusFarSeparator label={row.label} />
              </View>
            );
          }
          return (
            <View
              key={rowKey(row)}
              style={isList ? undefined : styles.gridCell}
            >
              <ListingResultCard
                listing={row.listing}
                match={matches?.[row.listing.id]}
                variant={variant}
                onHoverListing={onHoverListing}
              />
            </View>
          );
        })}
      </View>
      {loading ? (
        <View style={styles.loadingMore}>
          <ActivityIndicator color={Skoun.color.primary} size="small" />
          <LText variant="caption" tone="muted">
            Updating…
          </LText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: 0,
  },
  /** Responsive Amber grid: 1 / 2 / 3 cols via `columns` prop */
  grid: {
    display: "grid",
    gap: 20,
    alignItems: "start",
  } as Record<string, unknown>,
  grid3: {
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  } as Record<string, unknown>,
  grid2: {
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  } as Record<string, unknown>,
  grid1: {
    gridTemplateColumns: "minmax(0, 1fr)",
  } as Record<string, unknown>,
  gridCell: {
    minWidth: 0,
  },
  gridSpan: {
    minWidth: 0,
    gridColumn: "1 / -1",
  } as Record<string, unknown>,
  list: {
    flexDirection: "column",
    gap: 18,
  },
  skeleton: {
    backgroundColor: Skoun.color.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: "hidden",
  },
  skeletonList: {
    flexDirection: "row",
    minHeight: 220,
    alignItems: "stretch",
  },
  skeletonPhoto: {
    position: "relative",
    aspectRatio: 16 / 10,
    backgroundColor: Skoun.color.primaryMist,
    overflow: "hidden",
  },
  skeletonPhotoList: {
    position: "relative",
    width: 280,
    minHeight: 220,
    flexShrink: 0,
    backgroundColor: Skoun.color.primaryMist,
    overflow: "hidden",
  },
  skeletonHeart: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  skeletonGridBody: {
    height: GRID_BODY_HEIGHT,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 12,
    gap: 6,
  },
  skeletonGridHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    minHeight: 38,
  },
  skeletonGridHeaderLeft: {
    flex: 1,
    minWidth: 0,
    gap: 6,
    paddingRight: 4,
  },
  skeletonGridPriceCol: {
    alignItems: "flex-end",
    flexShrink: 0,
    gap: 4,
    paddingTop: 1,
  },
  skeletonListMiddle: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 8,
  },
  skeletonListRight: {
    width: 185,
    flexShrink: 0,
    borderLeftWidth: 1,
    borderLeftColor: CARD_BORDER,
    paddingVertical: 14,
    paddingHorizontal: 14,
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  skeletonPriceBlock: {
    width: "100%",
    gap: 8,
    alignItems: "stretch",
  },
  skeletonDivider: {
    marginTop: 2,
    marginBottom: 2,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: CARD_BORDER,
    alignSelf: "stretch",
  },
  skeletonPills: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 5,
    overflow: "hidden",
  },
  bone: {
    position: "relative",
    backgroundColor: Skoun.color.bgWash,
    borderRadius: 4,
    overflow: "hidden",
  },
  boneFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  boneTitle: {
    height: 16,
    width: "78%",
    borderRadius: 4,
  },
  boneMeta: {
    height: 12,
    width: "54%",
    borderRadius: 4,
  },
  boneProximity: {
    height: 11,
    width: "62%",
    borderRadius: 4,
  },
  boneFrom: {
    height: 10,
    width: 32,
    borderRadius: 4,
  },
  bonePrice: {
    height: 20,
    width: "72%",
    borderRadius: 4,
  },
  boneGridPrice: {
    height: 16,
    width: 72,
    borderRadius: 4,
  },
  bonePill: {
    height: 22,
    width: 64,
    borderRadius: 999,
  },
  bonePillWide: {
    height: 22,
    width: 86,
    borderRadius: 999,
  },
  bonePillSm: {
    height: 22,
    width: 48,
    borderRadius: 999,
  },
  boneHeart: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  boneCta: {
    height: 36,
    width: "100%",
    borderRadius: 10,
    marginTop: 4,
  },
  loadingMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
});

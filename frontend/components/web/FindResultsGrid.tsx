import { ActivityIndicator, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import { ListingResultCard } from "@/components/web/ListingResultCard";
import { WebEmptyState } from "@/components/web/WebEmptyState";
import { Skoun } from "@/constants/theme";
import type { Listing } from "@/types/listing";

type Props = {
  listings: Listing[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  variant?: "grid" | "list";
  columns?: 1 | 2 | 3;
};

function SkeletonCard({ list }: { list?: boolean }) {
  return (
    <View style={[styles.skeleton, list && styles.skeletonList]}>
      <View style={[styles.skeletonPhoto, list && styles.skeletonPhotoList]} />
      <View style={styles.skeletonBody}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
      </View>
    </View>
  );
}

function gridColumnStyle(columns: 1 | 2 | 3) {
  if (columns === 1) return styles.grid1;
  if (columns === 2) return styles.grid2;
  return null;
}

export function FindResultsGrid({
  listings,
  loading,
  error,
  onRetry,
  variant = "grid",
  columns = 3,
}: Props) {
  const isList = variant === "list";
  const layoutStyle = isList
    ? styles.list
    : [styles.grid, gridColumnStyle(columns)];

  if (loading && listings.length === 0) {
    return (
      <View style={layoutStyle}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <SkeletonCard key={i} list={isList} />
        ))}
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

  return (
    <View style={styles.wrap}>
      <View style={layoutStyle}>
        {listings.map((listing) => (
          <ListingResultCard
            key={listing.id}
            listing={listing}
            variant={variant}
          />
        ))}
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 16,
  } as Record<string, unknown>,
  grid2: {
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  } as Record<string, unknown>,
  grid1: {
    gridTemplateColumns: "minmax(0, 1fr)",
  } as Record<string, unknown>,
  list: {
    flexDirection: "column",
    gap: 14,
  },
  skeleton: {
    backgroundColor: Skoun.color.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    overflow: "hidden",
  },
  skeletonList: {
    flexDirection: "row",
  },
  skeletonPhoto: {
    aspectRatio: 4 / 3,
    backgroundColor: Skoun.color.bgWash,
  },
  skeletonPhotoList: {
    width: 280,
    height: 200,
    aspectRatio: undefined,
    flexShrink: 0,
  },
  skeletonBody: {
    flex: 1,
    padding: 14,
    gap: 10,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 4,
    backgroundColor: Skoun.color.bgWash,
  },
  skeletonLineShort: {
    width: "60%",
  },
  loadingMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
});

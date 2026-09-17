import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { HostStatusPill } from "@/components/web/host/HostStatusPill";
import { formatAnalyticsDaysLeft, formatAnalyticsViews } from "@/components/web/host/analytics/hostAnalyticsFormat";
import { hostListingStatus } from "@/components/web/host/hostListingStatus";
import { Skoun } from "@/constants/theme";
import type { HostAnalyticsListing } from "@/features/listings/hostAnalytics";
import { resolveMediaUrl } from "@/lib/mediaUrl";

type RowProps = {
  listing: HostAnalyticsListing;
  compact?: boolean;
  onPress: (listing: HostAnalyticsListing) => void;
};

export function HostAnalyticsListingRow({
  listing,
  compact = false,
  onPress,
}: RowProps) {
  const cover = resolveMediaUrl(listing.coverUrl);
  const status = hostListingStatus(listing);
  const title = listing.title?.trim() || listing.area || "Untitled listing";
  const daysLabel = formatAnalyticsDaysLeft(listing.daysLeft);
  const viewsLabel = formatAnalyticsViews(listing.viewCount);
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${title}. ${status.label}. ${viewsLabel} views. ${daysLabel}`}
      onPress={() => onPress(listing)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.dataRow,
        compact && styles.dataRowCompact,
        (pressed || hovered) && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.dataCell,
          compact ? styles.listingColCompact : styles.listingCol,
          styles.listingCell,
        ]}
      >
        <View style={[styles.thumb, compact && styles.thumbCompact]}>
          {cover ? (
            <Image
              source={{ uri: cover }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <Ionicons
                name="image-outline"
                size={16}
                color={Skoun.color.inkFaint}
              />
            </View>
          )}
        </View>
        <View style={styles.listingText}>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {title}
          </Text>
          {compact ? (
            <Text style={styles.rowMeta} numberOfLines={1}>
              {listing.area}
            </Text>
          ) : null}
        </View>
      </View>

      {!compact ? (
        <Text style={[styles.dataCell, styles.areaCol]} numberOfLines={1}>
          {listing.area}
        </Text>
      ) : null}

      {compact ? (
        <View style={styles.trailingCompact}>
          <HostStatusPill label={status.label} tone={status.tone} />
          <Text style={styles.metricPrimary}>{viewsLabel} views</Text>
          <Text style={styles.metricSecondary}>{daysLabel}</Text>
        </View>
      ) : (
        <>
          <View style={[styles.dataCell, styles.statusCol]}>
            <HostStatusPill label={status.label} tone={status.tone} />
          </View>
          <Text style={[styles.dataCell, styles.viewsCol]}>{viewsLabel}</Text>
          <Text style={[styles.dataCell, styles.daysCol]} numberOfLines={1}>
            {daysLabel}
          </Text>
        </>
      )}
    </Pressable>
  );
}

type TableProps = {
  listings: HostAnalyticsListing[];
  compact?: boolean;
  onPressListing: (listing: HostAnalyticsListing) => void;
};

export function HostAnalyticsListingTable({
  listings,
  compact = false,
  onPressListing,
}: TableProps) {
  return (
    <View style={styles.table}>
      {!compact ? (
        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, styles.listingCol]}>Listing</Text>
          <Text style={[styles.headerCell, styles.areaCol]}>Area</Text>
          <Text style={[styles.headerCell, styles.statusCol]}>Status</Text>
          <Text style={[styles.headerCell, styles.viewsCol]}>Views</Text>
          <Text style={[styles.headerCell, styles.daysCol]}>Days left</Text>
        </View>
      ) : null}
      {listings.map((listing) => (
        <HostAnalyticsListingRow
          key={listing.id}
          listing={listing}
          compact={compact}
          onPress={onPressListing}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerCell: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 12,
    color: Skoun.color.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : null),
  },
  dataRowCompact: {
    paddingVertical: 14,
    gap: 12,
    alignItems: "flex-start",
  },
  pressed: {
    backgroundColor: "#F8FAFC",
  },
  dataCell: {
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: Skoun.color.ink,
  },
  listingCol: { flex: 2.2, minWidth: 0 },
  listingColCompact: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
  areaCol: { flex: 1.1, minWidth: 0 },
  statusCol: { flex: 1, minWidth: 0, alignItems: "flex-start" },
  viewsCol: { flex: 0.7, minWidth: 0 },
  daysCol: { flex: 1, minWidth: 0 },
  listingCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  listingText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    flexShrink: 0,
  },
  thumbCompact: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: Skoun.color.ink,
    lineHeight: 18,
  },
  rowMeta: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    color: Skoun.color.inkMuted,
  },
  trailingCompact: {
    flexShrink: 0,
    alignItems: "flex-end",
    gap: 6,
    maxWidth: 140,
  },
  metricPrimary: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 13,
    color: Skoun.color.ink,
  },
  metricSecondary: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    color: Skoun.color.inkMuted,
  },
});

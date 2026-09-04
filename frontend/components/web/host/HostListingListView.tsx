import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { HostStatusPill } from "@/components/web/host/HostStatusPill";
import {
  checkpointCoverPhoto,
  checkpointDisplayTitle,
  checkpointLocationLine,
} from "@/features/listings/create/createDraftCheckpoint";
import type { DraftCheckpoint, DraftSlot } from "@/features/listings/create/draft";
import { labelListingType } from "@/lib/listingLabels";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { Skoun } from "@/constants/theme";
import type { Listing } from "@/types/listing";
import { hostListingStatus } from "@/components/web/host/hostListingStatus";

export type HostListRow =
  | {
      kind: "local-draft";
      key: string;
      slot: DraftSlot;
      checkpoint: DraftCheckpoint;
    }
  | { kind: "listing"; listing: Listing };

type Props = {
  rows: HostListRow[];
  compact?: boolean;
  onDraftPress: (row: HostListRow) => void;
  onListingPress: (listing: Listing) => void;
};

export function HostListingListView({
  rows,
  compact = false,
  onDraftPress,
  onListingPress,
}: Props) {
  return (
    <View style={styles.table}>
      {!compact ? (
        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, styles.listingCol]}>Listing</Text>
          <Text style={[styles.headerCell, styles.typeCol]}>Type</Text>
          <Text style={[styles.headerCell, styles.locationCol]}>Location</Text>
          <Text style={[styles.headerCell, styles.statusCol]}>Status</Text>
        </View>
      ) : null}

      {rows.map((row) => {
        if (row.kind === "local-draft") {
          const cover = checkpointCoverPhoto(row.checkpoint)?.uri;
          const title = checkpointDisplayTitle(row.checkpoint);
          const location = checkpointLocationLine(row.checkpoint);
          const typeLabel = "Home";

          return (
            <Pressable
              key={row.key}
              onPress={() => onDraftPress(row)}
              style={({ pressed }) => [
                styles.dataRow,
                compact && styles.dataRowCompact,
                pressed && styles.pressed,
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
                      {location.replace(/^Home in /, "")}
                    </Text>
                  ) : null}
                </View>
              </View>
              {!compact ? (
                <>
                  <Text
                    style={[styles.dataCell, styles.typeCol]}
                    numberOfLines={1}
                  >
                    {typeLabel}
                  </Text>
                  <Text
                    style={[styles.dataCell, styles.locationCol]}
                    numberOfLines={1}
                  >
                    {location.replace(/^Home in /, "")}
                  </Text>
                </>
              ) : null}
              <View
                style={[
                  styles.dataCell,
                  compact ? styles.statusColCompact : styles.statusCol,
                ]}
              >
                <HostStatusPill label="In progress" tone="progress" />
              </View>
            </Pressable>
          );
        }

        const { listing } = row;
        const cover = resolveMediaUrl(
          listing.coverUrl ?? listing.photos[0]?.url ?? null,
        );
        const status = hostListingStatus(listing);
        const title =
          listing.title?.trim() ||
          `Your listing started ${new Date(listing.createdAt).toLocaleDateString(
            "en-US",
            {
              month: "long",
              day: "numeric",
              year: "numeric",
            },
          )}`;
        const isDraft = listing.status === "draft";

        return (
          <Pressable
            key={listing.id}
            onPress={() =>
              isDraft ? onDraftPress(row) : onListingPress(listing)
            }
            style={({ pressed }) => [
              styles.dataRow,
              compact && styles.dataRowCompact,
              pressed && styles.pressed,
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
              <>
                <Text
                  style={[styles.dataCell, styles.typeCol]}
                  numberOfLines={1}
                >
                  {labelListingType(listing.listingType)}
                </Text>
                <Text
                  style={[styles.dataCell, styles.locationCol]}
                  numberOfLines={1}
                >
                  {listing.area}
                </Text>
              </>
            ) : null}
            <View
              style={[
                styles.dataCell,
                compact ? styles.statusColCompact : styles.statusCol,
              ]}
            >
              <HostStatusPill label={status.label} tone={status.tone} />
            </View>
          </Pressable>
        );
      })}
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
  listingColCompact: { flex: 1, minWidth: 0 },
  typeCol: { flex: 0.9, minWidth: 0 },
  locationCol: { flex: 1.1, minWidth: 0 },
  statusCol: { flex: 1, minWidth: 0, alignItems: "flex-start" },
  statusColCompact: { flexShrink: 0, alignItems: "flex-end" },
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
});

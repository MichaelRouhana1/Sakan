import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  HostDraftModal,
  type DraftModalTarget,
} from "@/components/web/host/HostDraftModal";
import { HostDraftGridCard } from "@/components/web/host/HostDraftGridCard";
import { HostListingGridCard } from "@/components/web/host/HostListingGridCard";
import {
  HostListingListView,
  type HostListRow,
} from "@/components/web/host/HostListingListView";
import {
  HostListingsToolbar,
  type HostListingsLayout,
} from "@/components/web/host/HostListingsToolbar";
import { WEB_CONTENT_MAX, WEB_CONTENT_PAD_X } from "@/constants/webLayout";
import { Skoun } from "@/constants/theme";
import { openNewCreateListing } from "@/features/auth/useEnsureSession";
import { draftHasMeaningfulProgress } from "@/features/listings/create/createDraftCheckpoint";
import { useCreateDraftMeta } from "@/features/listings/useHostingNavState";
import type { DraftCheckpoint, DraftSlot } from "@/features/listings/create/draft";
import { useMyListings } from "@/features/listings/useMyListings";
import type { Listing } from "@/types/listing";

type GridItem =
  | {
      kind: "draft";
      key: string;
      savedAt: string;
      slot: DraftSlot;
      checkpoint: DraftCheckpoint;
    }
  | { kind: "listing"; key: string; listing: Listing; sortAt: string };

const CARD_WIDTH = 240;
const GRID_GAP = 16;

export function HostListingsPage() {
  const { checkpoint, workingCheckpoint, refresh } = useCreateDraftMeta();
  const { data, isLoading, isError, refetch, isFetching } = useMyListings();
  const [layout, setLayout] = useState<HostListingsLayout>("grid");
  const [draftModal, setDraftModal] = useState<DraftModalTarget | null>(null);

  const showMainDraft =
    checkpoint != null && draftHasMeaningfulProgress(checkpoint);
  const showWorkingDraft =
    workingCheckpoint != null && draftHasMeaningfulProgress(workingCheckpoint);

  const items = useMemo(() => {
    const rows: GridItem[] = [];
    if (showMainDraft && checkpoint) {
      rows.push({
        kind: "draft",
        key: "local-draft-main",
        savedAt: checkpoint.savedAt,
        slot: "main",
        checkpoint,
      });
    }
    if (showWorkingDraft && workingCheckpoint) {
      rows.push({
        kind: "draft",
        key: "local-draft-working",
        savedAt: workingCheckpoint.savedAt,
        slot: "working",
        checkpoint: workingCheckpoint,
      });
    }
    for (const listing of data ?? []) {
      rows.push({
        kind: "listing",
        key: listing.id,
        listing,
        sortAt: listing.updatedAt,
      });
    }
    rows.sort((a, b) => {
      const aDraft =
        a.kind === "draft" ||
        (a.kind === "listing" && a.listing.status === "draft");
      const bDraft =
        b.kind === "draft" ||
        (b.kind === "listing" && b.listing.status === "draft");
      if (aDraft !== bDraft) return aDraft ? -1 : 1;
      const aTime = a.kind === "draft" ? a.savedAt : a.sortAt;
      const bTime = b.kind === "draft" ? b.savedAt : b.sortAt;
      return bTime.localeCompare(aTime);
    });
    return rows;
  }, [checkpoint, workingCheckpoint, data, showMainDraft, showWorkingDraft]);

  const listRows = useMemo((): HostListRow[] => {
    return items.flatMap((item) => {
      if (item.kind === "draft") {
        return [
          {
            kind: "local-draft" as const,
            key: item.key,
            slot: item.slot,
            checkpoint: item.checkpoint,
          },
        ];
      }
      if (item.kind === "listing") {
        return [{ kind: "listing" as const, listing: item.listing }];
      }
      return [];
    });
  }, [items]);

  function openLocalDraftModal(
    slot: DraftSlot,
    cp: DraftCheckpoint,
  ) {
    setDraftModal({ kind: "local", checkpoint: cp, slot });
  }

  function openServerDraftModal(listing: Listing) {
    setDraftModal({ kind: "server", listing });
  }

  function handleListingPress(listing: Listing) {
    if (listing.status === "draft") {
      openServerDraftModal(listing);
      return;
    }
    router.push({
      pathname: "/(poster)/listing/[id]",
      params: { id: listing.id },
    });
  }

  async function handleDraftRemoved() {
    await Promise.all([refresh(), refetch()]);
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={undefined}
      >
        <View style={styles.page}>
          <HostListingsToolbar layout={layout} onLayoutChange={setLayout} />

          {isLoading ? (
            <ActivityIndicator color={Skoun.color.primary} style={styles.loader} />
          ) : isError ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Couldn’t load listings</Text>
              <Text style={styles.emptyBody}>
                Check that the API is reachable, then try again.
              </Text>
              <Pressable onPress={() => void refetch()} style={styles.retryBtn}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No listings yet</Text>
              <Text style={styles.emptyBody}>
                Start your first listing — it only takes a few minutes.
              </Text>
              <Pressable
                onPress={() => openNewCreateListing(router)}
                style={styles.retryBtn}
              >
                <Text style={styles.retryText}>Create a listing</Text>
              </Pressable>
            </View>
          ) : layout === "list" ? (
            <HostListingListView
              rows={listRows}
              onDraftPress={(row) => {
                if (row.kind === "local-draft") {
                  openLocalDraftModal(row.slot, row.checkpoint);
                } else {
                  openServerDraftModal(row.listing);
                }
              }}
              onListingPress={handleListingPress}
            />
          ) : (
            <View style={styles.grid}>
              {items.map((item) =>
                item.kind === "draft" ? (
                  <View key={item.key} style={styles.cell}>
                    <HostDraftGridCard
                      checkpoint={item.checkpoint}
                      onPress={() =>
                        openLocalDraftModal(item.slot, item.checkpoint)
                      }
                    />
                  </View>
                ) : item.kind === "listing" ? (
                  <View key={item.key} style={styles.cell}>
                    <HostListingGridCard
                      listing={item.listing}
                      onPress={() => handleListingPress(item.listing)}
                    />
                  </View>
                ) : null,
              )}
            </View>
          )}

          {isFetching && !isLoading ? (
            <Text style={styles.refreshHint}>Refreshing…</Text>
          ) : null}
        </View>
      </ScrollView>

      <HostDraftModal
        target={draftModal}
        onClose={() => setDraftModal(null)}
        onRemoved={() => void handleDraftRemoved()}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingBottom: 64,
  },
  page: {
    width: "100%",
    maxWidth: WEB_CONTENT_MAX,
    alignSelf: "center",
    paddingHorizontal: WEB_CONTENT_PAD_X,
    paddingTop: 32,
    boxSizing: "border-box",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  cell: {
    width: CARD_WIDTH,
    flexShrink: 0,
    paddingBottom: 8,
    boxSizing: "border-box",
  },
  loader: {
    marginTop: 48,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 64,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 22,
    color: Skoun.color.ink,
  },
  emptyBody: {
    fontFamily: Skoun.type.body,
    fontSize: 15,
    color: Skoun.color.inkMuted,
    textAlign: "center",
    maxWidth: 360,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Skoun.color.primary,
    cursor: "pointer",
  },
  retryText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 15,
    color: "#FFFFFF",
  },
  refreshHint: {
    marginTop: 16,
    textAlign: "center",
    fontFamily: Skoun.type.body,
    fontSize: 13,
    color: Skoun.color.inkMuted,
  },
});

import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SkounAuthModal } from "@/components/auth/SkounAuthModal";
import { LText } from "@/components/lister/Typography";
import { ListingResultCard } from "@/components/web/ListingResultCard";
import { WebEmptyState } from "@/components/web/WebEmptyState";
import { Skoun } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { useSavedListings } from "@/features/saved/useSavedListings";
import type { Listing } from "@/types/listing";

export function SavedWeb() {
  const { isSignedIn, isLoading: authLoading } = useAuthSession();
  const { data, isLoading, isError, refetch, isFetching } = useSavedListings();
  const [authOpen, setAuthOpen] = useState(false);

  if (authLoading || (isSignedIn && isLoading)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Skoun.color.primary} size="large" />
      </View>
    );
  }

  if (!isSignedIn) {
    return (
      <>
        <WebEmptyState
          icon="heart-outline"
          title="Sign in to see saved listings"
          message="Hearts sync to your account so you can compare places across devices."
          actionLabel="Sign in"
          onAction={() => setAuthOpen(true)}
        />
        <SkounAuthModal
          visible={authOpen}
          onClose={() => setAuthOpen(false)}
          onSuccess={() => setAuthOpen(false)}
          title="Sign in to save listings"
        />
      </>
    );
  }

  if (isError) {
    return (
      <WebEmptyState
        icon="cloud-offline-outline"
        title="Couldn’t load saved listings"
        message="Check your connection and try again."
        actionLabel="Retry"
        onAction={() => void refetch()}
      />
    );
  }

  const listings = data ?? [];

  if (listings.length === 0) {
    return (
      <View style={styles.page}>
        <View style={styles.header}>
          <LText variant="display" style={styles.title}>
            Saved listings
          </LText>
        </View>
        <WebEmptyState
          icon="heart-outline"
          title="Nothing saved yet"
          message="Save places you like while browsing — they’ll show up here for easy comparison."
          actionLabel="Browse listings"
          onAction={() => router.push("/search" as never)}
        />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <LText variant="display" style={styles.title}>
          Saved listings
        </LText>
        <LText variant="body" tone="muted">
          {listings.length} place{listings.length === 1 ? "" : "s"} in your
          shortlist
          {isFetching ? " · updating…" : ""}
        </LText>
      </View>

      <View style={styles.grid}>
        {listings.map((listing: Listing) => {
          const unavailable = listing.status !== "active";
          return (
            <View key={listing.id} style={styles.cardWrap}>
              <ListingResultCard listing={listing} />
              {unavailable ? (
                <View style={styles.unavailable}>
                  <LText variant="caption" style={styles.unavailableText}>
                    No longer available — still in your shortlist
                  </LText>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    gap: 24,
    paddingTop: 8,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 32,
    color: Skoun.color.primaryDeep,
    letterSpacing: -0.5,
  },
  center: {
    paddingVertical: 80,
    alignItems: "center",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 16,
  } as Record<string, unknown>,
  cardWrap: {
    position: "relative",
  },
  unavailable: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(18, 24, 38, 0.82)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  unavailableText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 12,
  },
});

import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { StudentlyAuthModal } from "@/components/auth/StudentlyAuthModal";
import { Enter } from "@/components/lister/Enter";
import { EmptyState } from "@/components/lister/EmptyState";
import { ListerScreen } from "@/components/lister/Screen";
import { LText } from "@/components/lister/Typography";
import { ListingCard } from "@/components/listings/ListingCard";
import {
  CarouselListScrollContext,
  useCarouselListScrollController,
} from "@/components/listings/carouselListScroll";
import {
  CollapsingHeaderBar,
  useCollapsingHeader,
} from "@/components/ui/CollapsingHeader";
import { appleTabScrollInset } from "@/components/ui/Glass";
import { HideIosTabScrollFade } from "@/components/ui/HideIosTabScrollFade";
import { Studently } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { useSavedListings } from "@/features/saved/useSavedListings";
import type { Listing } from "@/types/listing";

function SavedCard({
  listing,
  index,
}: {
  listing: Listing;
  index: number;
}) {
  const unavailable = listing.status !== "active";

  return (
    <View style={styles.cardWrap}>
      <ListingCard
        listing={listing}
        index={index}
        onPress={() =>
          router.push({
            pathname: "/(renter)/listing/[id]",
            params: { id: listing.id },
          })
        }
      />
      {unavailable ? (
        <View style={styles.unavailable} accessibilityRole="text">
          <LText variant="caption" style={styles.unavailableText}>
            No longer available — still in your shortlist
          </LText>
        </View>
      ) : null}
    </View>
  );
}

export default function SavedScreen() {
  const { isSignedIn, isLoading: authLoading } = useAuthSession();
  const { data, isLoading, isError, refetch, isFetching } = useSavedListings();
  const carouselScroll = useCarouselListScrollController();
  const [authOpen, setAuthOpen] = useState(false);
  const header = useCollapsingHeader({ defaultThreshold: 64 });

  return (
    <CarouselListScrollContext.Provider value={carouselScroll.value}>
    <ListerScreen>
      <View style={styles.listStage}>
      <HideIosTabScrollFade style={styles.listFadeWrap}>
      <Animated.FlatList
        ref={carouselScroll.listRef as never}
        data={data ?? []}
        keyExtractor={(item) => item.id}
        onScroll={header.onScroll}
        scrollEventThrottle={header.scrollEventThrottle}
        contentContainerStyle={styles.content}
        nestedScrollEnabled
        directionalLockEnabled
        onRefresh={() => void refetch()}
        refreshing={isFetching && !isLoading}
        ListHeaderComponent={
          <Enter>
            <View style={styles.header}>
              <LText variant="label" tone="brass">
                Your shortlist
              </LText>
              <Animated.View
                style={header.largeTitleStyle}
                onLayout={header.onLargeTitleLayout}
              >
                <LText variant="display">Saved</LText>
              </Animated.View>
              <LText variant="body" tone="muted">
                Synced to your account — tap the heart on any listing to keep
                it here across devices.
              </LText>
            </View>
          </Enter>
        }
        renderItem={({ item, index }) => (
          <SavedCard listing={item} index={index} />
        )}
        ListEmptyComponent={
          authLoading || (isSignedIn && isLoading) ? (
            <ActivityIndicator
              color={Studently.color.primary}
              style={{ marginTop: 40 }}
            />
          ) : !isSignedIn ? (
            <EmptyState
              title="Sign in to see saved"
              body="Hearts sync to your account so you can compare places across devices."
              ctaLabel="Sign in"
              onCta={() => setAuthOpen(true)}
              icon="heart-outline"
            />
          ) : isError ? (
            <EmptyState
              title="Couldn’t load saved"
              body="Check your connection — your shortlist lives on your account."
              ctaLabel="Try again"
              onCta={() => void refetch()}
              icon="alert-circle-outline"
            />
          ) : (
            <EmptyState
              title="Nothing saved yet"
              body="When a place feels right, tap the heart. It’ll stay on your account for quick return visits."
              ctaLabel="Browse listings"
              onCta={() => router.navigate("/(renter)/(tabs)/(explore)" as never)}
              icon="heart-outline"
            />
          )
        }
        ListFooterComponent={<View style={{ height: 24 }} />}
      />
      </HideIosTabScrollFade>
      <CollapsingHeaderBar
        controller={header}
        title="Saved"
        variant="overlay"
        backgroundColor={Studently.color.bg}
        borderColor={Studently.color.border}
        titleColor={Studently.color.ink}
        testID="saved-collapsing-header"
      />
      </View>
      <StudentlyAuthModal
        visible={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => setAuthOpen(false)}
        title="Sign in to save listings"
      />
    </ListerScreen>
    </CarouselListScrollContext.Provider>
  );
}

const styles = StyleSheet.create({
  listStage: {
    flex: 1,
    position: "relative",
  },
  listFadeWrap: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Studently.space.lg,
    paddingBottom: appleTabScrollInset,
    flexGrow: 1,
  },
  header: {
    paddingTop: Studently.space.sm,
    paddingBottom: Studently.space.md,
    gap: 4,
  },
  cardWrap: {
    marginBottom: Studently.space.md,
    gap: 6,
  },
  unavailable: {
    alignSelf: "flex-start",
    backgroundColor: Studently.color.warningSoft,
    borderRadius: Studently.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Studently.color.warning,
  },
  unavailableText: {
    color: Studently.color.warning,
    fontFamily: Studently.type.bodySemi,
  },
});

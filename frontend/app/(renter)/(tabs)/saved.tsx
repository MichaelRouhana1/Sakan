import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
} from "react-native";
import { Enter } from "@/components/lister/Enter";
import { EmptyState } from "@/components/lister/EmptyState";
import { ListerScreen } from "@/components/lister/Screen";
import { LText } from "@/components/lister/Typography";
import { ListingCard } from "@/components/listings/ListingCard";
import { SwitchRoleControl } from "@/components/auth/SwitchRoleControl";
import { appleTabScrollInset } from "@/components/ui/Glass";
import { Skoun } from "@/constants/theme";
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
  const { data, isLoading, isError, refetch, isFetching } = useSavedListings();

  return (
    <ListerScreen>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        onRefresh={() => void refetch()}
        refreshing={isFetching && !isLoading}
        ListHeaderComponent={
          <Enter>
            <View style={styles.header}>
              <LText variant="label" tone="brass">
                Your shortlist
              </LText>
              <LText variant="display">Saved</LText>
              <LText variant="body" tone="muted">
                Synced to your account — tap the heart on any listing to keep
                it here across devices.
              </LText>
              <View style={styles.switchWrap}>
                <SwitchRoleControl currentRole="renter" />
              </View>
            </View>
          </Enter>
        }
        renderItem={({ item, index }) => (
          <SavedCard listing={item} index={index} />
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator
              color={Skoun.color.primary}
              style={{ marginTop: 40 }}
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
              onCta={() => router.push("/(renter)")}
              icon="heart-outline"
            />
          )
        }
        ListFooterComponent={<View style={{ height: 24 }} />}
      />
    </ListerScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Skoun.space.lg,
    paddingBottom: appleTabScrollInset,
    flexGrow: 1,
  },
  header: {
    paddingTop: Skoun.space.sm,
    paddingBottom: Skoun.space.md,
    gap: 4,
  },
  switchWrap: {
    marginTop: 12,
    alignItems: "flex-start",
  },
  cardWrap: {
    marginBottom: Skoun.space.md,
    gap: 6,
  },
  unavailable: {
    alignSelf: "flex-start",
    backgroundColor: Skoun.color.warningSoft,
    borderRadius: Skoun.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Skoun.color.warning,
  },
  unavailableText: {
    color: Skoun.color.warning,
    fontFamily: Skoun.type.bodySemi,
  },
});

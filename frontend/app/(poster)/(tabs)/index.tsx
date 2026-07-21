import { router } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { EmptyState } from "@/components/lister/EmptyState";
import { Enter } from "@/components/lister/Enter";
import { LButton } from "@/components/lister/Button";
import { PosterListingCard } from "@/components/lister/PosterListingCard";
import { ListerScreen } from "@/components/lister/Screen";
import { LText } from "@/components/lister/Typography";
import {
  appleTabScrollInset,
  GlassSurface,
} from "@/components/ui/Glass";
import { Lister } from "@/constants/listerTheme";
import { useMyListings } from "@/features/listings/useMyListings";

export default function PosterDashboardScreen() {
  const { data, isLoading, isError, isFetching, refetch } = useMyListings();

  const summary = useMemo(() => {
    const list = data ?? [];
    const active = list.filter((l) => l.status === "active").length;
    const views = list.reduce((sum, l) => sum + l.viewCount, 0);
    return { active, views, total: list.length };
  }, [data]);

  return (
    <ListerScreen>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => void refetch()}
            tintColor={Lister.color.primary}
            colors={[Lister.color.primary]}
          />
        }
        ListHeaderComponent={
          <Enter>
            <View style={styles.header}>
              <LText variant="label" tone="brass">
                Landlord home
              </LText>
              <LText variant="display">Skoun</LText>
              <LText variant="body" tone="muted">
                Your listings — free to post for 30 days.
              </LText>
            </View>

            {(data?.length ?? 0) > 0 ? (
              <GlassSurface intensity="soft" style={styles.summaryShell}>
                <View style={styles.summaryRow}>
                  <View style={styles.stat}>
                    <LText variant="title" tone="primary">
                      {summary.active}
                    </LText>
                    <LText variant="caption" tone="muted">
                      Live now
                    </LText>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <LText variant="title">{summary.views}</LText>
                    <LText variant="caption" tone="muted">
                      Total views
                    </LText>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.stat}>
                    <LText variant="title">{summary.total}</LText>
                    <LText variant="caption" tone="muted">
                      All posts
                    </LText>
                  </View>
                </View>
              </GlassSurface>
            ) : null}

            <View style={styles.sectionHead}>
              <LText variant="subtitle">Your listings</LText>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/(poster)/create")}
              >
                <LText variant="caption" tone="primary" style={styles.link}>
                  New listing
                </LText>
              </Pressable>
            </View>
          </Enter>
        }
        renderItem={({ item, index }) => (
          <View style={styles.cardWrap}>
            <PosterListingCard
              listing={item}
              index={index}
              onPress={() =>
                router.push({
                  pathname: "/(poster)/listing/[id]",
                  params: { id: item.id },
                })
              }
            />
          </View>
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator
              color={Lister.color.primary}
              style={{ marginTop: 48 }}
            />
          ) : isError ? (
            <View style={styles.errorBox}>
              <LText variant="subtitle">Couldn’t load listings</LText>
              <LText variant="body" tone="muted" style={styles.errorBody}>
                Check that the API is reachable, then try again.
              </LText>
              <LButton
                label="Retry"
                variant="secondary"
                onPress={() => void refetch()}
              />
            </View>
          ) : (
            <EmptyState
              title="No listings yet"
              body="Publish your first place — free for 30 days. Renters will see it in Cities and University Hub."
              ctaLabel="Create a listing"
              onCta={() => router.push("/(poster)/create")}
              icon="add-circle-outline"
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
    paddingHorizontal: Lister.space.lg,
    paddingBottom: appleTabScrollInset,
    flexGrow: 1,
  },
  header: {
    paddingTop: Lister.space.sm,
    paddingBottom: Lister.space.md,
    gap: 4,
  },
  summaryShell: {
    borderRadius: Lister.radius.lg,
    marginBottom: Lister.space.lg,
    overflow: "hidden",
  },
  summaryRow: {
    flexDirection: "row",
    paddingVertical: Lister.space.md,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Lister.color.border,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Lister.space.sm,
  },
  link: {
    fontFamily: Lister.type.bodySemi,
  },
  cardWrap: {
    marginBottom: Lister.space.md,
  },
  errorBox: {
    marginTop: Lister.space.xl,
    alignItems: "center",
    gap: 10,
    padding: Lister.space.lg,
  },
  errorBody: {
    textAlign: "center",
    marginBottom: 8,
  },
});

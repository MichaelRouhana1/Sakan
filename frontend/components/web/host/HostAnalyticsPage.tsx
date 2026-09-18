import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { HostAnalyticsListingTable } from "@/components/web/host/analytics/HostAnalyticsListingRow";
import { HostAnalyticsStatCard } from "@/components/web/host/analytics/HostAnalyticsStatCard";
import {
  formatAnalyticsAvgViews,
  formatAnalyticsViews,
  sortHostAnalyticsListings,
} from "@/components/web/host/analytics/hostAnalyticsFormat";
import { appleTabScrollInset } from "@/components/ui/Glass";
import { WEB_CONTENT_PAD_X } from "@/constants/webLayout";
import { hostListingAnalyticsPath } from "@/constants/hostRoutes";
import { Skoun } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { openNewCreateListing } from "@/features/auth/useEnsureSession";
import type { HostAnalyticsListing } from "@/features/listings/hostAnalytics";
import { useHostAnalytics } from "@/features/listings/useHostAnalytics";
import { useBreakpoint } from "@/lib/breakpoints";

export function HostAnalyticsPage() {
  const router = useRouter();
  const bp = useBreakpoint();
  const compact = bp === "mobile" || Platform.OS !== "web";
  const { isSignedIn } = useAuthSession();
  const { data, isLoading, isError, refetch, isFetching } =
    useHostAnalytics(isSignedIn);

  const listings = useMemo(
    () => sortHostAnalyticsListings(data?.listings ?? []),
    [data?.listings],
  );
  const totals = data?.totals;
  const hasData = data != null;

  function openListing(listing: HostAnalyticsListing) {
    router.push(hostListingAnalyticsPath(listing.id) as never);
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.scroll, compact && styles.scrollCompact]}
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isLoading}
          onRefresh={() => void refetch()}
          tintColor={Skoun.color.primary}
          colors={[Skoun.color.primary]}
        />
      }
    >
      <View style={[styles.page, compact && styles.pageCompact]}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Analytics
          </Text>
          <Text style={styles.trust}>
            Views count when someone opens the listing. Search appearances
            aren’t counted yet.
          </Text>
        </View>

        {isLoading && !hasData ? (
          <ActivityIndicator
            color={Skoun.color.primary}
            style={styles.loader}
          />
        ) : isError && !hasData ? (
          <View style={styles.empty} accessibilityRole="alert">
            <Text style={styles.emptyTitle}>Couldn’t load analytics</Text>
            <Text style={styles.emptyBody}>
              Check that the API is reachable, then try again.
            </Text>
            <Pressable
              onPress={() => void refetch()}
              style={styles.retryBtn}
              accessibilityRole="button"
              accessibilityLabel="Retry loading analytics"
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {totals ? (
              <View style={[styles.stats, compact && styles.statsCompact]}>
                <HostAnalyticsStatCard
                  label="Total views"
                  value={formatAnalyticsViews(totals.totalViews)}
                  compact={compact}
                  glass
                />
                <HostAnalyticsStatCard
                  label="Live listings"
                  value={formatAnalyticsViews(totals.liveCount)}
                  compact={compact}
                  glass
                />
                <HostAnalyticsStatCard
                  label="Ending in 7 days"
                  value={formatAnalyticsViews(totals.endingIn7Days)}
                  tone={totals.endingIn7Days > 0 ? "warning" : "default"}
                  compact={compact}
                  glass
                />
                {totals.avgViewsPerLive != null ? (
                  <HostAnalyticsStatCard
                    label="Avg views per live"
                    value={formatAnalyticsAvgViews(totals.avgViewsPerLive)}
                    compact={compact}
                    glass
                  />
                ) : null}
              </View>
            ) : null}

            {listings.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No listings yet</Text>
                <Text style={styles.emptyBody}>
                  Start your first listing — it only takes a few minutes.
                </Text>
                <Pressable
                  onPress={() => openNewCreateListing(router)}
                  style={styles.retryBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Create a listing"
                >
                  <Text style={styles.retryText}>Create a listing</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your listings</Text>
                <HostAnalyticsListingTable
                  listings={listings}
                  compact={compact}
                  onPressListing={openListing}
                />
              </View>
            )}

            {isError ? (
              <View style={styles.inlineError} accessibilityRole="alert">
                <Text style={styles.emptyBody}>
                  Couldn’t refresh analytics. Showing the last loaded numbers.
                </Text>
                <Pressable
                  onPress={() => void refetch()}
                  style={styles.retryBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading analytics"
                >
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        )}

        {isFetching && !isLoading ? (
          <Text style={styles.refreshHint}>Refreshing…</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingBottom: 64,
  },
  scrollCompact: {
    paddingBottom: appleTabScrollInset + 24,
  },
  page: {
    width: "100%",
    paddingHorizontal: WEB_CONTENT_PAD_X,
    paddingTop: 32,
    ...(Platform.OS === "web" ? { boxSizing: "border-box" as const } : null),
  },
  pageCompact: {
    maxWidth: "100%",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    marginBottom: 24,
    gap: 8,
    maxWidth: 560,
  },
  title: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 24,
    color: Skoun.color.ink,
    letterSpacing: -0.4,
  },
  trust: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    lineHeight: 18,
    color: Skoun.color.inkMuted,
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 32,
  },
  statsCompact: {
    gap: 10,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 18,
    color: Skoun.color.ink,
    letterSpacing: -0.3,
  },
  loader: {
    marginTop: 48,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 64,
    gap: 12,
  },
  inlineError: {
    alignItems: "center",
    paddingTop: 20,
    gap: 8,
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
    ...(Platform.OS === "web" ? { cursor: "pointer" as const } : null),
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

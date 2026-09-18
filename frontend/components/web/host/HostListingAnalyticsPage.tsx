import axios from "axios";
import { Link, useRouter } from "expo-router";
import type { ReactNode } from "react";
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
import {
  HostAnalyticsGlassPane,
  HostAnalyticsStatCard,
} from "@/components/web/host/analytics/HostAnalyticsStatCard";
import {
  formatAnalyticsDate,
  formatAnalyticsDaysLeft,
  formatAnalyticsViews,
} from "@/components/web/host/analytics/hostAnalyticsFormat";
import { HostStatusPill } from "@/components/web/host/HostStatusPill";
import {
  hostListingStatus,
  type HostListingStatusTone,
} from "@/components/web/host/hostListingStatus";
import { ListingResultCard } from "@/components/web/ListingResultCard";
import { appleTabScrollInset } from "@/components/ui/Glass";
import { HOST_ANALYTICS_PATH } from "@/constants/hostRoutes";
import { WEB_CONTENT_PAD_X } from "@/constants/webLayout";
import { Skoun } from "@/constants/theme";
import type { HostAnalyticsListing } from "@/features/listings/hostAnalytics";
import { useListing } from "@/features/listings/useListing";
import { useListingAnalytics } from "@/features/listings/useListingAnalytics";
import { useMyListings } from "@/features/listings/useMyListings";
import type { Listing } from "@/types/listing";
import { useBreakpoint } from "@/lib/breakpoints";

type Props = {
  listingId: string;
};

function errorStatus(error: unknown): number | null {
  if (!axios.isAxiosError(error)) return null;
  return error.response?.status ?? null;
}

export function HostListingAnalyticsPage({ listingId }: Props) {
  const router = useRouter();
  const bp = useBreakpoint();
  const compact = bp === "mobile" || Platform.OS !== "web";
  const { data, isPending, isError, error, refetch, isFetching, fetchStatus } =
    useListingAnalytics(listingId);
  const mine = useMyListings(Boolean(listingId));
  const publicListing = useListing(listingId);
  const cardListing =
    mine.data?.find((row) => row.id === listingId) ??
    publicListing.data ??
    null;
  const cardPending =
    !cardListing && (mine.isLoading || publicListing.isLoading);

  const status = data ? hostListingStatus(data) : null;
  const title = data?.title?.trim() || data?.area || "Listing analytics";
  const statusCode = errorStatus(error);
  const isLoading = isPending && fetchStatus !== "idle";
  const daysLeft = data?.daysLeft ?? null;
  const isLive = data?.status === "active";
  const endingSoon =
    isLive && daysLeft != null && daysLeft >= 0 && daysLeft <= 7;
  const showDaysCard = Boolean(isLive && daysLeft != null);
  const canViewPublic =
    data != null && data.status !== "archived" && data.status !== "removed";

  function goOverview() {
    router.push(HOST_ANALYTICS_PATH as never);
  }

  function openPublicListing() {
    router.push(`/(renter)/listing/${listingId}` as never);
  }

  const viewCta =
    canViewPublic ? (
      <Pressable
        onPress={openPublicListing}
        accessibilityRole="link"
        accessibilityLabel="View listing"
        style={({ pressed }) => [
          styles.viewBtn,
          pressed && styles.viewBtnPressed,
        ]}
      >
        <Text style={styles.viewBtnText}>View listing</Text>
      </Pressable>
    ) : null;

  const inlineError = isError && data ? (
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
  ) : null;

  let body: ReactNode;
  if (!listingId) {
    body = (
      <View style={styles.empty} accessibilityRole="alert">
        <Text style={styles.emptyTitle}>Listing not found</Text>
        <Text style={styles.emptyBody}>
          Go back to analytics to see listings you host.
        </Text>
        <Pressable
          onPress={goOverview}
          style={styles.retryBtn}
          accessibilityRole="button"
          accessibilityLabel="Back to analytics"
        >
          <Text style={styles.retryText}>Back to analytics</Text>
        </Pressable>
      </View>
    );
  } else if (!data && !isError && (isFetching || isPending)) {
    body = (
      <ActivityIndicator color={Skoun.color.primary} style={styles.loader} />
    );
  } else if (!data) {
    const is404 = statusCode === 404;
    const is403 = statusCode === 403;
    body = (
      <View style={styles.empty} accessibilityRole="alert">
        <Text style={styles.emptyTitle}>
          {is404
            ? "Listing not found"
            : is403
              ? "You don’t own this listing"
              : "Couldn’t load analytics"}
        </Text>
        <Text style={styles.emptyBody}>
          {is404 || is403
            ? "Go back to analytics to see listings you host."
            : "Check that the API is reachable, then try again."}
        </Text>
        {is404 || is403 ? (
          <Pressable
            onPress={goOverview}
            style={styles.retryBtn}
            accessibilityRole="button"
            accessibilityLabel="Back to analytics"
          >
            <Text style={styles.retryText}>Back to analytics</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => void refetch()}
            style={styles.retryBtn}
            accessibilityRole="button"
            accessibilityLabel="Retry loading analytics"
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        )}
      </View>
    );
  } else if (data && status) {
    const identity = (
      <IdentityColumn
        listing={data}
        cardListing={cardListing}
        cardPending={cardPending}
        compact={compact}
      />
    );
    const numbers = (
      <NumbersColumn
        listing={data}
        compact={compact}
        showDaysCard={showDaysCard}
        endingSoon={endingSoon}
        daysLeft={daysLeft}
        statusLabel={status.label}
        statusTone={status.tone}
        viewCta={viewCta}
      />
    );

    body = (
      <View
        style={[
          styles.layout,
          compact && Platform.OS !== "web" ? styles.layoutCompact : null,
        ]}
      >
        <View style={styles.identitySlot}>{identity}</View>
        <View style={styles.numbersSlot}>
          {numbers}
          {inlineError}
        </View>
      </View>
    );
  } else {
    body = null;
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
        <View style={styles.backRow}>
          <Link href={HOST_ANALYTICS_PATH as never} asChild>
            <Pressable
              onPress={goOverview}
              accessibilityRole="link"
              accessibilityLabel="Back to analytics"
              style={({ pressed }) => [
                styles.backLink,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.backLinkText}>Analytics</Text>
            </Pressable>
          </Link>
        </View>

        {!data ? (
          <View style={styles.fallbackHeader}>
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            <Text style={styles.trust}>
              Views count when someone opens the listing. Search appearances
              aren’t counted yet.
            </Text>
          </View>
        ) : null}

        {body}

        {isFetching && !isLoading ? (
          <Text style={styles.refreshHint}>Refreshing…</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

function IdentityColumn({
  listing,
  cardListing,
  cardPending,
  compact,
}: {
  listing: HostAnalyticsListing;
  cardListing: Listing | null;
  cardPending: boolean;
  compact: boolean;
}) {
  return (
    <View style={[styles.identity, compact && styles.identityCompact]}>
      <View
        style={styles.cardScale}
        accessibilityRole="header"
        accessibilityLabel={listing.title?.trim() || listing.area}
      >
        {cardListing ? (
          <ListingResultCard listing={cardListing} variant="grid" />
        ) : (
          <View
            style={styles.cardSkeleton}
            accessibilityLabel={
              cardPending ? "Loading listing card" : "Listing card unavailable"
            }
          >
            {cardPending ? (
              <ActivityIndicator
                color={Skoun.color.primary}
                style={styles.cardSkeletonSpinner}
              />
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

function NumbersColumn({
  listing,
  compact,
  showDaysCard,
  endingSoon,
  daysLeft,
  statusLabel,
  statusTone,
  viewCta,
}: {
  listing: HostAnalyticsListing;
  compact: boolean;
  showDaysCard: boolean;
  endingSoon: boolean;
  daysLeft: number | null;
  statusLabel: string;
  statusTone: HostListingStatusTone;
  viewCta: ReactNode;
}) {
  return (
    <View style={[styles.numbers, compact && styles.numbersCompact]}>
      <View style={[styles.stats, compact && styles.statsCompact]}>
        <View style={[styles.statSlot, compact && styles.statSlotCompact]}>
          <HostAnalyticsStatCard
            label="Views"
            value={formatAnalyticsViews(listing.viewCount)}
            dense={compact || !showDaysCard}
            fill
            glass
          />
        </View>
        {showDaysCard ? (
          <View style={[styles.statSlot, compact && styles.statSlotCompact]}>
            <HostAnalyticsStatCard
              label={endingSoon ? "Expires soon" : "Days left"}
              value={formatAnalyticsDaysLeft(daysLeft)}
              tone={endingSoon ? "warning" : "default"}
              dense={compact}
              fill
              glass
            />
          </View>
        ) : null}
      </View>
      <Text style={styles.comingLine}>Daily views breakdown coming later.</Text>
      <HostAnalyticsGlassPane
        style={[styles.metaCard, compact && styles.metaCardCompact]}
        contentStyle={[styles.metaCardInner, compact && styles.metaCardInnerCompact]}
      >
        <View style={[styles.metaPrimary, compact && styles.metaPrimaryCompact]}>
          <View style={styles.metaExpires}>
            <Text style={styles.metaLabel}>Expires</Text>
            <Text style={styles.metaExpiresValue}>
              {formatAnalyticsDate(listing.expiresAt)}
            </Text>
          </View>
          <View style={styles.metaPublished}>
            <Text style={styles.metaLabel}>Published</Text>
            <Text
              style={[
                styles.metaPublishedValue,
                !listing.publishedAt && styles.metaMutedValue,
              ]}
            >
              {listing.publishedAt
                ? formatAnalyticsDate(listing.publishedAt)
                : "Not published"}
            </Text>
          </View>
        </View>
        <Text style={styles.metaCreated}>
          Created {formatAnalyticsDate(listing.createdAt)}
        </Text>
      </HostAnalyticsGlassPane>
      <View style={styles.hostActions}>
        <View style={styles.statusRow}>
          <HostStatusPill label={statusLabel} tone={statusTone} />
          <Text style={styles.daysLeft}>
            {formatAnalyticsDaysLeft(listing.daysLeft)}
          </Text>
        </View>
        <Text style={styles.trust}>
          Views count when someone opens the listing. Search appearances aren’t
          counted yet.
        </Text>
        {viewCta}
      </View>
    </View>
  );
}

const web = Platform.OS === "web";

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingBottom: 48,
  },
  scrollCompact: {
    paddingBottom: appleTabScrollInset + 20,
  },
  page: {
    width: "100%",
    paddingHorizontal: WEB_CONTENT_PAD_X,
    paddingTop: 24,
    gap: 8,
    ...(web ? { boxSizing: "border-box" as const } : null),
  },
  pageCompact: {
    maxWidth: "100%",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  backRow: {
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  backLink: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    ...(web ? { cursor: "pointer" as const } : null),
  },
  backLinkText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 15,
    color: Skoun.color.ink,
    textDecorationLine: "underline",
  },
  pressed: {
    opacity: 0.85,
  },
  fallbackHeader: {
    marginBottom: 16,
    gap: 6,
    maxWidth: 560,
  },
  layout: {
    width: "100%",
    ...(web
      ? ({
          display: "grid",
          gridTemplateColumns: "minmax(260px, 0.9fr) minmax(300px, 1.2fr)",
          gridTemplateAreas: '"identity numbers"',
          columnGap: 28,
          rowGap: 12,
          alignItems: "start",
          "@media (max-width: 767px)": {
            display: "flex",
            flexDirection: "column",
            gap: 14,
          },
        } as Record<string, unknown>)
      : {
          flexDirection: "column",
          gap: 14,
        }),
  },
  layoutCompact: {
    flexDirection: "column",
    gap: 14,
  },
  identitySlot: {
    minWidth: 0,
    ...(web ? ({ gridArea: "identity" } as Record<string, unknown>) : null),
  },
  numbersSlot: {
    minWidth: 0,
    ...(web ? ({ gridArea: "numbers" } as Record<string, unknown>) : null),
  },
  identity: {
    gap: 10,
  },
  identityCompact: {
    gap: 8,
  },
  cardScale: {
    width: "100%",
    minWidth: 0,
  },
  cardSkeleton: {
    width: "100%",
    aspectRatio: 16 / 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#E2E8F0",
    minHeight: 143,
    justifyContent: "center",
    alignItems: "center",
  },
  cardSkeletonSpinner: {
    marginTop: 48,
  },
  title: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 24,
    color: Skoun.color.ink,
    letterSpacing: -0.4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  daysLeft: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    lineHeight: 18,
    color: Skoun.color.inkMuted,
  },
  trust: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    lineHeight: 18,
    color: Skoun.color.inkMuted,
  },
  numbers: {
    gap: 10,
    width: "100%",
  },
  numbersCompact: {
    gap: 8,
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    ...(web
      ? ({
          "@media (max-width: 767px)": {
            flexDirection: "column",
            gap: 8,
          },
        } as Record<string, unknown>)
      : null),
  },
  statsCompact: {
    flexDirection: "column",
    gap: 8,
  },
  statSlot: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 160,
  },
  statSlotCompact: {
    flexGrow: 0,
    flexBasis: "auto",
    minWidth: 0,
    width: "100%",
  },
  comingLine: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    lineHeight: 18,
    color: Skoun.color.inkMuted,
  },
  metaCard: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 0,
    ...(web ? { boxSizing: "border-box" as const } : null),
  },
  metaCardCompact: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  metaCardInner: {
    gap: 12,
  },
  metaCardInnerCompact: {
    gap: 12,
  },
  metaPrimary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    alignItems: "flex-start",
  },
  metaPrimaryCompact: {
    flexDirection: "column",
    gap: 12,
  },
  metaExpires: {
    flexGrow: 1.4,
    flexBasis: 160,
    minWidth: 140,
    gap: 4,
  },
  metaPublished: {
    flexGrow: 1,
    flexBasis: 130,
    minWidth: 130,
    gap: 4,
  },
  metaLabel: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 11,
    color: "#8B95A1",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  metaExpiresValue: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: Skoun.color.ink,
  },
  metaPublishedValue: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 15,
    lineHeight: 20,
    color: Skoun.color.ink,
  },
  metaMutedValue: {
    fontFamily: Skoun.type.body,
    color: Skoun.color.inkMuted,
  },
  metaCreated: {
    fontFamily: Skoun.type.body,
    fontSize: 13,
    lineHeight: 18,
    color: Skoun.color.inkMuted,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  hostActions: {
    gap: 10,
    marginTop: 4,
  },
  viewBtn: {
    alignSelf: "flex-start",
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    backgroundColor: Skoun.color.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    ...(web
      ? {
          cursor: "pointer" as const,
          transitionProperty: "border-color, background-color",
          transitionDuration: "160ms",
        }
      : null),
  },
  viewBtnPressed: {
    borderColor: Skoun.color.primarySoft,
    backgroundColor: Skoun.color.surfaceMuted,
  },
  viewBtnText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 14,
    color: Skoun.color.ink,
  },
  loader: {
    marginTop: 48,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  inlineError: {
    alignItems: "center",
    paddingTop: 12,
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
    ...(web ? { cursor: "pointer" as const } : null),
  },
  retryText: {
    fontFamily: Skoun.type.bodySemi,
    fontSize: 15,
    color: "#FFFFFF",
  },
  refreshHint: {
    marginTop: 12,
    textAlign: "center",
    fontFamily: Skoun.type.body,
    fontSize: 13,
    color: Skoun.color.inkMuted,
  },
});

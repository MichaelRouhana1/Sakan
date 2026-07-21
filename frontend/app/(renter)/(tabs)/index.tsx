import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Enter } from "@/components/lister/Enter";
import { EmptyState } from "@/components/lister/EmptyState";
import { LButton } from "@/components/lister/Button";
import { ListerScreen } from "@/components/lister/Screen";
import { LText } from "@/components/lister/Typography";
import {
  BrowseFiltersPanel,
  browseFilterBadgeCount,
  EMPTY_BROWSE_FILTERS,
  type BrowseFiltersValue,
} from "@/components/listings/BrowseFiltersPanel";
import {
  BrowseViewToggle,
  type BrowseViewMode,
} from "@/components/listings/BrowseViewToggle";
import { ListingBrowseMap } from "@/components/listings/ListingBrowseMap";
import { ListingCard } from "@/components/listings/ListingCard";
import {
  ListingSortControl,
  type ListingSort,
} from "@/components/listings/ListingSortControl";
import {
  SearchModeToggle,
  type SearchMode,
} from "@/components/listings/SearchModeToggle";
import { SEGMENTED_PILL_SLIDE_MS } from "@/components/listings/SegmentedPillTrack";
import { appleTabScrollInset } from "@/components/ui/Glass";
import { Skoun } from "@/constants/theme";
import type { ListingListFilters } from "@/features/listings/keys";
import { useListings } from "@/features/listings/useListings";
import { useUniversities } from "@/features/universities/useUniversities";
import { useReducedMotion } from "@/lib/useReducedMotion";

const BADGE_POP_MS = SEGMENTED_PILL_SLIDE_MS;
const BADGE_EASE = Easing.out(Easing.cubic);

function toListFilters(
  mode: SearchMode,
  browse: BrowseFiltersValue,
  sort: ListingSort,
): ListingListFilters {
  const property: ListingListFilters = {
    electricity:
      browse.electricity.length > 0 ? browse.electricity : undefined,
    water: browse.water.length > 0 ? browse.water : undefined,
    listingTypes:
      browse.listingTypes.length > 0 ? browse.listingTypes : undefined,
    wifiIncluded: browse.wifiIncluded ? true : undefined,
    minRentUsd: browse.minRentUsd ?? undefined,
    maxRentUsd: browse.maxRentUsd ?? undefined,
    studentsOnly: browse.studentsOnly ? true : undefined,
    genderRestrictions:
      browse.genderRestrictions.length > 0
        ? browse.genderRestrictions
        : undefined,
  };
  const areas = browse.areas.length > 0 ? browse.areas : undefined;

  if (mode === "standard") {
    return { areas, sort, ...property };
  }
  if (browse.universitySlugs.length > 0) {
    return {
      universitySlugs: browse.universitySlugs,
      areas,
      ...property,
    };
  }
  return { areas, sort, ...property };
}

export default function RenterHomeScreen() {
  const [mode, setMode] = useState<SearchMode>("standard");
  const [browseFilters, setBrowseFilters] =
    useState<BrowseFiltersValue>(EMPTY_BROWSE_FILTERS);
  const [sort, setSort] = useState<ListingSort>("newest");
  /** Pill selection — updates immediately for native slide. */
  const [viewMode, setViewMode] = useState<BrowseViewMode>("list");
  /** Heavy list/map body — deferred so map mount can’t jank the pill. */
  const [bodyMode, setBodyMode] = useState<BrowseViewMode>("list");
  const [mapMounted, setMapMounted] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const filterCollapse = useRef(new Animated.Value(0)).current;
  const bodyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const areas = browseFilters.areas;
  const universitySlugs = browseFilters.universitySlugs;

  const selectViewMode = (next: BrowseViewMode) => {
    setViewMode(next);
    if (next !== "map") setMapExpanded(false);

    if (bodyTimer.current) {
      clearTimeout(bodyTimer.current);
      bodyTimer.current = null;
    }

    const applyBody = () => {
      bodyTimer.current = null;
      setBodyMode(next);
      if (next === "map") setMapMounted(true);
    };

    if (reduceMotion) {
      applyBody();
      return;
    }

    // Defer map/list swap until the native pill slide finishes (same duration).
    bodyTimer.current = setTimeout(applyBody, SEGMENTED_PILL_SLIDE_MS);
  };

  useEffect(() => {
    return () => {
      if (bodyTimer.current) clearTimeout(bodyTimer.current);
    };
  }, []);

  const filters = useMemo(
    () => toListFilters(mode, browseFilters, sort),
    [mode, browseFilters, sort],
  );

  const listingsQuery = useListings(filters);
  const universities = useUniversities();
  const hubDistanceMode =
    mode === "university" && universitySlugs.length > 0;

  const listingRows = listingsQuery.data?.listings ?? [];
  const campuses = listingsQuery.data?.campuses ?? [];

  const badgeCount = browseFilterBadgeCount(browseFilters, mode);
  const badgeOpen = badgeCount > 0;
  const lastBadgeRef = useRef(Math.max(badgeCount, 1));
  if (badgeCount > 0) lastBadgeRef.current = badgeCount;

  const badgePop = useRef(new Animated.Value(badgeOpen ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(badgePop, {
      toValue: badgeOpen ? 1 : 0,
      duration: reduceMotion ? 0 : BADGE_POP_MS,
      easing: BADGE_EASE,
      useNativeDriver: true,
    }).start();
  }, [badgeOpen, badgePop, reduceMotion]);

  useEffect(() => {
    if (viewMode !== "map") setMapExpanded(false);
  }, [viewMode]);

  useEffect(() => {
    Animated.timing(filterCollapse, {
      toValue: mapExpanded ? 1 : 0,
      duration: reduceMotion ? 0 : 300,
      useNativeDriver: false,
    }).start();
  }, [mapExpanded, reduceMotion, filterCollapse]);

  const filtersButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        badgeOpen
          ? `Filters, ${badgeCount} active`
          : "Open filters"
      }
      onPress={() => setFiltersOpen(true)}
      style={({ pressed }) => [
        styles.filtersBtn,
        pressed && styles.filtersBtnPressed,
      ]}
    >
      <Ionicons
        name="options-outline"
        size={20}
        color={Skoun.color.primary}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.badge,
          {
            opacity: badgePop,
            transform: [
              {
                scale: badgePop.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.7, 1],
                }),
              },
            ],
          },
        ]}
      >
        <LText variant="caption" style={styles.badgeText}>
          {lastBadgeRef.current > 9
            ? "9+"
            : String(lastBadgeRef.current)}
        </LText>
      </Animated.View>
    </Pressable>
  );

  const feedMetaCollapseStyle = {
    maxHeight: filterCollapse.interpolate({
      inputRange: [0, 1],
      outputRange: [220, 0],
    }),
    opacity: filterCollapse.interpolate({
      inputRange: [0, 0.45, 1],
      outputRange: [1, 0, 0],
    }),
    transform: [
      {
        translateY: filterCollapse.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -8],
        }),
      },
    ],
    overflow: "hidden" as const,
  };

  return (
    <ListerScreen>
      <BrowseFiltersPanel
        visible={filtersOpen}
        mode={mode}
        applied={browseFilters}
        universities={universities.data ?? []}
        universitiesLoading={universities.isLoading}
        onClose={() => setFiltersOpen(false)}
        onApply={(next) => {
          setBrowseFilters(next);
          setFiltersOpen(false);
        }}
      />

      <View style={styles.body}>
        {/* Chrome stays mounted across list/map — not inside FlatList header. */}
        <View style={styles.chromePad}>
          <Enter>
            <View style={styles.header}>
              <LText variant="label" tone="brass">
                Find a place
              </LText>
              <LText variant="display">Skoun</LText>
              <LText variant="body" tone="muted">
                USD rentals with real Lebanese utilities.
              </LText>
            </View>

            <View style={styles.chromeRow}>
              <View style={styles.modeWrap}>
                <SearchModeToggle
                  mode={mode}
                  onChange={(next) => {
                    setMode(next);
                  }}
                />
              </View>
              {filtersButton}
            </View>

            <LText variant="caption" tone="muted" style={styles.hint}>
              {mode === "standard"
                ? "Open Filters to pick cities, then sort by newest or lowest rent."
                : hubDistanceMode
                  ? "Sorted by nearest gate. Open Filters to change campus or cities."
                  : "All cities shown. Open Filters to pick a campus and order by distance."}
            </LText>
          </Enter>

          <Animated.View
            style={bodyMode === "map" ? feedMetaCollapseStyle : undefined}
            pointerEvents={
              bodyMode === "map" && mapExpanded ? "none" : "auto"
            }
          >
            <View style={styles.feedHead}>
              <View style={styles.feedTitleRow}>
                <LText variant="subtitle" style={styles.feedTitle}>
                  {hubDistanceMode
                    ? "Nearest first"
                    : areas.length === 1
                      ? `In ${areas[0]}`
                      : areas.length > 1
                        ? `In ${areas.length} cities`
                        : sort === "price_asc"
                          ? "Lowest rent first"
                          : "Newest listings"}
                </LText>
                <View style={styles.feedTitleToggle}>
                  <BrowseViewToggle
                    value={viewMode}
                    onChange={selectViewMode}
                  />
                </View>
              </View>
              {mode === "standard" ||
              (mode === "university" && universitySlugs.length === 0) ? (
                <ListingSortControl value={sort} onChange={setSort} />
              ) : null}
            </View>
          </Animated.View>
        </View>

        <View
          style={[styles.list, bodyMode !== "list" && styles.paneHidden]}
          pointerEvents={bodyMode === "list" ? "auto" : "none"}
        >
          <FlatList
            style={styles.listFlex}
            data={listingRows}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={
                  listingsQuery.isFetching && !listingsQuery.isLoading
                }
                onRefresh={() => void listingsQuery.refetch()}
                tintColor={Skoun.color.primary}
                colors={[Skoun.color.primary]}
              />
            }
            renderItem={({ item, index }) => (
              <View style={styles.cardWrap}>
                <ListingCard
                  listing={item}
                  index={index}
                  showDistance={hubDistanceMode}
                  onPress={() =>
                    router.push({
                      pathname: "/(renter)/listing/[id]",
                      params: { id: item.id },
                    })
                  }
                />
              </View>
            )}
            ListEmptyComponent={
              listingsQuery.isLoading ? (
                <ActivityIndicator
                  color={Skoun.color.primary}
                  style={{ marginTop: 40 }}
                />
              ) : listingsQuery.isError ? (
                <View style={styles.errorBox}>
                  <LText variant="subtitle">Couldn’t load listings</LText>
                  <LText
                    variant="body"
                    tone="muted"
                    style={styles.errorBody}
                  >
                    Check your connection and try again.
                  </LText>
                  <LButton
                    label="Retry"
                    variant="secondary"
                    onPress={() => void listingsQuery.refetch()}
                  />
                </View>
              ) : (
                <EmptyState
                  title="No listings here yet"
                  body={
                    mode === "university"
                      ? "Nothing near this campus right now. Try another university, clear city filters, or switch to Cities."
                      : areas.length === 1
                        ? `Nothing in ${areas[0]} yet. Try All cities or another area.`
                        : areas.length > 1
                          ? "Nothing in these cities yet. Try fewer areas or All cities."
                          : "Landlords haven’t published anything yet. Check back soon."
                  }
                  icon="home-outline"
                />
              )
            }
            ListFooterComponent={<View style={{ height: 28 }} />}
          />
        </View>

        {mapMounted ? (
          <ScrollView
            style={[styles.mapPane, bodyMode !== "map" && styles.paneHidden]}
            contentContainerStyle={[
              styles.mapScrollContent,
              mapExpanded && styles.mapScrollContentExpanded,
            ]}
            scrollEnabled={!mapExpanded}
            pointerEvents={bodyMode === "map" ? "auto" : "none"}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            <ListingBrowseMap
              listings={listingRows}
              campuses={campuses}
              universityMode={hubDistanceMode}
              loading={listingsQuery.isLoading}
              expanded={mapExpanded}
              onExpandedChange={setMapExpanded}
            />
          </ScrollView>
        ) : null}
      </View>
    </ListerScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  chromePad: {
    paddingHorizontal: Skoun.space.lg,
  },
  list: {
    flex: 1,
  },
  listFlex: {
    flex: 1,
  },
  paneHidden: {
    display: "none",
  },
  listContent: {
    paddingHorizontal: Skoun.space.lg,
    paddingBottom: appleTabScrollInset,
    flexGrow: 1,
  },
  mapPane: {
    flex: 1,
  },
  mapScrollContent: {
    paddingHorizontal: Skoun.space.lg,
    paddingBottom: appleTabScrollInset,
    flexGrow: 1,
  },
  mapScrollContentExpanded: {
    flexGrow: 1,
  },
  header: {
    paddingTop: Skoun.space.sm,
    paddingBottom: Skoun.space.md,
    gap: 4,
  },
  chromeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modeWrap: {
    flex: 1,
    minWidth: 0,
  },
  filtersBtn: {
    width: 48,
    height: 48,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Skoun.radius.md,
    backgroundColor: Skoun.color.surface,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  filtersBtnPressed: {
    opacity: 0.85,
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: Skoun.radius.pill,
    backgroundColor: Skoun.color.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Skoun.color.bg,
  },
  badgeText: {
    color: Skoun.color.surface,
    fontSize: 11,
    fontFamily: Skoun.type.bodySemi,
    lineHeight: 14,
  },
  hint: { marginTop: 10, marginBottom: 4 },
  feedHead: {
    marginTop: 12,
    marginBottom: 12,
    gap: 10,
  },
  feedTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  feedTitle: { marginBottom: 0, flex: 1 },
  feedTitleToggle: { flexShrink: 0 },
  cardWrap: { marginBottom: Skoun.space.md },
  errorBox: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 32,
  },
  errorBody: { textAlign: "center", marginBottom: 4 },
});

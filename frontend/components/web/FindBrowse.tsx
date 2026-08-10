import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { LText } from "@/components/lister/Typography";
import {
  BrowseFiltersPanel,
  browseFilterBadgeCount,
  EMPTY_BROWSE_FILTERS,
  type BrowseFiltersValue,
} from "@/components/listings/BrowseFiltersPanel";
import type { ListingSort } from "@/components/listings/ListingSortControl";
import type { SearchMode } from "@/components/listings/SearchModeToggle";
import { FindBrowseSeo } from "@/components/web/FindBrowseSeo";
import { FindBrowseSidebar } from "@/components/web/FindBrowseSidebar";
import {
  FindFilterBar,
  type BrowseSortKey,
} from "@/components/web/FindFilterBar";
import {
  FindFiltersDialog,
  type FilterSection,
} from "@/components/web/FindFiltersDialog";
import { FindMapPane } from "@/components/web/FindMapPane";
import { FindResultsGrid } from "@/components/web/FindResultsGrid";
import { useWebShellChrome } from "@/components/web/WebShellChrome";
import { LEBANON_AREAS, MAX_UNIVERSITY_SLUGS } from "@/constants/areas";
import { Skoun } from "@/constants/theme";
import { WEB_CONTENT_MAX, WEB_CONTENT_PAD_X } from "@/constants/webLayout";
import { useListings } from "@/features/listings/useListings";
import { useUniversities } from "@/features/universities/useUniversities";
import { toListFilters } from "@/lib/browseFilters";
import { useStableBreakpoint } from "@/lib/breakpoints";
import type { Listing } from "@/types/listing";

type ResultsLayout = "grid" | "list";
type ChipSheet = "areas" | "universities" | "sort" | null;

function apiSortFromBrowse(sort: BrowseSortKey): ListingSort {
  return sort === "rent_asc" ? "price_asc" : "newest";
}

function sortListingsClient(
  listings: Listing[],
  sort: BrowseSortKey,
): Listing[] {
  if (sort === "rent_desc") {
    return [...listings].sort(
      (a, b) => b.monthlyRentUsd - a.monthlyRentUsd,
    );
  }
  if (sort === "distance") {
    return [...listings].sort((a, b) => {
      const da = a.distanceMeters ?? Number.POSITIVE_INFINITY;
      const db = b.distanceMeters ?? Number.POSITIVE_INFINITY;
      return da - db;
    });
  }
  return listings;
}

function cityLabelFromFilters(filters: BrowseFiltersValue): string {
  if (filters.areas.length === 1) return filters.areas[0]!;
  if (filters.areas.length > 1) return "Lebanon";
  return "Beirut";
}

const SORT_OPTIONS: { value: BrowseSortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "rent_asc", label: "Price: low to high" },
  { value: "rent_desc", label: "Price: high to low" },
  { value: "distance", label: "Nearest campus" },
];

export function FindBrowse() {
  const bp = useStableBreakpoint();
  const isDesktop = bp === "desktop";
  const { setFullBleed, setHideFooter, setLockScroll } = useWebShellChrome();

  const [mode, setMode] = useState<SearchMode>("standard");
  const [filters, setFilters] =
    useState<BrowseFiltersValue>(EMPTY_BROWSE_FILTERS);
  const [browseSort, setBrowseSort] = useState<BrowseSortKey>("newest");
  const [resultsLayout, setResultsLayout] = useState<ResultsLayout>("grid");
  const [mapOpen, setMapOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterSection, setFilterSection] = useState<FilterSection>("area");
  const [chipSheet, setChipSheet] = useState<ChipSheet>(null);

  const deferredFilters = useDeferredValue(filters);
  const deferredMode = useDeferredValue(mode);
  const deferredSort = useDeferredValue(browseSort);

  const effectiveMode: SearchMode =
    deferredMode === "university" ||
    deferredFilters.universitySlugs.length > 0
      ? "university"
      : "standard";

  const listFilters = useMemo(
    () =>
      toListFilters(
        effectiveMode,
        deferredFilters,
        apiSortFromBrowse(deferredSort),
      ),
    [effectiveMode, deferredFilters, deferredSort],
  );

  const universities = useUniversities();
  const { data, isLoading, isError, refetch, isFetching } =
    useListings(listFilters);

  const rawListings = data?.listings ?? [];
  const campuses = data?.campuses ?? [];
  const listings = useMemo(
    () => sortListingsClient(rawListings, deferredSort),
    [rawListings, deferredSort],
  );

  const badgeMode: SearchMode =
    mode === "university" || filters.universitySlugs.length > 0
      ? "university"
      : "standard";
  const filterCount = browseFilterBadgeCount(filters, badgeMode);
  const hasActiveFilters =
    filterCount > 0 || browseSort !== "newest" || mode === "university";
  const cityLabel = cityLabelFromFilters(filters);
  const isMap = mapOpen;
  /** Map rail always uses grid card chrome; list/grid choice is restored on close. */
  const cardVariant: ResultsLayout = isMap ? "grid" : resultsLayout;

  useEffect(() => {
    // Browse owns horizontal padding so the filter bar can stick full-width.
    setFullBleed(true);
    setHideFooter(isMap);
    setLockScroll(isMap);
    return () => {
      setFullBleed(false);
      setHideFooter(false);
      setLockScroll(false);
    };
  }, [isMap, setFullBleed, setHideFooter, setLockScroll]);

  const openFilters = (section: FilterSection = "area") => {
    setFilterSection(section);
    setFiltersOpen(true);
  };
  const clearAll = () => {
    setFilters(EMPTY_BROWSE_FILTERS);
    setBrowseSort("newest");
    setMode("standard");
  };

  const toggleArea = (area: string) => {
    setFilters((prev) => {
      const next = prev.areas.includes(area)
        ? prev.areas.filter((a) => a !== area)
        : [...prev.areas, area];
      return { ...prev, areas: next };
    });
  };

  const selectUniversity = (slug: string) => {
    setFilters((prev) => {
      const next =
        prev.universitySlugs.includes(slug)
          ? []
          : [slug].slice(0, MAX_UNIVERSITY_SLUGS);
      return { ...prev, universitySlugs: next };
    });
    setMode("university");
  };

  const heading = (
    <View style={[styles.headingBlock, isMap && styles.headingBlockMap]}>
      {!isMap ? (
        <View style={styles.crumbs}>
          <Link href="/" asChild>
            <Pressable accessibilityRole="link">
              <LText variant="caption" style={styles.crumbLink}>
                Home
              </LText>
            </Pressable>
          </Link>
          <LText variant="caption" tone="muted">
            {" / "}
          </LText>
          <LText variant="caption" tone="muted">
            Lebanon
          </LText>
          <LText variant="caption" tone="muted">
            {" / "}
          </LText>
          <LText variant="caption" style={styles.crumbCurrent}>
            {cityLabel}
          </LText>
        </View>
      ) : null}

      <View style={styles.headingRow}>
        <View style={styles.headingText}>
          <Text style={[styles.h1, isMap && styles.h1Map]}>
            Student Accommodations in{" "}
            <Text style={styles.h1Em}>{cityLabel}</Text>
            {!isLoading ? (
              <Text style={styles.h1Count}>
                {" "}
                | Showing {listings.length} place
                {listings.length === 1 ? "" : "s"}
              </Text>
            ) : null}
          </Text>
          {(isStale(filters, deferredFilters, mode, deferredMode, browseSort, deferredSort) ||
            isFetching) &&
          !isLoading ? (
            <LText variant="caption" tone="muted">
              Updating…
            </LText>
          ) : null}
        </View>

        {!isMap ? (
          <View style={styles.viewToggle} accessibilityRole="tablist">
            {(
              [
                { value: "list" as const, icon: "list-outline" as const, label: "List" },
                { value: "grid" as const, icon: "grid-outline" as const, label: "Grid" },
              ] as const
            ).map((opt) => {
              const active = resultsLayout === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${opt.label} view`}
                  onPress={() => setResultsLayout(opt.value)}
                  style={[styles.viewBtn, active && styles.viewBtnActive]}
                >
                  <Ionicons
                    name={opt.icon}
                    size={16}
                    color={
                      active ? Skoun.color.primaryDeep : Skoun.color.inkMuted
                    }
                  />
                  <LText
                    variant="caption"
                    style={active ? styles.viewLabelActive : styles.viewLabel}
                  >
                    {opt.label}
                  </LText>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );

  const { width: windowWidth } = useWindowDimensions();
  const isXl = windowWidth >= 1280;

  const results = (
    <FindResultsGrid
      listings={listings}
      loading={isLoading || isFetching}
      error={isError}
      onRetry={() => void refetch()}
      variant={cardVariant}
      columns={
        cardVariant === "list"
          ? 1
          : isMap
            ? 1
            : isDesktop
              ? 3
              : bp === "tablet"
                ? 2
                : 1
      }
    />
  );

  return (
    <View style={[styles.page, isMap && styles.pageMap]}>
      <FindFilterBar
        mode={mode}
        filters={filters}
        sort={browseSort}
        onModeChange={setMode}
        onOpenFilters={() => openFilters("area")}
        onOpenSort={() => setChipSheet("sort")}
        onOpenAreas={() => setChipSheet("areas")}
        onOpenUniversities={() => setChipSheet("universities")}
        onOpenBudget={() => openFilters("budget")}
        onOpenRoomType={() => openFilters("roomType")}
        onOpenUtilities={() => openFilters("utilities")}
        onClearAll={clearAll}
        hasActiveFilters={hasActiveFilters}
      />

      {isMap ? (
        <View style={styles.mapSplit}>
          <View style={[styles.mapListCol, isXl && styles.mapListColXl]}>
            <View style={styles.mapListContent}>
              {heading}
              {results}
            </View>
          </View>
          <FindMapPane
            listings={listings}
            campuses={campuses}
            universityMode={effectiveMode === "university"}
            loading={isLoading}
            visible
            fullHeight
            onClose={() => setMapOpen(false)}
          />
        </View>
      ) : (
        <View style={styles.content}>
          {heading}
          <View style={styles.mainRow}>
            <View style={styles.resultsCol}>{results}</View>
            {isDesktop ? (
              <FindBrowseSidebar onExploreMap={() => setMapOpen(true)} />
            ) : null}
          </View>
          {!isDesktop ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setMapOpen(true)}
              style={({ hovered }) => [
                styles.mobileMapCta,
                hovered && styles.mobileMapCtaHover,
              ]}
            >
              <Ionicons name="map-outline" size={18} color={Skoun.color.primary} />
              <LText variant="subtitle" style={styles.mobileMapLabel}>
                Explore on map
              </LText>
            </Pressable>
          ) : null}
          <FindBrowseSeo
            cityLabel={cityLabel}
            onSelectArea={(area) => {
              setMode("standard");
              setFilters((prev) => ({
                ...prev,
                areas: prev.areas.includes(area) ? prev.areas : [...prev.areas, area],
              }));
            }}
          />
        </View>
      )}

      {isDesktop ? (
        <FindFiltersDialog
          visible={filtersOpen}
          applied={filters}
          universities={universities.data ?? []}
          universitiesLoading={universities.isLoading}
          initialSection={filterSection}
          onClose={() => setFiltersOpen(false)}
          onApply={(next) => {
            setFilters(next);
            if (next.universitySlugs.length > 0) setMode("university");
            setFiltersOpen(false);
          }}
        />
      ) : (
        <BrowseFiltersPanel
          visible={filtersOpen}
          mode={badgeMode}
          applied={filters}
          universities={universities.data ?? []}
          universitiesLoading={universities.isLoading}
          onClose={() => setFiltersOpen(false)}
          onApply={(next) => {
            setFilters(next);
            if (next.universitySlugs.length > 0) setMode("university");
            setFiltersOpen(false);
          }}
        />
      )}

      <Modal
        visible={chipSheet != null}
        transparent
        animationType="fade"
        onRequestClose={() => setChipSheet(null)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable
            style={styles.sheetBackdrop}
            accessibilityLabel="Close"
            onPress={() => setChipSheet(null)}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <LText variant="title">
                {chipSheet === "areas"
                  ? "Area"
                  : chipSheet === "universities"
                    ? "University"
                    : "Sort"}
              </LText>
              <Pressable
                accessibilityRole="button"
                onPress={() => setChipSheet(null)}
              >
                <Ionicons name="close" size={22} color={Skoun.color.ink} />
              </Pressable>
            </View>

            {chipSheet === "sort" ? (
              <View style={styles.sheetOptions}>
                {SORT_OPTIONS.map((opt) => {
                  const active = browseSort === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => {
                        setBrowseSort(opt.value);
                        setChipSheet(null);
                      }}
                      style={[
                        styles.sheetOption,
                        active && styles.sheetOptionActive,
                      ]}
                    >
                      <LText
                        variant="subtitle"
                        style={active ? styles.sheetOptionLabelOn : undefined}
                      >
                        {opt.label}
                      </LText>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {chipSheet === "areas" ? (
              <ScrollView style={styles.sheetScroll}>
                <View style={styles.chipWrap}>
                  {LEBANON_AREAS.map((area) => {
                    const active = filters.areas.includes(area);
                    return (
                      <Pressable
                        key={area}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        onPress={() => toggleArea(area)}
                        style={[
                          styles.choiceChip,
                          active && styles.choiceChipActive,
                        ]}
                      >
                        <LText
                          variant="caption"
                          style={
                            active ? styles.choiceChipLabelOn : undefined
                          }
                        >
                          {area}
                        </LText>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            ) : null}

            {chipSheet === "universities" ? (
              <ScrollView style={styles.sheetScroll}>
                {universities.isLoading ? (
                  <ActivityIndicator color={Skoun.color.primary} />
                ) : (
                  <View style={styles.chipWrap}>
                    {(universities.data ?? []).map((uni) => {
                      const active = filters.universitySlugs.includes(
                        uni.slug,
                      );
                      return (
                        <Pressable
                          key={uni.slug}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          onPress={() => selectUniversity(uni.slug)}
                          style={[
                            styles.choiceChip,
                            active && styles.choiceChipActive,
                          ]}
                        >
                          <LText
                            variant="caption"
                            style={
                              active ? styles.choiceChipLabelOn : undefined
                            }
                          >
                            {uni.name}
                          </LText>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </ScrollView>
            ) : null}

            {chipSheet === "areas" || chipSheet === "universities" ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setChipSheet(null)}
                style={styles.sheetDone}
              >
                <LText variant="subtitle" style={styles.sheetDoneLabel}>
                  Done
                </LText>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function isStale(
  filters: BrowseFiltersValue,
  deferredFilters: BrowseFiltersValue,
  mode: SearchMode,
  deferredMode: SearchMode,
  sort: BrowseSortKey,
  deferredSort: BrowseSortKey,
): boolean {
  return (
    filters !== deferredFilters ||
    mode !== deferredMode ||
    sort !== deferredSort
  );
}

const styles = StyleSheet.create({
  page: {
    width: "100%",
    minHeight: "100%" as unknown as number,
    backgroundColor: Skoun.color.bg,
  },
  pageMap: {
    width: "100%",
  },
  content: {
    paddingHorizontal: WEB_CONTENT_PAD_X,
    paddingTop: 20,
    paddingBottom: 48,
    gap: 24,
    maxWidth: WEB_CONTENT_MAX,
    width: "100%",
    alignSelf: "center",
  },
  headingBlock: {
    gap: 10,
  },
  headingBlockMap: {
    paddingBottom: 4,
  },
  crumbs: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  crumbLink: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodyMedium,
  },
  crumbCurrent: {
    color: Skoun.color.ink,
    fontFamily: Skoun.type.bodyMedium,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },
  headingText: {
    flex: 1,
    minWidth: 240,
    gap: 4,
  },
  h1: {
    fontFamily: Skoun.type.display,
    fontSize: 28,
    lineHeight: 34,
    color: Skoun.color.primaryDeep,
    letterSpacing: -0.4,
  },
  h1Map: {
    fontSize: 22,
    lineHeight: 28,
  },
  h1Em: {
    fontFamily: Skoun.type.display,
    color: Skoun.color.primary,
  },
  h1Count: {
    fontSize: 16,
    color: Skoun.color.inkMuted,
    fontFamily: Skoun.type.body,
  },
  viewToggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: Skoun.color.border,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: Skoun.color.surface,
  },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  viewBtnActive: {
    backgroundColor: Skoun.color.primaryMist,
  },
  viewLabel: {
    color: Skoun.color.inkMuted,
  },
  viewLabelActive: {
    color: Skoun.color.primaryDeep,
    fontFamily: Skoun.type.bodyMedium,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 24,
  },
  resultsCol: {
    flex: 1,
    minWidth: 0,
  },
  mobileMapCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
  },
  mobileMapCtaHover: {
    backgroundColor: Skoun.color.primaryMist,
  },
  mobileMapLabel: {
    color: Skoun.color.primaryDeep,
  },
  mapSplit: {
    flex: 1,
    flexDirection: "row",
    minHeight: 0,
    height: "calc(100vh - 128px)" as unknown as number,
    maxHeight: "calc(100vh - 128px)" as unknown as number,
    overflow: "hidden",
    position: "relative",
  },
  mapListCol: {
    width: 380,
    maxWidth: 380,
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 0,
    height: "100%" as unknown as number,
    zIndex: 20,
    position: "relative",
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    overflowY: "auto" as unknown as "scroll",
    overflowX: "hidden",
    padding: 16,
    boxSizing: "border-box",
  },
  mapListColXl: {
    width: 420,
    maxWidth: 420,
  },
  mapListContent: {
    gap: 16,
    paddingBottom: 32,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Skoun.color.overlay,
  },
  sheet: {
    width: "min(440px, 100%)" as unknown as number,
    maxHeight: "80%" as unknown as number,
    backgroundColor: Skoun.color.surface,
    borderRadius: 16,
    padding: 20,
    gap: 14,
    zIndex: 2,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetScroll: {
    maxHeight: 360,
  },
  sheetOptions: {
    gap: 8,
  },
  sheetOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  sheetOptionActive: {
    borderColor: Skoun.color.primary,
    backgroundColor: Skoun.color.primaryMist,
  },
  sheetOptionLabelOn: {
    color: Skoun.color.primaryDeep,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choiceChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
  },
  choiceChipActive: {
    borderColor: Skoun.color.primary,
    backgroundColor: Skoun.color.primaryMist,
  },
  choiceChipLabelOn: {
    color: Skoun.color.primaryDeep,
    fontFamily: Skoun.type.bodyMedium,
  },
  sheetDone: {
    marginTop: 4,
    backgroundColor: Skoun.color.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  sheetDoneLabel: {
    color: "#FFFFFF",
  },
});

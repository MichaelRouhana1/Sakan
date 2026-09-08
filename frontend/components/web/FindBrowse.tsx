import { Ionicons } from "@expo/vector-icons";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Pressable,
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
import {
  HoverCommitCursor,
  type HoverPoint,
} from "@/components/web/HoverCommitCursor";
import { useWebShellChrome } from "@/components/web/WebShellChrome";
import { Skoun } from "@/constants/theme";
import { WEB_CONTENT_MAX, WEB_CONTENT_PAD_X } from "@/constants/webLayout";
import { useListings } from "@/features/listings/useListings";
import {
  campusFilterLabel,
  campusPinsFromInstitution,
  mergeCampusPins,
  resolveFocusCampusSlug,
  useInstitutions,
} from "@/features/universities/useInstitutions";
import { useUniversities } from "@/features/universities/useUniversities";
import { toListFilters } from "@/lib/browseFilters";
import {
  browseSearchSetParams,
  parseCsvParam,
} from "@/lib/browseSearchUrl";
import { campusResultsHeading } from "@/lib/campusProximity";
import { useStableBreakpoint } from "@/lib/breakpoints";
import { useCoarsePointer } from "@/lib/useCoarsePointer";
import type { CampusMeta, Listing } from "@/types/listing";

type ResultsLayout = "grid" | "list";

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
  return "Lebanon";
}

export function FindBrowse() {
  const bp = useStableBreakpoint();
  const isDesktop = bp === "desktop";
  const coarsePointer = useCoarsePointer();
  const { setFullBleed, setHideFooter, setLockScroll } = useWebShellChrome();

  const params = useLocalSearchParams<{
    q?: string;
    campusId?: string;
    areas?: string;
    universitySlugs?: string;
  }>();
  const [mode, setMode] = useState<SearchMode>("university");
  const [filters, setFilters] =
    useState<BrowseFiltersValue>(EMPTY_BROWSE_FILTERS);
  const [focusPoint, setFocusPoint] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [browseSort, setBrowseSort] = useState<BrowseSortKey>("newest");
  const [resultsLayout, setResultsLayout] = useState<ResultsLayout>("grid");
  const [mapOpen, setMapOpen] = useState(false);
  const [mapMounted, setMapMounted] = useState(false);
  const [hoveredListingId, setHoveredListingId] = useState<string | null>(null);
  const [hoverFlyListingId, setHoverFlyListingId] = useState<string | null>(
    null,
  );
  const [hoverCursorSeed, setHoverCursorSeed] = useState<HoverPoint | null>(
    null,
  );
  const [hoverRingDone, setHoverRingDone] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterSection, setFilterSection] =
    useState<FilterSection>("university");

  const deferredFilters = useDeferredValue(filters);
  const deferredMode = useDeferredValue(mode);
  const deferredSort = useDeferredValue(browseSort);
  const effectiveMode: SearchMode =
    mode === "university" ||
    deferredFilters.universitySlugs.length > 0 ||
    Boolean(deferredFilters.campusId) ||
    Boolean(deferredFilters.institutionSlug)
      ? "university"
      : "standard";

  const syncUrl = useCallback(
    (next: {
      q?: string | null;
      campusId?: string | null;
      areas?: string[];
      universitySlugs?: string[];
    }) => {
      router.setParams(browseSearchSetParams(next) as never);
    },
    [],
  );

  const resetSearch = useCallback(() => {
    setFocusPoint(null);
    setFilters((prev) => ({
      ...prev,
      areas: [],
      universitySlugs: [],
      institutionSlug: null,
      campusId: null,
      q: null,
    }));
    setMode("university");
    syncUrl({
      q: null,
      campusId: null,
      areas: [],
      universitySlugs: [],
    });
  }, [syncUrl]);

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
  const institutions = useInstitutions();

  useEffect(() => {
    const campusId =
      typeof params.campusId === "string" ? params.campusId.trim() : "";
    const areas = parseCsvParam(params.areas);
    const slugs = parseCsvParam(params.universitySlugs);
    const q =
      typeof params.q === "string" && params.q.trim()
        ? params.q.trim()
        : "";

    if (!campusId && areas.length === 0 && slugs.length === 0 && !q) {
      setFocusPoint(null);
      setFilters((prev) => ({
        ...prev,
        areas: [],
        universitySlugs: [],
        campusId: null,
        q: null,
        institutionSlug: null,
      }));
      return;
    }

    if (campusId || slugs.length > 0) {
      const slug = slugs[0];
      const campus = slug
        ? universities.data?.find((u) => u.slug === slug)
        : universities.data?.find((u) => u.id === campusId);
      setFilters((prev) => ({
        ...prev,
        campusId: campusId || campus?.id || null,
        universitySlugs: slug ? [slug] : campus ? [campus.slug] : [],
        areas: [],
        q: null,
        institutionSlug: campus?.institutionSlug ?? prev.institutionSlug,
      }));
      if (campus?.lat != null && campus?.lng != null) {
        setFocusPoint({ lat: campus.lat, lng: campus.lng });
      }
      setMode("university");
      setBrowseSort("distance");
      return;
    }
    if (areas.length > 0) {
      setFocusPoint(null);
      setFilters((prev) => ({
        ...prev,
        areas,
        universitySlugs: [],
        campusId: null,
        q: null,
        institutionSlug: null,
      }));
      setMode("standard");
      return;
    }
    if (q) {
      setFocusPoint(null);
      setFilters((prev) => ({
        ...prev,
        q,
        areas: [],
        universitySlugs: [],
        campusId: null,
        institutionSlug: null,
      }));
      setMode("standard");
    }
  }, [
    params.campusId,
    params.areas,
    params.universitySlugs,
    params.q,
    universities.data,
  ]);

  const { data, isLoading, isError, refetch, isFetching } =
    useListings(listFilters);

  useEffect(() => {
    if (mapOpen) setMapMounted(true);
  }, [mapOpen]);

  const rawListings = data?.listings ?? [];
  const selectedInst = useMemo(
    () =>
      (institutions.data ?? []).find(
        (inst) => inst.slug === deferredFilters.institutionSlug,
      ) ?? null,
    [institutions.data, deferredFilters.institutionSlug],
  );
  const campuses = useMemo(
    () =>
      mergeCampusPins(
        data?.campuses ?? [],
        campusPinsFromInstitution(selectedInst),
      ),
    [data?.campuses, selectedInst],
  );
  const listings = useMemo(
    () => sortListingsClient(rawListings, deferredSort),
    [rawListings, deferredSort],
  );

  const switchMapCampus = useCallback(
    (campus: CampusMeta) => {
      const uni = universities.data?.find((u) => u.slug === campus.slug);
      setFilters((prev) => ({
        ...prev,
        universitySlugs: [campus.slug],
        campusId: uni?.id ?? null,
        institutionSlug: uni?.institutionSlug ?? prev.institutionSlug,
        areas: [],
        q: null,
      }));
      setMode("university");
      setBrowseSort("distance");
      syncUrl({
        q: null,
        campusId: uni?.id ?? null,
        areas: [],
        universitySlugs: [campus.slug],
      });
    },
    [syncUrl, universities.data],
  );

  const activeCampus = useMemo(() => {
    const slug = deferredFilters.universitySlugs[0];
    const campusId = deferredFilters.campusId;
    const list = universities.data ?? [];
    return (
      list.find((u) => slug != null && u.slug === slug) ??
      list.find((u) => campusId != null && u.id === campusId) ??
      null
    );
  }, [
    universities.data,
    deferredFilters.universitySlugs,
    deferredFilters.campusId,
  ]);
  const showDistanceSplit =
    effectiveMode === "university" &&
    deferredSort === "distance" &&
    activeCampus != null;
  const universityLabel = activeCampus
    ? campusFilterLabel(activeCampus)
    : "";

  const badgeMode: SearchMode =
    mode === "university" ||
    filters.universitySlugs.length > 0 ||
    Boolean(filters.campusId)
      ? "university"
      : "standard";
  const filterCount = browseFilterBadgeCount(filters, badgeMode);
  const hasActiveFilters = filterCount > 0 || browseSort !== "newest";
  const cityLabel = cityLabelFromFilters(filters);
  const isNationwide = filters.areas.length !== 1;
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

  const openFilters = (section: FilterSection = "university") => {
    setFilterSection(section);
    setFiltersOpen(true);
  };
  const clearAll = () => {
    resetSearch();
    setBrowseSort("newest");
  };

  const applyBrowseFilters = useCallback(
    (next: typeof filters) => {
      setFilters(next);
      const uniSlug = next.universitySlugs[0];
      if (uniSlug || next.campusId) {
        setMode("university");
        setBrowseSort("distance");
        const campus =
          universities.data?.find((u) => u.slug === uniSlug) ??
          universities.data?.find((u) => u.id === next.campusId) ??
          null;
        if (campus?.lat != null && campus?.lng != null) {
          setFocusPoint({ lat: campus.lat, lng: campus.lng });
        }
        syncUrl({
          q: null,
          campusId: next.campusId ?? campus?.id ?? null,
          areas: [],
          universitySlugs: uniSlug
            ? [uniSlug]
            : campus
              ? [campus.slug]
              : [],
        });
      } else {
        syncUrl({
          q: next.q,
          campusId: null,
          areas: next.areas,
          universitySlugs: [],
        });
      }
      setFiltersOpen(false);
    },
    [syncUrl, universities.data],
  );

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
          <LText
            variant="caption"
            style={isNationwide ? styles.crumbCurrent : undefined}
            tone={isNationwide ? undefined : "muted"}
          >
            Lebanon
          </LText>
          {!isNationwide ? (
            <>
              <LText variant="caption" tone="muted">
                {" / "}
              </LText>
              <LText variant="caption" style={styles.crumbCurrent}>
                {cityLabel}
              </LText>
            </>
          ) : null}
        </View>
      ) : null}

      <View style={styles.headingRow}>
        <View style={styles.headingText}>
          <Text style={[styles.h1, isMap && styles.h1Map]}>
            {universityLabel ? (
              <>
                Student Accommodations near{" "}
                <Text style={styles.h1Em}>{universityLabel}</Text>
              </>
            ) : isNationwide ? (
              <>
                Student Accommodations across{" "}
                <Text style={styles.h1Em}>Lebanon</Text>
              </>
            ) : (
              <>
                Student Accommodations in{" "}
                <Text style={styles.h1Em}>{cityLabel}</Text>
              </>
            )}
            {!showDistanceSplit && !isLoading ? (
              <Text style={styles.h1Count}>
                {" "}
                | Showing {listings.length} place
                {listings.length === 1 ? "" : "s"}
              </Text>
            ) : null}
          </Text>
          {showDistanceSplit && universityLabel && !isLoading ? (
            <Text style={styles.h1Sub}>
              {campusResultsHeading({ listings })}
            </Text>
          ) : null}
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

  const onHoverListing = useCallback(
    (id: string | null, point?: HoverPoint) => {
      setHoveredListingId(id);
      setHoverRingDone(false);
      if (!id) setHoverFlyListingId(null);
      if (point) setHoverCursorSeed(point);
    },
    [],
  );

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
      onHoverListing={isMap ? onHoverListing : undefined}
      showDistanceSplit={showDistanceSplit}
      universityLabel={universityLabel}
    />
  );

  return (
    <View style={[styles.page, isMap && styles.pageMap]}>
      <FindFilterBar
        filters={filters}
        sort={browseSort}
        onOpenFilters={() => openFilters("university")}
        onApplyFilters={applyBrowseFilters}
        onChangeSort={setBrowseSort}
        onClearAll={clearAll}
        hasActiveFilters={hasActiveFilters}
      />

      <View style={isMap ? styles.mapSplit : styles.browseBody}>
      {isMap ? (
          <View style={[styles.mapListCol, isXl && styles.mapListColXl]}>
            <View style={styles.mapListContent}>
              {heading}
              {results}
            </View>
          </View>
      ) : (
        <View style={styles.content}>
          {heading}
          <View style={styles.mainRow}>
            <View style={styles.resultsCol}>{results}</View>
            {isDesktop ? (
              <FindBrowseSidebar
                listings={listings}
                onExploreMap={() => setMapOpen(true)}
              />
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
      {mapMounted ? (
        <View
          style={isMap ? styles.mapPaneLive : styles.mapPaneParked}
          pointerEvents={isMap ? "auto" : "none"}
        >
          <FindMapPane
            listings={listings}
            campuses={campuses}
            universityMode={effectiveMode === "university"}
            loading={isLoading}
            visible={isMap}
            fullHeight
            hoveredListingId={hoveredListingId}
            hoverFlyListingId={hoverFlyListingId}
            onHoverFlyComplete={() => setHoverRingDone(true)}
            focusCampusSlug={resolveFocusCampusSlug(
              filters.universitySlugs[0] ?? null,
              (institutions.data ?? []).find(
                (inst) => inst.slug === filters.institutionSlug,
              ) ?? selectedInst,
            )}
            focusPoint={
              effectiveMode === "university" ? null : focusPoint
            }
            onSelectCampus={switchMapCampus}
            onClose={() => {
              setHoveredListingId(null);
              setHoverFlyListingId(null);
              setMapOpen(false);
            }}
          />
        </View>
      ) : null}
      </View>

      {isMap && effectiveMode === "university" && !coarsePointer ? (
        <HoverCommitCursor
          hoverKey={hoverRingDone ? null : hoveredListingId}
          seed={hoverCursorSeed}
          durationMs={1000}
          onCommit={setHoverFlyListingId}
        />
      ) : null}

      {isDesktop ? (
        <FindFiltersDialog
          visible={filtersOpen}
          applied={filters}
          universities={universities.data ?? []}
          universitiesLoading={universities.isLoading}
          initialSection={filterSection}
          onClose={() => setFiltersOpen(false)}
          onApply={applyBrowseFilters}
        />
      ) : (
        <BrowseFiltersPanel
          visible={filtersOpen}
          mode={badgeMode}
          applied={filters}
          universities={universities.data ?? []}
          universitiesLoading={universities.isLoading}
          onClose={() => setFiltersOpen(false)}
          onApply={applyBrowseFilters}
        />
      )}
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
    flexGrow: 1,
    display: "flex" as unknown as "flex",
    flexDirection: "column",
    backgroundColor: "#F9FAFB",
  },
  pageMap: {
    width: "100%",
  },
  browseBody: {
    flexGrow: 1,
    width: "100%",
  },
  mapPaneLive: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    height: "100%" as unknown as number,
  },
  mapPaneParked: {
    position: "absolute",
    width: 0,
    height: 0,
    overflow: "visible",
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
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "auto" as unknown as number,
    minWidth: 240,
    maxWidth: "100%",
    flexDirection: "column",
    alignSelf: "flex-start",
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
  h1Sub: {
    fontSize: 18,
    lineHeight: 26,
    color: Skoun.color.inkMuted,
    fontFamily: Skoun.type.body,
    marginTop: 2,
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
    height: "calc(100vh - 140px)" as unknown as number,
    maxHeight: "calc(100vh - 140px)" as unknown as number,
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
});

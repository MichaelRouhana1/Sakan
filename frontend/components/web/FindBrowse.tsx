import { useBrowseController } from "@/features/matcher/useBrowseController";
import { rankListings, explainWidening } from "@/features/matcher/scoring";
import { MatcherSheet } from "@/components/matcher/MatcherSheet";
import { FindMyPlaceFab } from "@/components/web/FindMyPlaceFab";
import { MatchSummaryBar } from "@/components/matcher/MatchResults";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { LText } from "@/components/lister/Typography";
import { GeneralLoadingBlock } from "@/components/common/GeneralLoadingBlock";
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
import { FindResultsGrid, FindSkeletonBone } from "@/components/web/FindResultsGrid";
import {
  HoverCommitCursor,
  type HoverPoint,
} from "@/components/web/HoverCommitCursor";
import { useWebShellChrome } from "@/components/web/WebShellChrome";
import { Skoun } from "@/constants/theme";
import { WEB_CONTENT_MAX, WEB_CONTENT_PAD_X } from "@/constants/webLayout";
import { useListings } from "@/features/listings/useListings";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import {
  campusFilterLabel,
  campusPinsFromInstitution,
  mergeCampusPins,
  resolveFocusCampusSlug,
  useInstitutions,
} from "@/features/universities/useInstitutions";
import { useUniversities } from "@/features/universities/useUniversities";
import { toListFilters } from "@/lib/browseFilters";
import { campusResultsHeading } from "@/lib/campusProximity";
import { useStableBreakpoint } from "@/lib/breakpoints";
import { useDevSearchLoadingDelay } from "@/lib/useDevSearchLoadingDelay";
import { useCoarsePointer } from "@/lib/useCoarsePointer";
import { useReducedMotion } from "@/lib/useReducedMotion";
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
  const reducedMotion = useReducedMotion();
  const { setFullBleed, setHideFooter, setLockScroll } = useWebShellChrome();
  const { user } = useAuthSession();

  const browse = useBrowseController();
  const { filters, mode, sort: browseSort, setFilters, setMode, setSort: setBrowseSort } = browse;
  const [focusPoint, setFocusPoint] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
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

  const { filters: deferredFilters, mode: deferredMode, sort: deferredSort, prefs: deferredPrefs } = browse.deferred;
  const effectiveMode: SearchMode =
    mode === "university" ||
    deferredFilters.universitySlugs.length > 0 ||
    Boolean(deferredFilters.campusId) ||
    Boolean(deferredFilters.institutionSlug)
      ? "university"
      : "standard";

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
  }, [setFilters, setMode]);

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

  const { data, isLoading, isError, refetch, isFetching } =
    useListings(listFilters);
  const queryLoading = isLoading || isFetching;
  const loading = useDevSearchLoadingDelay(queryLoading);

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
  const ranked = useMemo(() => deferredPrefs ? rankListings(rawListings, deferredPrefs) : { listings: rawListings, matches: {} }, [rawListings, deferredPrefs]);
  const matching = deferredSort === "match" && !!deferredPrefs;
  const listings = useMemo(() => matching ? ranked.listings : sortListingsClient(deferredPrefs ? rawListings.filter(l => !!ranked.matches[l.id]) : rawListings, deferredSort), [ranked, rawListings, matching, deferredSort, deferredPrefs]);
  const listingsForDisplay = loading ? [] : listings;
  const widening = useMemo(() => explainWidening(ranked.listings, deferredPrefs ?? {version:1}), [ranked.listings, deferredPrefs]);
  const openMatcher = () => { setFiltersOpen(false); browse.setOpen(true); };
  useEffect(() => {
    if (!browse.applyRevision) return;
    setMapOpen(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
      document.getElementById("skoun-web-shell")?.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [browse.applyRevision]);
  useEffect(() => { if (browse.open) setFiltersOpen(false); }, [browse.open]);
  useEffect(() => { if (browse.prefs?.location?.value.center) setFocusPoint(browse.prefs.location.value.center); }, [browse.prefs]);

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
      if (browse.sort !== "match") setBrowseSort("distance");
    },
    [setFilters, setMode, universities.data, browse.sort, setBrowseSort],
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

  useLayoutEffect(() => {
    // Browse owns horizontal padding so the filter bar can stick full-width.
    // Layout effect so map lock applies before paint — otherwise overflow:hidden
    // on `main` makes the sticky filter `top: 70px` offset below the nav.
    setFullBleed(true);
    setHideFooter(isMap);
    setLockScroll(isMap);
    if (isMap && typeof document !== "undefined") {
      document.getElementById("skoun-web-shell")?.scrollTo(0, 0);
    }
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
  const clearAll = () => { browse.clear(); setFocusPoint(null); };

  const applyBrowseFilters = useCallback(
    (next: typeof filters) => {
      setFilters(next);
      const uniSlug = next.universitySlugs[0];
      if (uniSlug || next.campusId) {
        setMode("university");
        if (browse.sort !== "match") setBrowseSort("distance");
        const campus =
          universities.data?.find((u) => u.slug === uniSlug) ??
          universities.data?.find((u) => u.id === next.campusId) ??
          null;
        if (campus?.lat != null && campus?.lng != null) {
          setFocusPoint({ lat: campus.lat, lng: campus.lng });
        }
      }
      setFiltersOpen(false);
    },
    [setFilters, setMode, universities.data, browse.sort, setBrowseSort],
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
          <View style={styles.headingTitleRow}>
          {loading ? (
            <>
              <FindSkeletonBone
                shine={!reducedMotion}
                style={isMap ? styles.headingTitleBoneMap : styles.headingTitleBone}
              />
              {!showDistanceSplit ? (
                <FindSkeletonBone
                  shine={!reducedMotion}
                  style={styles.headingCountBone}
                />
              ) : null}
            </>
          ) : (
          <Text style={[styles.h1, isMap && styles.h1Map]}>
            {matching ? "Closest to what you want" : universityLabel ? (
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
            {!showDistanceSplit ? (
              <Text style={styles.h1Count}>
                {" "}
                | Showing {listings.length} place
                {listings.length === 1 ? "" : "s"}
              </Text>
            ) : null}
          </Text>
          )}
          </View>
          {showDistanceSplit && universityLabel && !loading ? (
            <Text style={styles.h1Sub}>
              {campusResultsHeading({ listings })}
            </Text>
          ) : null}
          {(isStale(filters, deferredFilters, mode, deferredMode, browseSort, deferredSort) ||
            isFetching) &&
          !loading ? (
            <LText variant="caption" tone="muted">
              Updating…
            </LText>
          ) : null}
        </View>

        {loading && !isMap ? (
          <GeneralLoadingBlock
            layout="inline"
            size={64}
            state="searching"
            label="Finding student homes…"
            showLabel={false}
            style={styles.headingOrb}
          />
        ) : null}

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
      {deferredPrefs ? <MatchSummaryBar prefs={deferredPrefs} count={ranked.listings.length} widening={widening} onEdit={openMatcher} onStop={browse.stop} onClear={clearAll} onMatch={()=>setBrowseSort("match")} matching={matching} loading={loading || isError} focusRevision={browse.applyRevision} /> : null}
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
      listings={listingsForDisplay}
      matches={matching ? ranked.matches : undefined}
      loading={loading}
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
      <MatcherSheet
        visible={browse.open}
        filters={filters}
        applied={browse.prefs}
        firstName={user?.firstName}
        onClose={() => browse.setOpen(false)}
        onApply={browse.apply}
      />
      <FindFilterBar
        key={browse.open ? "guide-open" : "guide-closed"}
        filters={filters}
        matchAvailable={!!browse.prefs}
        sort={browseSort}
        sticky={!isMap}
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
                listings={listingsForDisplay}
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
          style={[
            isMap ? styles.mapPaneLive : styles.mapPaneParked,
            { pointerEvents: isMap ? "auto" : "none" },
          ]}
        >
          <FindMapPane
            listings={listingsForDisplay}
            campuses={campuses}
            universityMode={effectiveMode === "university"}
            loading={loading}
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
      <FindMyPlaceFab onPress={openMatcher} hidden={browse.open} />
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
    flex: 1,
    minHeight: 0,
    height: "100%" as unknown as number,
    overflow: "hidden",
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
    overflow: "visible",
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
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    overflow: "visible",
    minHeight: 34,
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
  headingTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 34,
    gap: 10,
  },
  headingTitleBone: {
    height: 22,
    width: 420,
    maxWidth: "100%",
    borderRadius: 6,
  },
  headingTitleBoneMap: {
    height: 18,
    width: 340,
    maxWidth: "100%",
    borderRadius: 6,
  },
  headingCountBone: {
    height: 14,
    width: 148,
    borderRadius: 4,
    flexShrink: 0,
  },
  headingOrb: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 64,
    height: 64,
    marginLeft: -32,
    marginTop: -32,
    padding: 0,
    gap: 0,
    zIndex: 2,
    overflow: "visible",
    pointerEvents: "none",
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

import React, { useState, useEffect, useMemo, useDeferredValue, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Zap } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { LText } from "@/components/lister/Typography";
import { LButton } from "@/components/lister/Button";
import RenterListingDetailScreen from "@/app/(renter)/listing/[id]";
import {
  BrowseFiltersPanel,
  browseFilterBadgeCount,
  EMPTY_BROWSE_FILTERS,
  type BrowseFiltersValue,
} from "@/components/listings/BrowseFiltersPanel";
import { ListingBrowseMap } from "@/components/listings/ListingBrowseMap";
import {
  CarouselListScrollContext,
  useCarouselListScrollController,
} from "@/components/listings/carouselListScroll";
import { ListingResultCard } from "@/components/web/ListingResultCard";
import { WebEmptyState } from "@/components/web/WebEmptyState";
import { SearchAutocomplete } from "@/components/search/SearchAutocomplete";
import { CampusFarSeparator } from "@/components/listings/CampusFarSeparator";
import { Skoun } from "@/constants/theme";
import { useListings } from "@/features/listings/useListings";
import { useAuthSession } from "@/features/auth/AuthSessionProvider";
import { UniversityCampusFilter } from "@/components/listings/UniversityCampusFilter";
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
import {
  campusFarSeparatorKey,
  campusResultsHeading,
  withCampusDistanceSeparator,
  type MixedListingRow,
} from "@/lib/campusProximity";
import {
  resolveCampusFromTypedQuery,
  universityToSuggestion,
} from "@/lib/resolveCampusSearch";
import type {
  SearchAreaSuggestion,
  SearchUniversitySuggestion,
} from "@/features/search/types";
import type { CampusMeta } from "@/types/listing";

type BrowseSortKey = "newest" | "rent_asc" | "rent_desc" | "distance";
type SearchMode = "standard" | "university";

const SORT_OPTIONS: { value: BrowseSortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "rent_asc", label: "Price: Low to High" },
  { value: "rent_desc", label: "Price: High to Low" },
  { value: "distance", label: "Nearest Campus" },
];

export default function RenterSearchScreen() {
  const insets = useSafeAreaInsets();
  const carouselScroll = useCarouselListScrollController();
  const params = useLocalSearchParams<{
    q?: string;
    campusId?: string;
    areas?: string;
    universitySlugs?: string;
  }>();
  const isFocused = useIsFocused();

  const [mode, setMode] = useState<SearchMode>("university");
  const [browseFilters, setBrowseFilters] = useState<BrowseFiltersValue>(EMPTY_BROWSE_FILTERS);
  const [sort, setSort] = useState<BrowseSortKey>("newest");
  const [searchVal, setSearchVal] = useState(
    typeof params.q === "string" ? params.q : "",
  );
  const [focusPoint, setFocusPoint] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [uniOpen, setUniOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [mapSearchOpen, setMapSearchOpen] = useState(false);
  const [mapListingId, setMapListingId] = useState<string | null>(null);

  const { user } = useAuthSession();
  const universities = useUniversities();
  const institutions = useInstitutions();
  const appliedProfileCampus = useRef(false);
  const hydratedUrl = useRef(false);

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
    setSearchVal("");
    setFocusPoint(null);
    setBrowseFilters((prev) => ({
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

  const applyArea = useCallback(
    (s: SearchAreaSuggestion) => {
      setSearchVal(s.label);
      setFocusPoint(s.center);
      setBrowseFilters((prev) => ({
        ...prev,
        areas: [s.label],
        universitySlugs: [],
        institutionSlug: null,
        campusId: null,
        q: null,
      }));
      setMode("standard");
      setMapSearchOpen(false);
      syncUrl({
        q: null,
        campusId: null,
        areas: [s.label],
        universitySlugs: [],
      });
    },
    [syncUrl],
  );

  const applyUniversity = useCallback(
    (s: SearchUniversitySuggestion) => {
      setSearchVal(s.label);
      setFocusPoint(s.center);
      setBrowseFilters((prev) => ({
        ...prev,
        areas: [],
        universitySlugs: [s.slug],
        campusId: s.campusId,
        q: null,
        institutionSlug: prev.institutionSlug,
      }));
      setMode("university");
      setSort("distance");
      setMapSearchOpen(false);
      syncUrl({
        q: null,
        campusId: s.campusId,
        areas: [],
        universitySlugs: [s.slug],
      });
    },
    [syncUrl],
  );

  const switchMapCampus = useCallback(
    (campus: CampusMeta) => {
      const uni = universities.data?.find((u) => u.slug === campus.slug);
      setBrowseFilters((prev) => ({
        ...prev,
        areas: [],
        universitySlugs: [campus.slug],
        campusId: uni?.id ?? null,
        q: null,
        institutionSlug: uni?.institutionSlug ?? prev.institutionSlug,
      }));
      setMode("university");
      setSort("distance");
      setMapSearchOpen(false);
      syncUrl({
        q: null,
        campusId: uni?.id ?? null,
        areas: [],
        universitySlugs: [campus.slug],
      });
    },
    [syncUrl, universities.data],
  );

  const applyTextQuery = useCallback(
    (text: string) => {
      const campus = resolveCampusFromTypedQuery(
        text,
        universities.data ?? [],
      );
      if (campus) {
        const suggestion = universityToSuggestion(campus);
        if (suggestion) {
          applyUniversity(suggestion);
          return;
        }
        setSearchVal(campusFilterLabel(campus));
        setFocusPoint(null);
        setBrowseFilters((prev) => ({
          ...prev,
          areas: [],
          universitySlugs: [campus.slug],
          campusId: campus.id,
          q: null,
          institutionSlug: prev.institutionSlug,
        }));
        setMode("university");
        setSort("distance");
        setMapSearchOpen(false);
        syncUrl({
          q: null,
          campusId: campus.id,
          areas: [],
          universitySlugs: [campus.slug],
        });
        return;
      }
      setSearchVal(text);
      setFocusPoint(null);
      setBrowseFilters((prev) => ({
        ...prev,
        areas: [],
        universitySlugs: [],
        institutionSlug: null,
        campusId: null,
        q: text,
      }));
      setMode("standard");
      setMapSearchOpen(false);
      syncUrl({
        q: text,
        campusId: null,
        areas: [],
        universitySlugs: [],
      });
    },
    [applyUniversity, syncUrl, universities.data],
  );

  const activeUniSlug = browseFilters.universitySlugs[0] ?? null;
  const activeUni = useMemo(() => {
    const list = universities.data ?? [];
    return (
      list.find((u) => activeUniSlug != null && u.slug === activeUniSlug) ??
      list.find(
        (u) =>
          browseFilters.campusId != null && u.id === browseFilters.campusId,
      ) ??
      null
    );
  }, [universities.data, activeUniSlug, browseFilters.campusId]);
  const activeInst = useMemo(
    () =>
      (institutions.data ?? []).find(
        (i) => i.slug === browseFilters.institutionSlug,
      ) ?? null,
    [institutions.data, browseFilters.institutionSlug],
  );
  const uniPillLabel = activeUni
    ? campusFilterLabel(activeUni)
    : activeInst
      ? activeInst.shortName
      : "University";

  const onCarouselOpenChange = useCallback((open: boolean) => {
    setCarouselOpen(open);
  }, []);

  useEffect(() => {
    if (viewMode !== "map") {
      setCarouselOpen(false);
      setMapSearchOpen(false);
    }
  }, [viewMode]);

  // Hydrate from URL once (refresh / share / home navigate).
  useEffect(() => {
    if (hydratedUrl.current) return;
    const campusId =
      typeof params.campusId === "string" ? params.campusId.trim() : "";
    const areas = parseCsvParam(params.areas);
    const slugs = parseCsvParam(params.universitySlugs);
    const q =
      typeof params.q === "string" && params.q.trim()
        ? params.q.trim()
        : "";

    if (!campusId && areas.length === 0 && slugs.length === 0 && !q) {
      return;
    }
    hydratedUrl.current = true;

    if (campusId || slugs.length > 0) {
      const slug = slugs[0];
      const campus = slug
        ? universities.data?.find((u) => u.slug === slug)
        : universities.data?.find((u) => u.id === campusId);
      setSearchVal(campus ? (campus.displayName ?? campus.name) : q || searchVal);
      setBrowseFilters((prev) => ({
        ...prev,
        campusId: campusId || campus?.id || null,
        universitySlugs: slug
          ? [slug]
          : campus
            ? [campus.slug]
            : [],
        areas: [],
        q: null,
        institutionSlug: campus?.institutionSlug ?? prev.institutionSlug,
      }));
      if (campus?.lat != null && campus?.lng != null) {
        setFocusPoint({ lat: campus.lat, lng: campus.lng });
      }
      setMode("university");
      setSort("distance");
      return;
    }

    if (areas.length > 0) {
      setSearchVal(areas[0]!);
      setBrowseFilters((prev) => ({
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
      setSearchVal(q);
      setBrowseFilters((prev) => ({
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
    searchVal,
  ]);

  useEffect(() => {
    if (
      hydratedUrl.current ||
      params.q ||
      params.campusId ||
      params.areas ||
      appliedProfileCampus.current
    ) {
      return;
    }
    const slug = user?.campus?.slug;
    if (!slug) return;
    appliedProfileCampus.current = true;
    setBrowseFilters((prev) => ({
      ...prev,
      universitySlugs: [slug],
      institutionSlug: user?.campus?.institutionSlug ?? prev.institutionSlug,
    }));
    setMode("university");
    setSort("distance");
  }, [params.q, params.campusId, params.areas, user?.campus?.slug]);

  const deferredFilters = useDeferredValue(browseFilters);
  const deferredMode = useDeferredValue(mode);
  const deferredSort = useDeferredValue(sort);

  const apiSort = useMemo(() => {
    return deferredSort === "rent_asc" ? "price_asc" : "newest";
  }, [deferredSort]);

  const listFilters = useMemo(
    () => toListFilters(deferredMode, deferredFilters, apiSort),
    [deferredMode, deferredFilters, apiSort]
  );

  const listingsQuery = useListings(listFilters);
  const listings = listingsQuery.data?.listings ?? [];
  const campuses = useMemo(
    () =>
      mergeCampusPins(
        listingsQuery.data?.campuses ?? [],
        campusPinsFromInstitution(activeInst),
      ),
    [listingsQuery.data?.campuses, activeInst],
  );

  const isUniversityMode =
    deferredMode === "university" &&
    (deferredFilters.universitySlugs.length > 0 ||
      Boolean(deferredFilters.campusId) ||
      Boolean(deferredFilters.institutionSlug));

  // Client side sorting for desc/distance
  const processedListings = useMemo(() => {
    let result = [...listings];
    if (deferredSort === "rent_desc") {
      result.sort((a, b) => b.monthlyRentUsd - a.monthlyRentUsd);
    } else if (deferredSort === "distance") {
      result.sort((a, b) => {
        const da = a.distanceMeters ?? Number.POSITIVE_INFINITY;
        const db = b.distanceMeters ?? Number.POSITIVE_INFINITY;
        return da - db;
      });
    }
    return result;
  }, [listings, deferredSort]);

  const browseRows: MixedListingRow[] = useMemo(
    () =>
      withCampusDistanceSeparator(processedListings, {
        enabled:
          isUniversityMode &&
          deferredSort === "distance" &&
          activeUni != null,
        universityLabel: activeUni ? campusFilterLabel(activeUni) : "",
      }),
    [processedListings, isUniversityMode, deferredSort, activeUni],
  );
  const showDistanceSplit =
    isUniversityMode && deferredSort === "distance" && activeUni != null;
  const resultsHeading =
    showDistanceSplit && activeUni
      ? campusResultsHeading({ listings: processedListings })
      : null;
  const resultsTitle =
    showDistanceSplit && activeUni
      ? `Student Accommodations near ${campusFilterLabel(activeUni)}`
      : null;

  const clearAllFilters = () => {
    resetSearch();
  };

  const badgeCount = browseFilterBadgeCount(browseFilters, mode);

  const searchField = (
    <SearchAutocomplete
      value={searchVal}
      onChangeText={setSearchVal}
      placeholder="Search area, university, listing…"
      onSelectArea={applyArea}
      onSelectUniversity={applyUniversity}
      onSelectListing={(s) => {
        setMapSearchOpen(false);
        router.push(`/(renter)/listing/${s.id}`);
      }}
      onSubmitText={applyTextQuery}
      onClear={resetSearch}
      containerStyle={{ flex: 1 }}
    />
  );

  return (
    <CarouselListScrollContext.Provider value={carouselScroll.value}>
    <StatusBar barStyle="dark-content" />
    <View
      style={[
        styles.container,
        viewMode === "map" ? { paddingTop: 0 } : { paddingTop: insets.top },
      ]}
    >
      
      {viewMode !== "map" ? (
      <>
      {/* SEARCH HEADER */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={Skoun.color.ink} />
        </Pressable>

        <View style={[styles.searchBar, { zIndex: 50, overflow: "visible" }]}>
          {searchField}
        </View>
      </View>

      {/* HORIZONTAL FILTERS RAIL */}
      <View style={styles.filterRailContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRail}
        >
          {/* University Pill — primary search */}
          <Pressable
            onPress={() => setUniOpen(true)}
            style={[styles.filterPill, activeUniSlug != null && styles.filterPillActive]}
          >
            <Ionicons
              name="school-outline"
              size={15}
              color={activeUniSlug != null ? "#ffffff" : Skoun.color.inkMuted}
            />
            <Text
              style={[styles.filterPillLabel, activeUniSlug != null && styles.filterPillLabelActive]}
              numberOfLines={1}
            >
              {uniPillLabel}
            </Text>
          </Pressable>

          {/* Main Filters Drawer Button */}
          <Pressable
            onPress={() => setFiltersOpen(true)}
            style={[styles.filterPill, badgeCount > 0 && styles.filterPillActive]}
          >
            <Ionicons
              name="options-outline"
              size={15}
              color={badgeCount > 0 ? "#ffffff" : Skoun.color.inkMuted}
            />
            <Text style={[styles.filterPillLabel, badgeCount > 0 && styles.filterPillLabelActive]}>
              Filters {badgeCount > 0 ? `(${badgeCount})` : ""}
            </Text>
          </Pressable>

          {/* Sort Pill */}
          <Pressable
            onPress={() => setSortOpen(true)}
            style={[styles.filterPill, sort !== "newest" && styles.filterPillActive]}
          >
            <Ionicons
              name="swap-vertical-outline"
              size={15}
              color={sort !== "newest" ? "#ffffff" : Skoun.color.inkMuted}
            />
            <Text style={[styles.filterPillLabel, sort !== "newest" && styles.filterPillLabelActive]}>
              {SORT_OPTIONS.find((o) => o.value === sort)?.label || "Sort"}
            </Text>
          </Pressable>

          {/* Budget Quick Info */}
          {(browseFilters.minRentUsd != null || browseFilters.maxRentUsd != null) ? (
            <Pressable
              onPress={() => setFiltersOpen(true)}
              style={[styles.filterPill, styles.filterPillActive]}
            >
              <Text style={[styles.filterPillLabel, styles.filterPillLabelActive]}>
                {browseFilters.minRentUsd != null && browseFilters.maxRentUsd != null
                  ? `$${browseFilters.minRentUsd}–$${browseFilters.maxRentUsd}`
                  : browseFilters.maxRentUsd != null
                  ? `Under $${browseFilters.maxRentUsd}`
                  : `From $${browseFilters.minRentUsd}`}
              </Text>
            </Pressable>
          ) : null}

          {/* Room Type Quick Info */}
          {browseFilters.listingTypes.length > 0 ? (
            <Pressable
              onPress={() => setFiltersOpen(true)}
              style={[styles.filterPill, styles.filterPillActive]}
            >
              <Text style={[styles.filterPillLabel, styles.filterPillLabelActive]}>
                {browseFilters.listingTypes.length === 1
                  ? browseFilters.listingTypes[0] === "private_room"
                    ? "Private Room"
                    : "Entire Flat"
                  : "Multiple Types"}
              </Text>
            </Pressable>
          ) : null}

          {/* Electricity Quick Info */}
          {browseFilters.electricity.length > 0 ? (
            <Pressable
              onPress={() => setFiltersOpen(true)}
              style={[styles.filterPill, styles.filterPillActive]}
            >
              <View style={styles.filterPillLabelRow}>
                <Zap size={13} color="#FFFFFF" strokeWidth={2} />
                <Text style={[styles.filterPillLabel, styles.filterPillLabelActive]}>
                  Utilities Active
                </Text>
              </View>
            </Pressable>
          ) : null}

        </ScrollView>
      </View>
      </>
      ) : null}

      {/* SEARCH RESULTS LIST / MAP VIEW */}
      {viewMode === "map" ? (
        <Modal
          visible={viewMode === "map" && isFocused}
          animationType="none"
          presentationStyle="fullScreen"
          statusBarTranslucent
          onRequestClose={() => {
            setFiltersOpen(false);
            setMapSearchOpen(false);
            setMapListingId(null);
            setViewMode("list");
          }}
        >
          <View style={styles.mapScreen}>
            <ListingBrowseMap
              listings={processedListings}
              campuses={campuses}
              universityMode={isUniversityMode}
              focusCampusSlug={resolveFocusCampusSlug(
                activeUniSlug,
                activeInst,
              )}
              focusPoint={
                isUniversityMode
                  ? null
                  : focusPoint
              }
              onSelectCampus={switchMapCampus}
              loading={listingsQuery.isLoading}
              fillContainer
              onCarouselOpenChange={onCarouselOpenChange}
              onOpenListing={(listing) => setMapListingId(listing.id)}
            />
            {!carouselOpen ? (
              <View
                style={[styles.mapChrome, { paddingTop: insets.top + 8 }]}
                pointerEvents="box-none"
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Search"
                  onPress={() => setMapSearchOpen(true)}
                  style={styles.mapChromeBtn}
                >
                  <Ionicons name="search" size={20} color={Skoun.color.ink} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    badgeCount > 0 ? `Filters, ${badgeCount} active` : "Filters"
                  }
                  onPress={() => setFiltersOpen(true)}
                  style={styles.mapChromeBtn}
                >
                  <Ionicons name="options-outline" size={20} color={Skoun.color.ink} />
                  {badgeCount > 0 ? (
                    <View style={styles.mapFilterBadge}>
                      <Text style={styles.mapFilterBadgeText}>{badgeCount}</Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>
            ) : null}
            {!carouselOpen ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Show list view"
                onPress={() => {
                  setMapListingId(null);
                  setFiltersOpen(false);
                  setMapSearchOpen(false);
                  setViewMode("list");
                }}
                style={({ pressed }) => [
                  styles.floatingPill,
                  { bottom: Math.max(insets.bottom + 16, 28) },
                  pressed && styles.floatingPillPressed,
                ]}
              >
                <Ionicons name="list" size={18} color="#ffffff" />
                <Text style={styles.floatingPillText}>List</Text>
              </Pressable>
            ) : null}
          </View>
          <BrowseFiltersPanel
            visible={filtersOpen}
            variant="sheet"
            mode={mode}
            applied={browseFilters}
            universities={universities.data ?? []}
            universitiesLoading={universities.isLoading}
            sort={sort}
            sortOptions={SORT_OPTIONS}
            onSortChange={(value) => setSort(value as BrowseSortKey)}
            onClose={() => setFiltersOpen(false)}
            onApply={(next) => {
              setBrowseFilters(next);
              setMode("university");
              if (next.universitySlugs.length > 0) setSort("distance");
              setFiltersOpen(false);
            }}
          />
          <Modal
            visible={mapSearchOpen}
            animationType="fade"
            transparent
            statusBarTranslucent
            onRequestClose={() => setMapSearchOpen(false)}
          >
            <View style={styles.mapSearchOverlay}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss search"
                style={StyleSheet.absoluteFill}
                onPress={() => setMapSearchOpen(false)}
              />
              <View style={[styles.mapSearchBarWrap, { paddingTop: insets.top + 8, zIndex: 60, overflow: "visible" }]}>
                {searchField}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close search"
                  onPress={() => setMapSearchOpen(false)}
                  style={styles.mapSearchClose}
                >
                  <Ionicons name="close" size={22} color={Skoun.color.ink} />
                </Pressable>
              </View>
            </View>
          </Modal>
          <Modal
            visible={mapListingId != null}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={() => setMapListingId(null)}
          >
            {mapListingId ? (
              <RenterListingDetailScreen
                listingId={mapListingId}
                onClose={() => setMapListingId(null)}
              />
            ) : null}
          </Modal>
        </Modal>
      ) : listingsQuery.isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={Skoun.color.primary} size="large" />
          <LText style={{ marginTop: 12 }} tone="muted">
            Finding student homes...
          </LText>
        </View>
      ) : listingsQuery.isError ? (
        <View style={styles.centerContainer}>
          <WebEmptyState
            icon="cloud-offline-outline"
            title="Couldn’t load listings"
            message="Check your internet connection and try again."
            actionLabel="Retry"
            onAction={() => void listingsQuery.refetch()}
          />
        </View>
      ) : processedListings.length === 0 ? (
        <View style={styles.centerContainer}>
          <WebEmptyState
            icon="search-outline"
            title="No student homes found"
            message="No results match your search parameters. Try widening your area or clearing a few filters."
            actionLabel="Clear Filters"
            onAction={clearAllFilters}
          />
        </View>
      ) : (
        <FlatList
          ref={carouselScroll.listRef}
          data={browseRows}
          keyExtractor={(item) =>
            item.kind === "separator"
              ? campusFarSeparatorKey(item.km)
              : item.listing.id
          }
          ListHeaderComponent={
            resultsTitle ? (
              <View style={styles.resultsHeadingBlock}>
                <LText variant="subtitle" style={styles.resultsTitle}>
                  {resultsTitle}
                </LText>
                {resultsHeading ? (
                  <LText variant="caption" tone="muted" style={styles.resultsSub}>
                    {resultsHeading}
                  </LText>
                ) : null}
              </View>
            ) : null
          }
          renderItem={({ item }) =>
            item.kind === "separator" ? (
              <CampusFarSeparator label={item.label} />
            ) : (
              <View style={styles.cardContainer}>
                <ListingResultCard listing={item.listing} variant="grid" />
              </View>
            )
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: 90 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          directionalLockEnabled
          refreshing={listingsQuery.isRefetching}
          onRefresh={() => void listingsQuery.refetch()}
        />
      )}

      {/* FLOATING MAP TOGGLE — list only; map has its own List pill in the Modal */}
      {viewMode === "list" ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Show map view"
        onPress={() => setViewMode("map")}
        style={({ pressed }) => [
          styles.floatingPill,
          { bottom: Math.max(insets.bottom + 62, 68) },
          pressed && styles.floatingPillPressed,
        ]}
      >
        <Ionicons name="map" size={18} color="#ffffff" />
        <Text style={styles.floatingPillText}>Map</Text>
      </Pressable>
      ) : null}

      {/* FILTERS DRAWER PANEL */}
      <BrowseFiltersPanel
        visible={filtersOpen && viewMode !== "map"}
        variant="drawer"
        mode={mode}
        applied={browseFilters}
        universities={universities.data ?? []}
        universitiesLoading={universities.isLoading}
        onClose={() => setFiltersOpen(false)}
        onApply={(next) => {
          setBrowseFilters(next);
          setMode("university");
          if (next.universitySlugs.length > 0) setSort("distance");
          setFiltersOpen(false);
        }}
      />

      {/* SORT BOTTOM SHEET / MODAL DIALOG */}
      {sortOpen ? (
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setSortOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <LText variant="subtitle" style={{ fontWeight: "700" }}>Sort listings by</LText>
              <Pressable onPress={() => setSortOpen(false)}>
                <Ionicons name="close" size={24} color={Skoun.color.ink} />
              </Pressable>
            </View>
            <View style={styles.sheetOptions}>
              {SORT_OPTIONS.map((opt) => {
                const active = sort === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.sheetOption, active && styles.sheetOptionActive]}
                    onPress={() => {
                      setSort(opt.value);
                      setSortOpen(false);
                    }}
                  >
                    <LText style={[styles.sheetOptionLabel, active && styles.sheetOptionLabelActive]}>
                      {opt.label}
                    </LText>
                    {active ? (
                      <Ionicons name="checkmark" size={18} color={Skoun.color.primary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      ) : null}

      {/* UNIVERSITY SELECTOR BOTTOM SHEET */}
      {uniOpen ? (
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setUniOpen(false)} />
          <View style={[styles.sheet, { maxHeight: "80%" }]}>
            <View style={styles.sheetHeader}>
              <View style={{ gap: 2 }}>
                <LText variant="subtitle" style={{ fontWeight: "700" }}>
                  Select University
                </LText>
                <LText variant="caption" tone="muted">
                  University first, then campus — required
                </LText>
              </View>
              <Pressable onPress={() => setUniOpen(false)}>
                <Ionicons name="close" size={24} color={Skoun.color.ink} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              <View style={styles.sheetOptions}>
                {/* Clear / All Universities Option */}
                <Pressable
                  style={[
                    styles.sheetOption,
                    activeUniSlug == null && styles.sheetOptionActive,
                  ]}
                  onPress={() => {
                    setBrowseFilters((prev) => ({
                      ...prev,
                      universitySlugs: [],
                      institutionSlug: null,
                    }));
                    setMode("university");
                    setUniOpen(false);
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                    <Ionicons
                      name="globe-outline"
                      size={18}
                      color={activeUniSlug == null ? Skoun.color.primary : Skoun.color.inkMuted}
                    />
                    <LText
                      style={[
                        styles.sheetOptionLabel,
                        activeUniSlug == null && styles.sheetOptionLabelActive,
                      ]}
                    >
                      All / No University Filter
                    </LText>
                  </View>
                  {activeUniSlug == null ? (
                    <Ionicons name="checkmark" size={18} color={Skoun.color.primary} />
                  ) : null}
                </Pressable>

                <UniversityCampusFilter
                  hideHeading
                  selectedCampusSlug={activeUniSlug}
                  selectedInstitutionSlug={browseFilters.institutionSlug}
                  onSelectInstitutionSlug={(slug) => {
                    setBrowseFilters((prev) => ({
                      ...prev,
                      institutionSlug: slug,
                      universitySlugs: [],
                    }));
                    setMode("university");
                  }}
                  onSelectCampusSlug={(slug) => {
                    if (slug) {
                      setBrowseFilters((prev) => ({
                        ...prev,
                        universitySlugs: [slug],
                      }));
                      setMode("university");
                      setSort("distance");
                      setUniOpen(false);
                    } else {
                      setBrowseFilters((prev) => ({
                        ...prev,
                        universitySlugs: [],
                      }));
                    }
                  }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      ) : null}

    </View>
    </CarouselListScrollContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 12,
    zIndex: 50,
    overflow: "visible",
  },
  backBtn: {
    padding: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 24,
    paddingHorizontal: 0,
    minHeight: 46,
    overflow: "visible",
    zIndex: 50,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: Skoun.color.ink,
    height: "100%",
  },
  clearBtn: {
    padding: 4,
  },
  filterRailContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#ffffff",
    paddingVertical: 8,
  },
  filterRail: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#EEF1F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterPillActive: {
    backgroundColor: Skoun.color.primary,
    borderColor: Skoun.color.primary,
  },
  filterPillLabel: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 12,
    color: Skoun.color.inkMuted,
  },
  filterPillLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  filterPillLabelActive: {
    color: "#ffffff",
    fontWeight: "600",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80,
  },
  resultsHeadingBlock: {
    marginBottom: 12,
    gap: 4,
  },
  resultsTitle: {
    fontWeight: "700",
  },
  resultsSub: {
    fontSize: 14,
  },
  cardContainer: {
    marginBottom: 16,
    width: "100%",
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(18,24,38,0.4)",
    justifyContent: "flex-end",
    zIndex: 100,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 12,
  },
  sheetOptions: {
    gap: 6,
  },
  sheetOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  sheetOptionActive: {
    backgroundColor: Skoun.color.primaryMist,
  },
  sheetOptionLabel: {
    fontFamily: Skoun.type.bodyMedium,
    fontSize: 14,
    color: Skoun.color.ink,
  },
  sheetOptionLabelActive: {
    color: Skoun.color.primary,
    fontWeight: "600",
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  mapScreen: {
    flex: 1,
  },
  mapChrome: {
    position: "absolute",
    top: 0,
    left: 12,
    right: 12,
    zIndex: 500,
    flexDirection: "row",
    justifyContent: "space-between",
    pointerEvents: "box-none",
  },
  mapChromeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#121826",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  mapFilterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#C23B2E",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  mapFilterBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: Skoun.type.bodyBold,
    fontWeight: "700",
  },
  mapSearchOverlay: {
    flex: 1,
    backgroundColor: "rgba(18,24,38,0.35)",
  },
  mapSearchBarWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
    zIndex: 60,
    overflow: "visible",
  },
  mapSearchClose: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  floatingPill: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#111928",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 99,
  },
  floatingPillPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  floatingPillText: {
    fontFamily: Skoun.type.bodyBold,
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "700",
  },
});

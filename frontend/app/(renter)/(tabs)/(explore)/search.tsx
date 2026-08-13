import React, { useState, useEffect, useMemo, useDeferredValue } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { LText } from "@/components/lister/Typography";
import { LButton } from "@/components/lister/Button";
import {
  BrowseFiltersPanel,
  browseFilterBadgeCount,
  EMPTY_BROWSE_FILTERS,
  type BrowseFiltersValue,
} from "@/components/listings/BrowseFiltersPanel";
import { ListingBrowseMap } from "@/components/listings/ListingBrowseMap";
import { ListingResultCard } from "@/components/web/ListingResultCard";
import { WebEmptyState } from "@/components/web/WebEmptyState";
import { Skoun } from "@/constants/theme";
import { useListings } from "@/features/listings/useListings";
import { useUniversities } from "@/features/universities/useUniversities";
import { toListFilters } from "@/lib/browseFilters";
import { LEBANON_AREAS } from "@/constants/areas";

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
  const { q } = useLocalSearchParams<{ q?: string }>();

  const navigation = useNavigation();
  const [mode, setMode] = useState<SearchMode>("standard");
  const [browseFilters, setBrowseFilters] = useState<BrowseFiltersValue>(EMPTY_BROWSE_FILTERS);
  const [sort, setSort] = useState<BrowseSortKey>("newest");
  const [searchVal, setSearchVal] = useState(q ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [uniOpen, setUniOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  const universities = useUniversities();

  const activeUniSlug = browseFilters.universitySlugs[0] ?? null;
  const activeUni = useMemo(
    () => universities.data?.find((u) => u.slug === activeUniSlug),
    [universities.data, activeUniSlug]
  );

  // Hide tab bar when in map view mode
  useEffect(() => {
    try {
      const parent = navigation.getParent();
      if (viewMode === "map") {
        navigation.setOptions({ tabBarStyle: { display: "none" } });
        if (parent) parent.setOptions({ tabBarStyle: { display: "none" } });
      } else {
        navigation.setOptions({ tabBarStyle: undefined });
        if (parent) parent.setOptions({ tabBarStyle: undefined });
      }
    } catch {
      // Safe fallback
    }

    return () => {
      try {
        const parent = navigation.getParent();
        navigation.setOptions({ tabBarStyle: undefined });
        if (parent) parent.setOptions({ tabBarStyle: undefined });
      } catch {
        // Safe fallback
      }
    };
  }, [navigation, viewMode]);

  // Parse entry search query
  useEffect(() => {
    if (q) {
      setSearchVal(q);
      const queryLower = q.toLowerCase().trim();
      
      const matchedArea = LEBANON_AREAS.find(
        (a) => a.toLowerCase() === queryLower
      );
      
      if (matchedArea) {
        setBrowseFilters((prev) => ({
          ...prev,
          areas: [matchedArea],
        }));
        setMode("standard");
        return;
      }
      
      if (universities.data) {
        const matchedUni = universities.data.find(
          (u) =>
            u.slug.toLowerCase() === queryLower ||
            u.name.toLowerCase().includes(queryLower)
        );
        
        if (matchedUni) {
          setBrowseFilters((prev) => ({
            ...prev,
            universitySlugs: [matchedUni.slug],
          }));
          setMode("university");
        }
      }
    }
  }, [q, universities.data]);

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
  const campuses = listingsQuery.data?.campuses ?? [];

  const isUniversityMode =
    deferredMode === "university" && deferredFilters.universitySlugs.length > 0;

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

  const handleSearchSubmit = () => {
    const val = searchVal.trim();
    if (!val) {
      setBrowseFilters(EMPTY_BROWSE_FILTERS);
      return;
    }
    const valLower = val.toLowerCase();
    
    // Check matched area
    const matchedArea = LEBANON_AREAS.find(
      (a) => a.toLowerCase() === valLower
    );
    if (matchedArea) {
      setBrowseFilters((prev) => ({
        ...prev,
        areas: [matchedArea],
      }));
      setMode("standard");
      return;
    }

    // Check matched university
    if (universities.data) {
      const matchedUni = universities.data.find(
        (u) =>
          u.slug.toLowerCase() === valLower ||
          u.name.toLowerCase().includes(valLower)
      );
      if (matchedUni) {
        setBrowseFilters((prev) => ({
          ...prev,
          universitySlugs: [matchedUni.slug],
        }));
        setMode("university");
        return;
      }
    }

    // Generic text filter (set as area fallback or clear area filter)
    setBrowseFilters((prev) => ({
      ...prev,
      areas: [val],
    }));
  };

  const clearAllFilters = () => {
    setBrowseFilters(EMPTY_BROWSE_FILTERS);
    setSearchVal("");
    setMode("standard");
  };

  const badgeCount = browseFilterBadgeCount(browseFilters, mode);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      
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

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Skoun.color.inkMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchVal}
            onChangeText={setSearchVal}
            placeholder="Search city, area, or university..."
            placeholderTextColor={Skoun.color.inkFaint}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchVal ? (
            <Pressable onPress={() => { setSearchVal(""); setBrowseFilters(EMPTY_BROWSE_FILTERS); }} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={Skoun.color.inkMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* HORIZONTAL FILTERS RAIL */}
      <View style={styles.filterRailContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRail}
        >
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

          {/* University Pill */}
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
              {activeUni ? activeUni.name : "University"}
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
              <Text style={[styles.filterPillLabel, styles.filterPillLabelActive]}>
                ⚡ Utilities Active
              </Text>
            </Pressable>
          ) : null}

        </ScrollView>
      </View>

      {/* SEARCH RESULTS LIST / MAP VIEW */}
      {viewMode === "map" ? (
        <View style={styles.mapContainer}>
          <ListingBrowseMap
            listings={processedListings}
            campuses={campuses}
            universityMode={isUniversityMode}
            loading={listingsQuery.isLoading}
            fillContainer
          />
        </View>
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
          data={processedListings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.cardContainer}>
              <ListingResultCard listing={item} variant="grid" />
            </View>
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: 90 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          refreshing={listingsQuery.isRefetching}
          onRefresh={() => void listingsQuery.refetch()}
        />
      )}

      {/* FLOATING MAP / LIST TOGGLE PILL AT BOTTOM CENTER */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={viewMode === "list" ? "Show map view" : "Show list view"}
        onPress={() => setViewMode((prev) => (prev === "list" ? "map" : "list"))}
        style={({ pressed }) => [
          styles.floatingPill,
          {
            bottom:
              viewMode === "map"
                ? Math.max(insets.bottom + 16, 24)
                : Math.max(insets.bottom + 62, 68),
          },
          pressed && styles.floatingPillPressed,
        ]}
      >
        <Ionicons
          name={viewMode === "list" ? "map" : "list"}
          size={18}
          color="#ffffff"
        />
        <Text style={styles.floatingPillText}>
          {viewMode === "list" ? "Map" : "List"}
        </Text>
      </Pressable>

      {/* FILTERS DRAWER PANEL */}
      <BrowseFiltersPanel
        visible={filtersOpen}
        mode={mode}
        applied={browseFilters}
        universities={universities.data ?? []}
        universitiesLoading={universities.isLoading}
        onClose={() => setFiltersOpen(false)}
        onApply={(next) => {
          setBrowseFilters(next);
          if (next.universitySlugs.length > 0) setMode("university");
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
                  Choose a campus (1 active at a time)
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
                    setBrowseFilters((prev) => ({ ...prev, universitySlugs: [] }));
                    setMode("standard");
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

                {/* List of Universities (Only 1 active at a time) */}
                {(universities.data ?? []).map((uni) => {
                  const active = activeUniSlug === uni.slug;
                  return (
                    <Pressable
                      key={uni.id || uni.slug}
                      style={[styles.sheetOption, active && styles.sheetOptionActive]}
                      onPress={() => {
                        if (active) {
                          setBrowseFilters((prev) => ({ ...prev, universitySlugs: [] }));
                          setMode("standard");
                        } else {
                          // Only 1 active university at a time
                          setBrowseFilters((prev) => ({
                            ...prev,
                            universitySlugs: [uni.slug],
                          }));
                          setMode("university");
                        }
                        setUniOpen(false);
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                        <Ionicons
                          name="school-outline"
                          size={18}
                          color={active ? Skoun.color.primary : Skoun.color.inkMuted}
                        />
                        <LText
                          style={[
                            styles.sheetOptionLabel,
                            active && styles.sheetOptionLabelActive,
                            { flex: 1 },
                          ]}
                          numberOfLines={1}
                        >
                          {uni.name}
                        </LText>
                      </View>
                      {active ? (
                        <Ionicons name="checkmark" size={18} color={Skoun.color.primary} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      ) : null}

    </View>
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
  },
  backBtn: {
    padding: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 46,
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

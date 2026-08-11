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
import { router, useLocalSearchParams } from "expo-router";
import { LText } from "@/components/lister/Typography";
import { LButton } from "@/components/lister/Button";
import {
  BrowseFiltersPanel,
  browseFilterBadgeCount,
  EMPTY_BROWSE_FILTERS,
  type BrowseFiltersValue,
} from "@/components/listings/BrowseFiltersPanel";
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

export default function RenterNewSearchScreen() {
  const insets = useSafeAreaInsets();
  const { q } = useLocalSearchParams<{ q?: string }>();

  const [mode, setMode] = useState<SearchMode>("standard");
  const [browseFilters, setBrowseFilters] = useState<BrowseFiltersValue>(EMPTY_BROWSE_FILTERS);
  const [sort, setSort] = useState<BrowseSortKey>("newest");
  const [searchVal, setSearchVal] = useState(q ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const universities = useUniversities();

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
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      
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

      {/* SEARCH RESULTS LIST */}
      {listingsQuery.isLoading ? (
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
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={listingsQuery.isRefetching}
          onRefresh={() => void listingsQuery.refetch()}
        />
      )}

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
    paddingBottom: 32,
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
});

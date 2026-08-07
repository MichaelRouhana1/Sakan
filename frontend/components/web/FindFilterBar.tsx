import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import type { BrowseFiltersValue } from "@/components/listings/BrowseFiltersPanel";
import type { SearchMode } from "@/components/listings/SearchModeToggle";
import { Skoun } from "@/constants/theme";

export type BrowseSortKey = "newest" | "rent_asc" | "rent_desc" | "distance";

type PillProps = {
  label: string;
  active?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

function FilterPill({ label, active, icon, onPress }: PillProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.pill,
        active && styles.pillActive,
        (hovered || pressed) && !active && styles.pillHover,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={15}
          color={active ? Skoun.color.primaryDeep : Skoun.color.inkMuted}
        />
      ) : null}
      <LText
        variant="caption"
        style={[styles.pillLabel, active && styles.pillLabelActive]}
      >
        {label}
      </LText>
      <Ionicons
        name="chevron-down"
        size={12}
        color={active ? Skoun.color.primaryDeep : Skoun.color.inkFaint}
      />
    </Pressable>
  );
}

type Props = {
  mode: SearchMode;
  filters: BrowseFiltersValue;
  sort: BrowseSortKey;
  onModeChange: (mode: SearchMode) => void;
  onOpenFilters: () => void;
  onOpenSort: () => void;
  onOpenAreas: () => void;
  onOpenUniversities: () => void;
  onOpenBudget: () => void;
  onOpenRoomType: () => void;
  onOpenUtilities: () => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
};

function budgetLabel(filters: BrowseFiltersValue): string {
  if (filters.minRentUsd != null && filters.maxRentUsd != null) {
    return `$${filters.minRentUsd}–$${filters.maxRentUsd}`;
  }
  if (filters.maxRentUsd != null) return `Under $${filters.maxRentUsd}`;
  if (filters.minRentUsd != null) return `From $${filters.minRentUsd}`;
  return "Budget";
}

function sortLabel(sort: BrowseSortKey): string {
  switch (sort) {
    case "rent_asc":
      return "Price ↑";
    case "rent_desc":
      return "Price ↓";
    case "distance":
      return "Nearest";
    default:
      return "Sort";
  }
}

export function FindFilterBar({
  mode,
  filters,
  sort,
  onModeChange,
  onOpenFilters,
  onOpenSort,
  onOpenAreas,
  onOpenUniversities,
  onOpenBudget,
  onOpenRoomType,
  onOpenUtilities,
  onClearAll,
  hasActiveFilters,
}: Props) {
  return (
    <View style={styles.bar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            onModeChange(mode === "university" ? "standard" : "university")
          }
          style={({ hovered, pressed }) => [
            styles.modePill,
            mode === "university" && styles.modePillActive,
            (hovered || pressed) && styles.pillHover,
          ]}
        >
          <Ionicons
            name="school-outline"
            size={15}
            color={
              mode === "university"
                ? Skoun.color.primaryDeep
                : Skoun.color.inkMuted
            }
          />
          <LText
            variant="caption"
            style={[
              styles.pillLabel,
              mode === "university" && styles.pillLabelActive,
            ]}
          >
            {mode === "university" ? "Near campus" : "By area"}
          </LText>
        </Pressable>

        <FilterPill
          label="Filters"
          icon="options-outline"
          active={hasActiveFilters}
          onPress={onOpenFilters}
        />
        <FilterPill
          label={sortLabel(sort)}
          icon="swap-vertical-outline"
          active={sort !== "newest"}
          onPress={onOpenSort}
        />
        {mode === "standard" ? (
          <FilterPill
            label={
              filters.areas.length
                ? filters.areas.length === 1
                  ? filters.areas[0]!
                  : `${filters.areas.length} areas`
                : "Area"
            }
            active={filters.areas.length > 0}
            onPress={onOpenAreas}
          />
        ) : (
          <FilterPill
            label={
              filters.universitySlugs.length ? "Campus set" : "University"
            }
            active={filters.universitySlugs.length > 0}
            onPress={onOpenUniversities}
          />
        )}
        <FilterPill
          label={budgetLabel(filters)}
          active={filters.minRentUsd != null || filters.maxRentUsd != null}
          onPress={onOpenBudget}
        />
        <FilterPill
          label={
            filters.listingTypes.length
              ? filters.listingTypes.length === 1
                ? "1 room type"
                : `${filters.listingTypes.length} types`
              : "Room type"
          }
          active={filters.listingTypes.length > 0}
          onPress={onOpenRoomType}
        />
        <FilterPill
          label={
            filters.electricity.length ||
            filters.water.length ||
            filters.wifiIncluded
              ? "Utilities · on"
              : "Utilities"
          }
          active={
            filters.electricity.length > 0 ||
            filters.water.length > 0 ||
            filters.wifiIncluded
          }
          onPress={onOpenUtilities}
        />

        {hasActiveFilters ? (
          <Pressable
            accessibilityRole="button"
            onPress={onClearAll}
            style={({ hovered }) => [
              styles.clearBtn,
              hovered && styles.clearHover,
            ]}
          >
            <LText variant="caption" style={styles.clearLabel}>
              Clear all
            </LText>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "sticky" as unknown as "relative",
    // Nav is outside the scrollport — pin flush under it.
    top: 0,
    zIndex: 90,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: Skoun.color.surface,
    borderBottomWidth: 1,
    borderBottomColor: Skoun.color.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
  },
  pillActive: {
    borderColor: Skoun.color.primary,
    backgroundColor: Skoun.color.primaryMist,
  },
  pillHover: {
    backgroundColor: Skoun.color.surfaceMuted,
  },
  pillLabel: {
    fontSize: 13,
    color: Skoun.color.ink,
    fontWeight: "600",
  },
  pillLabelActive: {
    color: Skoun.color.primaryDeep,
  },
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
  },
  modePillActive: {
    borderColor: Skoun.color.primary,
    backgroundColor: Skoun.color.primaryMist,
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  clearHover: {
    opacity: 0.75,
  },
  clearLabel: {
    color: Skoun.color.primary,
    fontWeight: "700",
    fontSize: 13,
  },
});

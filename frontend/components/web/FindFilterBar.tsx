import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import type { BrowseFiltersValue } from "@/components/listings/BrowseFiltersPanel";
import { Skoun } from "@/constants/theme";
import {
  WEB_CONTENT_MAX,
  WEB_CONTENT_PAD_X,
  WEB_FILTER_BAR_STICKY_TOP,
} from "@/constants/webLayout";

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
  filters: BrowseFiltersValue;
  sort: BrowseSortKey;
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
  filters,
  sort,
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
  const uniActive =
    filters.universitySlugs.length > 0 || Boolean(filters.institutionSlug);

  return (
    <View style={styles.bar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="University"
          onPress={onOpenUniversities}
          style={({ hovered, pressed }) => [
            styles.modePill,
            uniActive && styles.modePillActive,
            (hovered || pressed) && styles.pillHover,
          ]}
        >
          <Ionicons
            name="school-outline"
            size={15}
            color={
              uniActive ? Skoun.color.primaryDeep : Skoun.color.inkMuted
            }
          />
          <LText
            variant="caption"
            style={[styles.pillLabel, uniActive && styles.pillLabelActive]}
          >
            University
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
    top: WEB_FILTER_BAR_STICKY_TOP,
    left: 0,
    right: 0,
    width: "100%",
    height: 64,
    minHeight: 64,
    zIndex: 45,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    shadowColor: "#121826",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    boxSizing: "border-box",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: WEB_CONTENT_MAX,
    width: "100%",
    marginHorizontal: "auto" as unknown as number,
    alignSelf: "center",
    paddingHorizontal: WEB_CONTENT_PAD_X,
    paddingVertical: 12,
    boxSizing: "border-box",
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
    flexShrink: 0,
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
    flexShrink: 0,
  },
  modePillActive: {
    borderColor: Skoun.color.primary,
    backgroundColor: Skoun.color.primaryMist,
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexShrink: 0,
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

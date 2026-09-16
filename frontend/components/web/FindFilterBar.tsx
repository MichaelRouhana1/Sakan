import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { LText } from "@/components/lister/Typography";
import type { BrowseFiltersValue } from "@/components/listings/BrowseFiltersPanel";
import { UniversityCampusFilter } from "@/components/listings/UniversityCampusFilter";
import {
  FILTER_BAR_HEIGHT,
  BudgetRangeControl,
  FilterDropdownBackdrop,
  FilterDropdownShell,
  MenuChip,
  MenuRow,
  MenuSearch,
} from "@/components/web/FindFilterDropdown";
import {
  MAX_LISTING_AREAS,
  useLiveLebanonAreaGroups,
} from "@/constants/areas";
import { ELECTRICITY_LABELS, WATER_LABELS } from "@/constants/utilities";
import { Skoun } from "@/constants/theme";
import {
  WEB_CONTENT_MAX,
  WEB_CONTENT_PAD_X,
  WEB_FILTER_BAR_STICKY_TOP,
} from "@/constants/webLayout";
import { LISTING_TYPE_LABELS } from "@/lib/listingLabels";
import type {
  ElectricityStatus,
  ListingType,
  WaterStatus,
} from "@/types/listing";

export type BrowseSortKey = "newest" | "rent_asc" | "rent_desc" | "distance";

type MenuId =
  | "university"
  | "sort"
  | "budget"
  | "roomType"
  | "utilities"
  | "area";

type Anchor = { top: number; left: number };

const SORT_OPTIONS: { value: BrowseSortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "rent_asc", label: "Price: low to high" },
  { value: "rent_desc", label: "Price: high to low" },
  { value: "distance", label: "Nearest campus" },
];

const LISTING_TYPE_OPTIONS = Object.keys(LISTING_TYPE_LABELS) as ListingType[];
const ELECTRICITY_OPTIONS = Object.keys(
  ELECTRICITY_LABELS,
) as ElectricityStatus[];
const WATER_OPTIONS = Object.keys(WATER_LABELS) as WaterStatus[];

type PillProps = {
  label: string;
  active?: boolean;
  open?: boolean;
  muted?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  chevron?: boolean;
  measure?: boolean;
  onPress: (anchor: Anchor) => void;
};

function FilterPill({
  label,
  active,
  open,
  muted,
  icon,
  chevron = true,
  measure = true,
  onPress,
}: PillProps) {
  const ref = useRef<View>(null);
  return (
    <View ref={ref} collapsable={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: Boolean(active || open) }}
        onPress={() => {
          if (!measure) {
            onPress({ top: 0, left: 0 });
            return;
          }
          ref.current?.measureInWindow((x, y, _w, h) => {
            onPress({ top: Math.round(y + h + 8), left: Math.round(x) });
          });
        }}
        style={({ hovered, pressed }) => [
          styles.pill,
          muted && styles.pillMuted,
          (active || open) && styles.pillActive,
          (hovered || pressed) && !active && !open && styles.pillHover,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={15}
            color={
              active || open ? Skoun.color.primaryDeep : Skoun.color.inkMuted
            }
          />
        ) : null}
        <LText
          variant="caption"
          style={[styles.pillLabel, (active || open) && styles.pillLabelActive]}
        >
          {label}
        </LText>
        {chevron ? (
          <Ionicons
            name="chevron-down"
            size={12}
            color={
              active || open ? Skoun.color.primaryDeep : Skoun.color.inkFaint
            }
          />
        ) : null}
      </Pressable>
    </View>
  );
}

function toggleInList<T extends string>(list: T[], value: T, max: number): T[] {
  if (list.includes(value)) return list.filter((item) => item !== value);
  if (list.length >= max) return list;
  return [...list, value];
}

type Props = {
  filters: BrowseFiltersValue;
  sort: BrowseSortKey;
  onOpenFilters: () => void;
  onApplyFilters: (next: BrowseFiltersValue) => void;
  onChangeSort: (sort: BrowseSortKey) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
  /** Stick below the site nav while browse scrolls. Off in the locked map split. */
  sticky?: boolean;
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
  onApplyFilters,
  onChangeSort,
  onClearAll,
  hasActiveFilters,
  sticky = true,
}: Props) {
  const [menu, setMenu] = useState<MenuId | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [areaQuery, setAreaQuery] = useState("");
  const areaGroups = useLiveLebanonAreaGroups(areaQuery);
  const pendingInstSlug = useRef(filters.institutionSlug);

  const uniActive =
    filters.universitySlugs.length > 0 || Boolean(filters.institutionSlug);

  const openMenu = (id: MenuId, nextAnchor: Anchor) => {
    if (menu === id) {
      setMenu(null);
      setAnchor(null);
      return;
    }
    setMenu(id);
    setAnchor(nextAnchor);
  };

  const closeMenu = () => {
    setMenu(null);
    setAnchor(null);
  };

  const patch = (partial: Partial<BrowseFiltersValue>) => {
    onApplyFilters({ ...filters, ...partial });
  };

  const filteredAreas = useMemo(() => areaGroups, [areaGroups]);

  return (
    <View style={[styles.bar, !sticky && styles.barStatic]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <FilterPill
          label="Filters"
          icon="funnel"
          chevron={false}
          measure={false}
          muted
          active={hasActiveFilters}
          onPress={() => {
            closeMenu();
            onOpenFilters();
          }}
        />
        <FilterPill
          label="University"
          icon="school-outline"
          active={uniActive}
          open={menu === "university"}
          onPress={(event) => openMenu("university", event)}
        />
        <FilterPill
          label={sortLabel(sort)}
          icon="swap-vertical-outline"
          active={sort !== "newest"}
          open={menu === "sort"}
          onPress={(event) => openMenu("sort", event)}
        />
        <FilterPill
          label={budgetLabel(filters)}
          active={filters.minRentUsd != null || filters.maxRentUsd != null}
          open={menu === "budget"}
          onPress={(event) => openMenu("budget", event)}
        />
        <FilterPill
          label={
            filters.listingTypes.length
              ? filters.listingTypes.length === 1
                ? LISTING_TYPE_LABELS[filters.listingTypes[0]!]
                : `${filters.listingTypes.length} types`
              : "Room type"
          }
          active={filters.listingTypes.length > 0}
          open={menu === "roomType"}
          onPress={(event) => openMenu("roomType", event)}
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
          open={menu === "utilities"}
          onPress={(event) => openMenu("utilities", event)}
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
          open={menu === "area"}
          onPress={(event) => openMenu("area", event)}
        />

        {filters.q?.trim() ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear search ${filters.q}`}
            onPress={onClearAll}
            style={({ hovered, pressed }) => [
              styles.pill,
              styles.pillActive,
              (hovered || pressed) && styles.pillHover,
            ]}
          >
            <Ionicons
              name="search-outline"
              size={15}
              color={Skoun.color.primaryDeep}
            />
            <LText variant="caption" style={[styles.pillLabel, styles.pillLabelActive]}>
              {filters.q}
            </LText>
            <Ionicons name="close" size={14} color={Skoun.color.primaryDeep} />
          </Pressable>
        ) : null}

        {hasActiveFilters ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              closeMenu();
              onClearAll();
            }}
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

      {menu && anchor ? (
        <>
          <FilterDropdownBackdrop onClose={closeMenu} />
          {menu === "university" ? (
            <FilterDropdownShell
              title="University"
              width={320}
              anchor={anchor}
              canReset={uniActive}
              onReset={() => {
                pendingInstSlug.current = null;
                patch({
                  universitySlugs: [],
                  institutionSlug: null,
                  campusId: null,
                });
              }}
              onClose={closeMenu}
            >
              <ScrollView
                style={styles.menuScroll}
                keyboardShouldPersistTaps="handled"
              >
                <UniversityCampusFilter
                  hideHeading
                  selectedCampusSlug={filters.universitySlugs[0] ?? null}
                  selectedInstitutionSlug={filters.institutionSlug}
                  onSelectInstitutionSlug={(slug) => {
                    pendingInstSlug.current = slug;
                  }}
                  onSelectCampusSlug={(slug) =>
                    patch({
                      universitySlugs: slug ? [slug] : [],
                      campusId: null,
                      institutionSlug: slug ? pendingInstSlug.current : null,
                    })
                  }
                />
              </ScrollView>
            </FilterDropdownShell>
          ) : null}
          {menu === "sort" ? (
            <FilterDropdownShell
              title="Sort"
              width={260}
              anchor={anchor}
              canReset={sort !== "newest"}
              onReset={() => onChangeSort("newest")}
              onClose={closeMenu}
            >
              {SORT_OPTIONS.map((opt) => (
                <MenuRow
                  key={opt.value}
                  label={opt.label}
                  selected={sort === opt.value}
                  onPress={() => onChangeSort(opt.value)}
                />
              ))}
            </FilterDropdownShell>
          ) : null}
          {menu === "budget" ? (
            <FilterDropdownShell
              title="Budget (per month)"
              width={340}
              anchor={anchor}
              canReset={
                filters.minRentUsd != null || filters.maxRentUsd != null
              }
              onReset={() => patch({ minRentUsd: null, maxRentUsd: null })}
              onClose={closeMenu}
            >
              <BudgetRangeControl
                minRentUsd={filters.minRentUsd}
                maxRentUsd={filters.maxRentUsd}
                onChange={(minRentUsd, maxRentUsd) =>
                  patch({ minRentUsd, maxRentUsd })
                }
              />
            </FilterDropdownShell>
          ) : null}
          {menu === "roomType" ? (
            <FilterDropdownShell
              title="Room type"
              width={360}
              anchor={anchor}
              canReset={filters.listingTypes.length > 0}
              onReset={() => patch({ listingTypes: [] })}
              onClose={closeMenu}
            >
              <View style={styles.chipWrap}>
                {LISTING_TYPE_OPTIONS.map((type) => (
                  <MenuChip
                    key={type}
                    label={LISTING_TYPE_LABELS[type]}
                    selected={filters.listingTypes.includes(type)}
                    onPress={() =>
                      patch({
                        listingTypes: toggleInList(
                          filters.listingTypes,
                          type,
                          LISTING_TYPE_OPTIONS.length,
                        ),
                      })
                    }
                  />
                ))}
              </View>
            </FilterDropdownShell>
          ) : null}
          {menu === "utilities" ? (
            <FilterDropdownShell
              title="Utilities"
              width={380}
              anchor={anchor}
              canReset={
                filters.electricity.length > 0 ||
                filters.water.length > 0 ||
                filters.wifiIncluded
              }
              onReset={() =>
                patch({ electricity: [], water: [], wifiIncluded: false })
              }
              onClose={closeMenu}
            >
              <LText variant="caption" style={styles.groupLabel}>
                Electricity
              </LText>
              <View style={styles.chipWrap}>
                {ELECTRICITY_OPTIONS.map((value) => (
                  <MenuChip
                    key={value}
                    label={ELECTRICITY_LABELS[value]}
                    selected={filters.electricity.includes(value)}
                    onPress={() =>
                      patch({
                        electricity: toggleInList(
                          filters.electricity,
                          value,
                          ELECTRICITY_OPTIONS.length,
                        ),
                      })
                    }
                  />
                ))}
              </View>
              <LText variant="caption" style={styles.groupLabel}>
                Water
              </LText>
              <View style={styles.chipWrap}>
                {WATER_OPTIONS.map((value) => (
                  <MenuChip
                    key={value}
                    label={WATER_LABELS[value]}
                    selected={filters.water.includes(value)}
                    onPress={() =>
                      patch({
                        water: toggleInList(
                          filters.water,
                          value,
                          WATER_OPTIONS.length,
                        ),
                      })
                    }
                  />
                ))}
              </View>
              <LText variant="caption" style={styles.groupLabel}>
                Wi‑Fi
              </LText>
              <View style={styles.chipWrap}>
                <MenuChip
                  label="Wi‑Fi included"
                  selected={filters.wifiIncluded}
                  onPress={() => patch({ wifiIncluded: !filters.wifiIncluded })}
                />
              </View>
            </FilterDropdownShell>
          ) : null}
          {menu === "area" ? (
            <FilterDropdownShell
              title="Area"
              width={320}
              anchor={anchor}
              canReset={filters.areas.length > 0}
              onReset={() => patch({ areas: [] })}
              onClose={closeMenu}
            >
              <MenuSearch
                value={areaQuery}
                onChange={setAreaQuery}
                placeholder="Search area"
              />
              <ScrollView
                style={styles.menuScroll}
                keyboardShouldPersistTaps="handled"
              >
                {filteredAreas.map((group) => (
                  <View key={group.governorate} style={styles.areaGroup}>
                    <LText variant="caption" style={styles.areaGroupLabel}>
                      {group.governorate}
                    </LText>
                    {group.areas.map((area) => (
                      <MenuRow
                        key={area}
                        label={area}
                        selected={filters.areas.includes(area)}
                        onPress={() =>
                          patch({
                            areas: toggleInList(
                              filters.areas,
                              area,
                              MAX_LISTING_AREAS,
                            ),
                          })
                        }
                      />
                    ))}
                  </View>
                ))}
              </ScrollView>
            </FilterDropdownShell>
          ) : null}
        </>
      ) : null}
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
    height: FILTER_BAR_HEIGHT,
    minHeight: FILTER_BAR_HEIGHT,
    zIndex: 100,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    boxShadow: "0 2px 8px rgba(18, 24, 38, 0.06)",
    boxSizing: "border-box",
    overflow: "visible",
  },
  barStatic: {
    position: "relative",
    top: 0,
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
    paddingVertical: 8,
    boxSizing: "border-box",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surface,
    flexShrink: 0,
  },
  pillMuted: {
    backgroundColor: Skoun.color.surfaceMuted,
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
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  clearHover: {
    opacity: 0.75,
  },
  clearLabel: {
    color: Skoun.color.primary,
    fontWeight: "700",
    fontSize: 15,
  },
  menuScroll: {
    maxHeight: 320,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  groupLabel: {
    marginTop: 4,
    marginBottom: 2,
    color: Skoun.color.ink,
    fontWeight: "700",
    fontSize: 13,
  },
  areaGroup: {
    marginBottom: 8,
  },
  areaGroupLabel: {
    color: Skoun.color.inkFaint,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    fontSize: 11,
    marginBottom: 2,
  },
});

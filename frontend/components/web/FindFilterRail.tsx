import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { LText } from "@/components/lister/Typography";
import type { BrowseFiltersValue } from "@/components/listings/BrowseFiltersPanel";
import type { SearchMode } from "@/components/listings/SearchModeToggle";
import {
  LEBANON_AREAS,
  MAX_LISTING_AREAS,
  MAX_UNIVERSITY_SLUGS,
} from "@/constants/areas";
import { ELECTRICITY_LABELS, WATER_LABELS } from "@/constants/utilities";
import { Skoun } from "@/constants/theme";
import type { University } from "@/features/universities/useUniversities";
import {
  GENDER_FILTER_OPTIONS,
  labelGenderRestriction,
  LISTING_TYPE_LABELS,
} from "@/lib/listingLabels";
import type {
  ElectricityStatus,
  ListingType,
  WaterStatus,
} from "@/types/listing";

type Props = {
  mode: SearchMode;
  value: BrowseFiltersValue;
  onChange: (next: BrowseFiltersValue) => void;
  universities: University[];
  universitiesLoading?: boolean;
  compact?: boolean;
};

function toggleInList<T extends string>(list: T[], value: T, max: number): T[] {
  if (list.includes(value)) return list.filter((v) => v !== value);
  if (list.length >= max) return list;
  return [...list, value];
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ hovered }) => [
        styles.chip,
        selected && styles.chipSelected,
        hovered && !selected && styles.chipHover,
      ]}
    >
      <LText
        variant="caption"
        style={selected ? styles.chipLabelSelected : styles.chipLabel}
      >
        {label}
      </LText>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <LText variant="label" tone="muted" style={styles.sectionTitle}>
        {title}
      </LText>
      {children}
    </View>
  );
}

export function FindFilterRail({
  mode,
  value,
  onChange,
  universities,
  universitiesLoading,
  compact,
}: Props) {
  const [areaQuery, setAreaQuery] = useState("");

  const filteredAreas = useMemo(() => {
    const q = areaQuery.trim().toLowerCase();
    if (!q) return LEBANON_AREAS;
    return LEBANON_AREAS.filter((a) => a.toLowerCase().includes(q));
  }, [areaQuery]);

  const patch = (partial: Partial<BrowseFiltersValue>) =>
    onChange({ ...value, ...partial });

  const content = (
    <>
      {mode === "university" ? (
        <Section title="Campus">
          {universitiesLoading ? (
            <LText variant="caption" tone="muted">
              Loading campuses…
            </LText>
          ) : (
            <View style={styles.chipRow}>
              {universities.map((u) => (
                <Chip
                  key={u.slug}
                  label={u.name}
                  selected={value.universitySlugs.includes(u.slug)}
                  onPress={() =>
                    patch({
                      universitySlugs: value.universitySlugs.includes(u.slug)
                        ? []
                        : [u.slug].slice(0, MAX_UNIVERSITY_SLUGS),
                    })
                  }
                />
              ))}
            </View>
          )}
        </Section>
      ) : null}

      <Section title="Areas">
        <TextInput
          accessibilityLabel="Search areas"
          placeholder="Search areas…"
          placeholderTextColor={Skoun.color.inkFaint}
          value={areaQuery}
          onChangeText={setAreaQuery}
          style={styles.input}
        />
        <View style={styles.chipRow}>
          {filteredAreas.map((area) => (
            <Chip
              key={area}
              label={area}
              selected={value.areas.includes(area)}
              onPress={() =>
                patch({
                  areas: toggleInList(value.areas, area, MAX_LISTING_AREAS),
                })
              }
            />
          ))}
        </View>
      </Section>

      <Section title="Monthly rent (USD)">
        <View style={styles.rentRow}>
          <TextInput
            accessibilityLabel="Minimum rent"
            placeholder="Min"
            placeholderTextColor={Skoun.color.inkFaint}
            keyboardType="number-pad"
            value={value.minRentUsd != null ? String(value.minRentUsd) : ""}
            onChangeText={(t) => {
              const n = t.trim() ? Number.parseInt(t, 10) : null;
              patch({
                minRentUsd:
                  n != null && Number.isFinite(n) && n > 0 ? n : null,
              });
            }}
            style={[styles.input, styles.rentInput]}
          />
          <LText variant="caption" tone="muted">
            —
          </LText>
          <TextInput
            accessibilityLabel="Maximum rent"
            placeholder="Max"
            placeholderTextColor={Skoun.color.inkFaint}
            keyboardType="number-pad"
            value={value.maxRentUsd != null ? String(value.maxRentUsd) : ""}
            onChangeText={(t) => {
              const n = t.trim() ? Number.parseInt(t, 10) : null;
              patch({
                maxRentUsd:
                  n != null && Number.isFinite(n) && n > 0 ? n : null,
              });
            }}
            style={[styles.input, styles.rentInput]}
          />
        </View>
      </Section>

      <Section title="Property type">
        <View style={styles.chipRow}>
          {(Object.keys(LISTING_TYPE_LABELS) as ListingType[]).map((t) => (
            <Chip
              key={t}
              label={LISTING_TYPE_LABELS[t]}
              selected={value.listingTypes.includes(t)}
              onPress={() =>
                patch({
                  listingTypes: toggleInList(value.listingTypes, t, 8),
                })
              }
            />
          ))}
        </View>
      </Section>

      <Section title="Utilities">
        <View style={styles.chipRow}>
          {(Object.keys(ELECTRICITY_LABELS) as ElectricityStatus[]).map((e) => (
            <Chip
              key={e}
              label={ELECTRICITY_LABELS[e]}
              selected={value.electricity.includes(e)}
              onPress={() =>
                patch({
                  electricity: toggleInList(value.electricity, e, 4),
                })
              }
            />
          ))}
        </View>
        <View style={[styles.chipRow, { marginTop: 8 }]}>
          {(Object.keys(WATER_LABELS) as WaterStatus[]).map((w) => (
            <Chip
              key={w}
              label={WATER_LABELS[w]}
              selected={value.water.includes(w)}
              onPress={() =>
                patch({ water: toggleInList(value.water, w, 4) })
              }
            />
          ))}
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: value.wifiIncluded }}
          onPress={() => patch({ wifiIncluded: !value.wifiIncluded })}
          style={[styles.toggleRow, value.wifiIncluded && styles.toggleRowOn]}
        >
          <LText variant="caption">Wi‑Fi included</LText>
          <Ionicons
            name={value.wifiIncluded ? "checkmark-circle" : "ellipse-outline"}
            size={18}
            color={
              value.wifiIncluded ? Skoun.color.primary : Skoun.color.inkFaint
            }
          />
        </Pressable>
      </Section>

      <Section title="Audience">
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: value.studentsOnly }}
          onPress={() => patch({ studentsOnly: !value.studentsOnly })}
          style={[styles.toggleRow, value.studentsOnly && styles.toggleRowOn]}
        >
          <LText variant="caption">Students only</LText>
          <Ionicons
            name={value.studentsOnly ? "checkmark-circle" : "ellipse-outline"}
            size={18}
            color={
              value.studentsOnly ? Skoun.color.primary : Skoun.color.inkFaint
            }
          />
        </Pressable>
        <View style={[styles.chipRow, { marginTop: 8 }]}>
          {GENDER_FILTER_OPTIONS.map((g) => (
            <Chip
              key={g}
              label={labelGenderRestriction(g)}
              selected={value.genderRestrictions.includes(g)}
              onPress={() =>
                patch({
                  genderRestrictions: toggleInList(
                    value.genderRestrictions,
                    g,
                    2,
                  ),
                })
              }
            />
          ))}
        </View>
      </Section>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Clear all filters"
        onPress={() =>
          onChange({
            areas: [],
            universitySlugs: [],
            electricity: [],
            water: [],
            wifiIncluded: false,
            listingTypes: [],
            minRentUsd: null,
            maxRentUsd: null,
            studentsOnly: false,
            genderRestrictions: [],
          })
        }
        style={({ hovered }) => [styles.clearBtn, hovered && styles.clearHover]}
      >
        <LText variant="caption" tone="primary">
          Clear all filters
        </LText>
      </Pressable>
    </>
  );

  if (compact) {
    return (
      <ScrollView
        style={styles.compactScroll}
        contentContainerStyle={styles.compactContent}
        showsVerticalScrollIndicator={false}
      >
        {content}
      </ScrollView>
    );
  }

  return (
    <View style={styles.rail}>
      <LText variant="title" style={styles.railTitle}>
        Filters
      </LText>
      <ScrollView
        style={styles.railScroll}
        contentContainerStyle={styles.railContent}
        showsVerticalScrollIndicator={false}
      >
        {content}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: 280,
    flexShrink: 0,
    backgroundColor: Skoun.color.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    paddingTop: 16,
    maxHeight: "calc(100vh - 120px)" as unknown as number,
  },
  railTitle: {
    paddingHorizontal: 16,
    marginBottom: 8,
    fontSize: 17,
  },
  railScroll: {
    flex: 1,
  },
  railContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 4,
  },
  compactScroll: {
    maxHeight: 420,
  },
  compactContent: {
    paddingBottom: 8,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontSize: 11,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    backgroundColor: Skoun.color.surfaceMuted,
  },
  chipSelected: {
    backgroundColor: Skoun.color.primaryMist,
    borderColor: Skoun.color.primarySoft,
  },
  chipHover: {
    borderColor: Skoun.color.borderStrong,
  },
  chipLabel: {
    color: Skoun.color.inkMuted,
    fontSize: 12,
  },
  chipLabelSelected: {
    color: Skoun.color.primaryDeep,
    fontSize: 12,
    fontFamily: Skoun.type.bodyMedium,
  },
  input: {
    borderWidth: 1,
    borderColor: Skoun.color.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: Skoun.type.body,
    color: Skoun.color.ink,
    backgroundColor: Skoun.color.surface,
    marginBottom: 8,
    outlineStyle: "none",
  } as Record<string, unknown>,
  rentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rentInput: {
    flex: 1,
    marginBottom: 0,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    marginTop: 4,
  },
  toggleRowOn: {
    backgroundColor: Skoun.color.primaryMist,
    borderColor: Skoun.color.primarySoft,
  },
  clearBtn: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    marginTop: 4,
  },
  clearHover: {
    opacity: 0.8,
  },
});

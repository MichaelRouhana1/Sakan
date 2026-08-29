import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import {
  EMPTY_BROWSE_FILTERS,
  type BrowseFiltersValue,
} from "@/components/listings/BrowseFiltersPanel";
import {
  MAX_LISTING_AREAS,
  MAX_UNIVERSITY_SLUGS,
  useLiveLebanonAreaGroups,
} from "@/constants/areas";
import { ELECTRICITY_LABELS, WATER_LABELS } from "@/constants/utilities";
import { UniversityCampusFilter } from "@/components/listings/UniversityCampusFilter";
import { Skoun } from "@/constants/theme";
import type { University } from "@/features/universities/useUniversities";
import {
  GENDER_FILTER_OPTIONS,
  GENDER_RESTRICTION_LABELS,
  LISTING_TYPE_LABELS,
  TARGET_AUDIENCE_LABELS,
} from "@/lib/listingLabels";
import { LText } from "@/components/lister/Typography";
import type {
  ElectricityStatus,
  ListingType,
  WaterStatus,
} from "@/types/listing";

export type FilterSection =
  | "area"
  | "university"
  | "budget"
  | "roomType"
  | "utilities"
  | "audience";

type Props = {
  visible: boolean;
  applied: BrowseFiltersValue;
  universities: University[];
  universitiesLoading?: boolean;
  initialSection?: FilterSection;
  onClose: () => void;
  onApply: (next: BrowseFiltersValue) => void;
};

const SECTIONS: { id: FilterSection; label: string }[] = [
  { id: "university", label: "University" },
  { id: "budget", label: "Budget" },
  { id: "roomType", label: "Room type" },
  { id: "utilities", label: "Utilities" },
  { id: "audience", label: "Who it's for" },
  { id: "area", label: "Area" },
];

const LISTING_TYPE_OPTIONS = Object.keys(LISTING_TYPE_LABELS) as ListingType[];
const ELECTRICITY_OPTIONS = Object.keys(
  ELECTRICITY_LABELS,
) as ElectricityStatus[];
const WATER_OPTIONS = Object.keys(WATER_LABELS) as WaterStatus[];

function rentToDraft(n: number | null): string {
  return n == null ? "" : String(n);
}

function parseRentDraft(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function toggleInList<T extends string>(
  list: T[],
  value: T,
  max: number,
): T[] {
  if (list.includes(value)) return list.filter((v) => v !== value);
  if (list.length >= max) return list;
  return [...list, value];
}

/**
 * Desktop Amber-style filter dialog: left category rail + right options pane.
 * Lebanon / Skoun fields only — no move-in, guarantor, or multi-country fluff.
 */
export function FindFiltersDialog({
  visible,
  applied,
  initialSection = "area",
  onClose,
  onApply,
}: Props) {
  const [section, setSection] = useState<FilterSection>(initialSection);
  const [draftAreas, setDraftAreas] = useState(applied.areas);
  const [draftSlugs, setDraftSlugs] = useState(applied.universitySlugs);
  const [draftInstSlug, setDraftInstSlug] = useState(applied.institutionSlug);
  const [draftElectricity, setDraftElectricity] = useState(applied.electricity);
  const [draftWater, setDraftWater] = useState(applied.water);
  const [draftWifi, setDraftWifi] = useState(applied.wifiIncluded);
  const [draftTypes, setDraftTypes] = useState(applied.listingTypes);
  const [draftMinRent, setDraftMinRent] = useState(
    rentToDraft(applied.minRentUsd),
  );
  const [draftMaxRent, setDraftMaxRent] = useState(
    rentToDraft(applied.maxRentUsd),
  );
  const [draftStudentsOnly, setDraftStudentsOnly] = useState(
    applied.studentsOnly,
  );
  const [draftGender, setDraftGender] = useState(applied.genderRestrictions);
  const [rentError, setRentError] = useState<string | null>(null);
  const [areaQuery, setAreaQuery] = useState("");

  useEffect(() => {
    if (!visible) return;
    setSection(initialSection);
    setDraftAreas(applied.areas);
    setDraftSlugs(applied.universitySlugs.slice(0, MAX_UNIVERSITY_SLUGS));
    setDraftInstSlug(applied.institutionSlug);
    setDraftElectricity(applied.electricity);
    setDraftWater(applied.water);
    setDraftWifi(applied.wifiIncluded);
    setDraftTypes(applied.listingTypes);
    setDraftMinRent(rentToDraft(applied.minRentUsd));
    setDraftMaxRent(rentToDraft(applied.maxRentUsd));
    setDraftStudentsOnly(applied.studentsOnly);
    setDraftGender(applied.genderRestrictions);
    setRentError(null);
    setAreaQuery("");
  }, [visible, applied, initialSection]);

  const areaGroups = useLiveLebanonAreaGroups(areaQuery);

  const sectionTitle =
    SECTIONS.find((s) => s.id === section)?.label ?? "Filters";

  const handleClear = () => {
    setDraftAreas(EMPTY_BROWSE_FILTERS.areas);
    setDraftSlugs(EMPTY_BROWSE_FILTERS.universitySlugs);
    setDraftInstSlug(EMPTY_BROWSE_FILTERS.institutionSlug);
    setDraftElectricity(EMPTY_BROWSE_FILTERS.electricity);
    setDraftWater(EMPTY_BROWSE_FILTERS.water);
    setDraftWifi(EMPTY_BROWSE_FILTERS.wifiIncluded);
    setDraftTypes(EMPTY_BROWSE_FILTERS.listingTypes);
    setDraftMinRent("");
    setDraftMaxRent("");
    setDraftStudentsOnly(EMPTY_BROWSE_FILTERS.studentsOnly);
    setDraftGender(EMPTY_BROWSE_FILTERS.genderRestrictions);
    setRentError(null);
  };

  const handleApply = () => {
    const minRentUsd = parseRentDraft(draftMinRent);
    const maxRentUsd = parseRentDraft(draftMaxRent);
    if (draftMinRent.trim() !== "" && minRentUsd == null) {
      setSection("budget");
      setRentError("Min rent must be a positive whole number.");
      return;
    }
    if (draftMaxRent.trim() !== "" && maxRentUsd == null) {
      setSection("budget");
      setRentError("Max rent must be a positive whole number.");
      return;
    }
    if (minRentUsd != null && maxRentUsd != null && minRentUsd > maxRentUsd) {
      setSection("budget");
      setRentError("Min rent must be ≤ max rent.");
      return;
    }
    onApply({
      areas: draftAreas,
      universitySlugs: draftSlugs.slice(0, MAX_UNIVERSITY_SLUGS),
      institutionSlug: draftInstSlug,
      campusId:
        draftSlugs.length === 1 &&
        applied.campusId &&
        applied.universitySlugs[0] === draftSlugs[0]
          ? applied.campusId
          : null,
      q: draftSlugs.length > 0 || draftAreas.length > 0 ? null : applied.q,
      electricity: draftElectricity,
      water: draftWater,
      wifiIncluded: draftWifi,
      listingTypes: draftTypes,
      minRentUsd,
      maxRentUsd,
      studentsOnly: draftStudentsOnly,
      genderRestrictions: draftGender,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          accessibilityLabel="Close filters"
          onPress={onClose}
        />
        <View style={styles.dialog}>
          <View style={styles.header}>
            <LText variant="title" style={styles.headerTitle}>
              Filter
            </LText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={({ hovered }) => [
                styles.closeBtn,
                hovered && styles.closeBtnHover,
              ]}
            >
              <Ionicons name="close" size={22} color={Skoun.color.ink} />
            </Pressable>
          </View>

          <View style={styles.body}>
            <View style={styles.railCol}>
              <ScrollView
                style={styles.railScroll}
                contentContainerStyle={styles.railContent}
                showsVerticalScrollIndicator
              >
                {SECTIONS.map((item) => {
                  const active = section === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => setSection(item.id)}
                      style={({ hovered }) => [
                        styles.railItem,
                        active && styles.railItemActive,
                        hovered && !active && styles.railItemHover,
                      ]}
                    >
                      <LText
                        variant="subtitle"
                        style={[
                          styles.railLabel,
                          active && styles.railLabelActive,
                        ]}
                      >
                        {item.label}
                      </LText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.pane}>
              <LText variant="title" style={styles.paneTitle}>
                {sectionTitle}
              </LText>

              <ScrollView
                style={styles.paneScroll}
                contentContainerStyle={styles.paneScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {section === "area" ? (
                  <View style={styles.paneBlock}>
                    <View style={styles.searchWrap}>
                      <Ionicons
                        name="search-outline"
                        size={16}
                        color={Skoun.color.inkFaint}
                      />
                      <TextInput
                        value={areaQuery}
                        onChangeText={setAreaQuery}
                        placeholder="Search area"
                        placeholderTextColor={Skoun.color.inkFaint}
                        style={styles.searchInput}
                      />
                    </View>
                    <View style={styles.optionList}>
                      {areaGroups.map((group) => (
                        <View key={group.governorate} style={styles.areaGroup}>
                          <LText
                            variant="caption"
                            tone="muted"
                            style={styles.areaGroupLabel}
                          >
                            {group.governorate}
                          </LText>
                          {group.areas.map((area) => {
                            const on = draftAreas.includes(area);
                            const disabled =
                              !on && draftAreas.length >= MAX_LISTING_AREAS;
                            return (
                              <OptionRow
                                key={area}
                                label={area}
                                selected={on}
                                disabled={disabled}
                                onPress={() =>
                                  setDraftAreas((prev) =>
                                    toggleInList(prev, area, MAX_LISTING_AREAS),
                                  )
                                }
                              />
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {section === "university" ? (
                  <View style={styles.paneBlock}>
                    <UniversityCampusFilter
                      hideHeading
                      selectedCampusSlug={draftSlugs[0] ?? null}
                      selectedInstitutionSlug={draftInstSlug}
                      onSelectInstitutionSlug={setDraftInstSlug}
                      onSelectCampusSlug={(slug) =>
                        setDraftSlugs(slug ? [slug] : [])
                      }
                    />
                  </View>
                ) : null}

                {section === "budget" ? (
                  <View style={styles.paneBlock}>
                    <LText variant="caption" tone="muted">
                      Monthly rent in fresh USD
                    </LText>
                    <View style={styles.budgetRow}>
                      <View style={styles.budgetField}>
                        <LText variant="caption" style={styles.budgetLabel}>
                          Min
                        </LText>
                        <TextInput
                          value={draftMinRent}
                          onChangeText={(t) => {
                            setDraftMinRent(t);
                            setRentError(null);
                          }}
                          keyboardType="number-pad"
                          placeholder="0"
                          placeholderTextColor={Skoun.color.inkFaint}
                          style={styles.budgetInput}
                        />
                      </View>
                      <LText variant="body" tone="muted" style={styles.budgetDash}>
                        –
                      </LText>
                      <View style={styles.budgetField}>
                        <LText variant="caption" style={styles.budgetLabel}>
                          Max
                        </LText>
                        <TextInput
                          value={draftMaxRent}
                          onChangeText={(t) => {
                            setDraftMaxRent(t);
                            setRentError(null);
                          }}
                          keyboardType="number-pad"
                          placeholder="Any"
                          placeholderTextColor={Skoun.color.inkFaint}
                          style={styles.budgetInput}
                        />
                      </View>
                    </View>
                    {rentError ? (
                      <LText variant="caption" tone="danger">
                        {rentError}
                      </LText>
                    ) : null}
                  </View>
                ) : null}

                {section === "roomType" ? (
                  <View style={styles.optionList}>
                    {LISTING_TYPE_OPTIONS.map((type) => {
                      const on = draftTypes.includes(type);
                      return (
                        <OptionRow
                          key={type}
                          label={LISTING_TYPE_LABELS[type]}
                          selected={on}
                          onPress={() =>
                            setDraftTypes((prev) =>
                              toggleInList(prev, type, LISTING_TYPE_OPTIONS.length),
                            )
                          }
                        />
                      );
                    })}
                  </View>
                ) : null}

                {section === "utilities" ? (
                  <View style={styles.paneBlock}>
                    <LText variant="label" style={styles.groupLabel}>
                      Electricity
                    </LText>
                    <View style={styles.optionList}>
                      {ELECTRICITY_OPTIONS.map((value) => {
                        const on = draftElectricity.includes(value);
                        return (
                          <OptionRow
                            key={value}
                            label={ELECTRICITY_LABELS[value]}
                            selected={on}
                            onPress={() =>
                              setDraftElectricity((prev) =>
                                toggleInList(
                                  prev,
                                  value,
                                  ELECTRICITY_OPTIONS.length,
                                ),
                              )
                            }
                          />
                        );
                      })}
                    </View>
                    <LText variant="label" style={styles.groupLabel}>
                      Water
                    </LText>
                    <View style={styles.optionList}>
                      {WATER_OPTIONS.map((value) => {
                        const on = draftWater.includes(value);
                        return (
                          <OptionRow
                            key={value}
                            label={WATER_LABELS[value]}
                            selected={on}
                            onPress={() =>
                              setDraftWater((prev) =>
                                toggleInList(prev, value, WATER_OPTIONS.length),
                              )
                            }
                          />
                        );
                      })}
                    </View>
                    <LText variant="label" style={styles.groupLabel}>
                      Wi‑Fi
                    </LText>
                    <OptionRow
                      label="Wi‑Fi included"
                      selected={draftWifi}
                      onPress={() => setDraftWifi((v) => !v)}
                    />
                  </View>
                ) : null}

                {section === "audience" ? (
                  <View style={styles.paneBlock}>
                    <OptionRow
                      label={TARGET_AUDIENCE_LABELS.students_only}
                      selected={draftStudentsOnly}
                      onPress={() => setDraftStudentsOnly((v) => !v)}
                    />
                    <LText variant="label" style={styles.groupLabel}>
                      Gender
                    </LText>
                    <View style={styles.optionList}>
                      {GENDER_FILTER_OPTIONS.map((value) => {
                        const on = draftGender.includes(value);
                        return (
                          <OptionRow
                            key={value}
                            label={GENDER_RESTRICTION_LABELS[value]}
                            selected={on}
                            onPress={() =>
                              setDraftGender((prev) =>
                                toggleInList(
                                  prev,
                                  value,
                                  GENDER_FILTER_OPTIONS.length,
                                ),
                              )
                            }
                          />
                        );
                      })}
                    </View>
                  </View>
                ) : null}
              </ScrollView>
            </View>
          </View>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={handleClear}
              style={({ hovered }) => [
                styles.clearBtn,
                hovered && styles.clearBtnHover,
              ]}
            >
              <LText variant="subtitle" style={styles.clearLabel}>
                Clear all
              </LText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={handleApply}
              style={({ hovered, pressed }) => [
                styles.applyBtn,
                (hovered || pressed) && styles.applyBtnHover,
              ]}
            >
              <LText variant="subtitle" style={styles.applyLabel}>
                Show results
              </LText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function OptionRow({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ hovered }) => [
        styles.optionRow,
        selected && styles.optionRowOn,
        hovered && !disabled && styles.optionRowHover,
        disabled && styles.optionRowDisabled,
      ]}
    >
      <LText
        variant="body"
        style={[styles.optionLabel, selected && styles.optionLabelOn]}
      >
        {label}
      </LText>
      <View style={[styles.check, selected && styles.checkOn]}>
        {selected ? (
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(18, 24, 38, 0.45)",
  },
  dialog: {
    width: "min(920px, 100%)" as unknown as number,
    maxHeight: "min(720px, 88vh)" as unknown as number,
    backgroundColor: Skoun.color.surface,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#121826",
    shadowOpacity: 0.18,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
    zIndex: 2,
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: Skoun.color.border,
  },
  headerTitle: {
    fontSize: 22,
    color: Skoun.color.primaryDeep,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnHover: {
    backgroundColor: Skoun.color.surfaceMuted,
  },
  body: {
    flexDirection: "row",
    flex: 1,
    minHeight: 360,
    maxHeight: 520,
  },
  railCol: {
    width: 200,
    flexGrow: 0,
    flexShrink: 0,
    borderRightWidth: 1,
    borderRightColor: Skoun.color.border,
    backgroundColor: Skoun.color.surfaceMuted,
  },
  railScroll: {
    flex: 1,
  },
  railContent: {
    paddingVertical: 12,
  },
  railItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  railItemActive: {
    backgroundColor: Skoun.color.surface,
  },
  railItemHover: {
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  railLabel: {
    fontSize: 15,
    color: Skoun.color.inkMuted,
    fontFamily: Skoun.type.bodyMedium,
  },
  railLabelActive: {
    color: Skoun.color.primary,
    fontFamily: Skoun.type.bodyBold,
  },
  pane: {
    flex: 1,
    flexGrow: 1,
    minWidth: 0,
    paddingTop: 20,
    paddingHorizontal: 28,
  },
  paneTitle: {
    fontSize: 20,
    color: Skoun.color.primaryDeep,
    marginBottom: 16,
  },
  paneScroll: {
    flex: 1,
  },
  paneScrollContent: {
    paddingBottom: 24,
    gap: 12,
  },
  paneBlock: {
    gap: 12,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Skoun.color.surface,
  },
  searchInput: {
    flex: 1,
    fontFamily: Skoun.type.body,
    fontSize: 14,
    color: Skoun.color.ink,
    padding: 0,
  },
  optionList: {
    gap: 4,
  },
  areaGroup: {
    gap: 4,
    marginBottom: 8,
  },
  areaGroupLabel: {
    marginTop: 4,
    marginBottom: 2,
    fontFamily: Skoun.type.bodyMedium,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  optionRowOn: {
    backgroundColor: Skoun.color.primaryMist,
  },
  optionRowHover: {
    backgroundColor: Skoun.color.surfaceMuted,
  },
  optionRowDisabled: {
    opacity: 0.4,
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    color: Skoun.color.ink,
  },
  optionLabelOn: {
    color: Skoun.color.primaryDeep,
    fontFamily: Skoun.type.bodyMedium,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Skoun.color.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  checkOn: {
    backgroundColor: Skoun.color.primary,
    borderColor: Skoun.color.primary,
  },
  budgetRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    marginTop: 4,
  },
  budgetField: {
    flex: 1,
    gap: 6,
  },
  budgetLabel: {
    color: Skoun.color.inkMuted,
    fontFamily: Skoun.type.bodyMedium,
  },
  budgetInput: {
    borderWidth: 1,
    borderColor: Skoun.color.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Skoun.type.body,
    fontSize: 16,
    color: Skoun.color.ink,
    backgroundColor: Skoun.color.surface,
  },
  budgetDash: {
    paddingBottom: 14,
  },
  groupLabel: {
    marginTop: 8,
    color: Skoun.color.inkFaint,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Skoun.color.border,
    gap: 16,
  },
  clearBtn: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  clearBtnHover: {
    opacity: 0.75,
  },
  clearLabel: {
    color: Skoun.color.ink,
    fontFamily: Skoun.type.bodyMedium,
  },
  applyBtn: {
    backgroundColor: Skoun.color.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    minWidth: 200,
    alignItems: "center",
  },
  applyBtnHover: {
    backgroundColor: Skoun.color.primaryDeep,
  },
  applyLabel: {
    color: "#FFFFFF",
    fontFamily: Skoun.type.bodyBold,
  },
});

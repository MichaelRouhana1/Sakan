import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LButton } from "@/components/lister/Button";
import { LText } from "@/components/lister/Typography";
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
  GENDER_RESTRICTION_LABELS,
  LISTING_TYPE_LABELS,
  TARGET_AUDIENCE_LABELS,
} from "@/lib/listingLabels";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type {
  ElectricityStatus,
  ListingType,
  WaterStatus,
} from "@/types/listing";

export type BrowseFiltersValue = {
  areas: string[];
  universitySlugs: string[];
  electricity: ElectricityStatus[];
  water: WaterStatus[];
  /** true = Wi‑Fi included only; false = any. */
  wifiIncluded: boolean;
  listingTypes: ListingType[];
  minRentUsd: number | null;
  maxRentUsd: number | null;
  /** true = students_only only; false = any audience. */
  studentsOnly: boolean;
  /** Empty = any gender; otherwise gender_restriction IN (...). */
  genderRestrictions: ("boys_only" | "girls_only")[];
};

export const EMPTY_BROWSE_FILTERS: BrowseFiltersValue = {
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
};

const ELECTRICITY_OPTIONS = Object.keys(
  ELECTRICITY_LABELS,
) as ElectricityStatus[];
const WATER_OPTIONS = Object.keys(WATER_LABELS) as WaterStatus[];
const LISTING_TYPE_OPTIONS = Object.keys(LISTING_TYPE_LABELS) as ListingType[];

type Props = {
  visible: boolean;
  mode: SearchMode;
  applied: BrowseFiltersValue;
  universities: University[];
  universitiesLoading?: boolean;
  onClose: () => void;
  onApply: (next: BrowseFiltersValue) => void;
};

const SLIDE_MS = 300;

function toggleInList<T extends string>(
  list: T[],
  value: T,
  max: number,
): T[] {
  if (list.includes(value)) {
    return list.filter((v) => v !== value);
  }
  if (list.length >= max) return list;
  return [...list, value];
}

/** Single-select: tap selects this slug only; tap again clears. */
function selectOne(list: string[], value: string): string[] {
  if (list.includes(value)) return [];
  return [value];
}

function sameStringSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const other = new Set(b);
  return a.every((v) => other.has(v));
}

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

function sameBrowseFilters(
  a: BrowseFiltersValue,
  b: BrowseFiltersValue,
): boolean {
  return (
    sameStringSet(a.areas, b.areas) &&
    sameStringSet(
      a.universitySlugs.slice(0, MAX_UNIVERSITY_SLUGS),
      b.universitySlugs.slice(0, MAX_UNIVERSITY_SLUGS),
    ) &&
    sameStringSet(a.electricity, b.electricity) &&
    sameStringSet(a.water, b.water) &&
    sameStringSet(a.listingTypes, b.listingTypes) &&
    a.wifiIncluded === b.wifiIncluded &&
    a.studentsOnly === b.studentsOnly &&
    sameStringSet(a.genderRestrictions, b.genderRestrictions) &&
    a.minRentUsd === b.minRentUsd &&
    a.maxRentUsd === b.maxRentUsd
  );
}

/** Count active filter chips / toggles for the Filters badge. */
export function browseFilterBadgeCount(
  value: BrowseFiltersValue,
  mode: SearchMode,
): number {
  return (
    value.areas.length +
    (mode === "university" ? value.universitySlugs.length : 0) +
    value.electricity.length +
    value.water.length +
    (value.wifiIncluded ? 1 : 0) +
    value.listingTypes.length +
    (value.minRentUsd != null || value.maxRentUsd != null ? 1 : 0) +
    (value.studentsOnly ? 1 : 0) +
    value.genderRestrictions.length
  );
}

function FilterToggle({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={onToggle}
      style={[styles.toggle, value && styles.toggleOn]}
    >
      <LText
        variant="caption"
        style={value ? styles.toggleLabelOn : styles.toggleLabel}
      >
        {label}
      </LText>
      <View style={[styles.switchTrack, value && styles.switchTrackOn]}>
        <View style={[styles.switchKnob, value && styles.switchKnobOn]} />
      </View>
    </Pressable>
  );
}

/**
 * Full-screen Filters panel — slides in from the left.
 * Dirty close confirms discard; Clear resets draft; Apply commits + closes.
 */
export function BrowseFiltersPanel({
  visible,
  mode,
  applied,
  universities,
  universitiesLoading,
  onClose,
  onApply,
}: Props) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const screenW = Dimensions.get("window").width;
  const translateX = useRef(new Animated.Value(-screenW)).current;
  const [mounted, setMounted] = useState(visible);

  const [draftAreas, setDraftAreas] = useState<string[]>(applied.areas);
  const [draftSlugs, setDraftSlugs] = useState<string[]>(
    applied.universitySlugs,
  );
  const [draftElectricity, setDraftElectricity] = useState<
    ElectricityStatus[]
  >(applied.electricity);
  const [draftWater, setDraftWater] = useState<WaterStatus[]>(applied.water);
  const [draftWifi, setDraftWifi] = useState(applied.wifiIncluded);
  const [draftTypes, setDraftTypes] = useState<ListingType[]>(
    applied.listingTypes,
  );
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
  const [uniQuery, setUniQuery] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const draftValue: BrowseFiltersValue = useMemo(
    () => ({
      areas: draftAreas,
      universitySlugs: draftSlugs.slice(0, MAX_UNIVERSITY_SLUGS),
      electricity: draftElectricity,
      water: draftWater,
      wifiIncluded: draftWifi,
      listingTypes: draftTypes,
      minRentUsd: parseRentDraft(draftMinRent),
      maxRentUsd: parseRentDraft(draftMaxRent),
      studentsOnly: draftStudentsOnly,
      genderRestrictions: draftGender,
    }),
    [
      draftAreas,
      draftSlugs,
      draftElectricity,
      draftWater,
      draftWifi,
      draftTypes,
      draftMinRent,
      draftMaxRent,
      draftStudentsOnly,
      draftGender,
    ],
  );

  // Sync draft from applied when opening.
  useEffect(() => {
    if (!visible) return;
    setDraftAreas(applied.areas);
    setDraftSlugs(applied.universitySlugs.slice(0, MAX_UNIVERSITY_SLUGS));
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
    setUniQuery("");
    setConfirmDiscard(false);
  }, [visible, applied]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateX.setValue(reduceMotion ? 0 : -screenW);
      Animated.timing(translateX, {
        toValue: 0,
        duration: reduceMotion ? 0 : SLIDE_MS,
        useNativeDriver: true,
      }).start();
      return;
    }
    if (!mounted) return;
    Animated.timing(translateX, {
      toValue: -screenW,
      duration: reduceMotion ? 0 : SLIDE_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
    // Intentionally omit `mounted` — including it restarts the open animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion, screenW, translateX]);

  const filteredAreas = useMemo(() => {
    const q = areaQuery.trim().toLowerCase();
    if (!q) return [...LEBANON_AREAS];
    return LEBANON_AREAS.filter((a) => a.toLowerCase().includes(q));
  }, [areaQuery]);

  const filteredUnis = useMemo(() => {
    const q = uniQuery.trim().toLowerCase();
    if (!q) return universities;
    return universities.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.slug.toLowerCase().includes(q),
    );
  }, [universities, uniQuery]);

  const areasAtCap = draftAreas.length >= MAX_LISTING_AREAS;
  const isDirty = !sameBrowseFilters(draftValue, {
    ...applied,
    universitySlugs: applied.universitySlugs.slice(0, MAX_UNIVERSITY_SLUGS),
  });

  const handleClose = () => {
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  };

  const handleDiscard = () => {
    setConfirmDiscard(false);
    onClose();
  };

  const handleKeepEditing = () => {
    setConfirmDiscard(false);
  };

  const handleRequestClose = () => {
    if (confirmDiscard) {
      handleKeepEditing();
      return;
    }
    handleClose();
  };

  const handleClear = () => {
    setDraftAreas([]);
    setDraftSlugs([]);
    setDraftElectricity([]);
    setDraftWater([]);
    setDraftWifi(false);
    setDraftTypes([]);
    setDraftMinRent("");
    setDraftMaxRent("");
    setDraftStudentsOnly(false);
    setDraftGender([]);
    setRentError(null);
  };

  const handleApply = () => {
    const minRentUsd = parseRentDraft(draftMinRent);
    const maxRentUsd = parseRentDraft(draftMaxRent);
    if (
      draftMinRent.trim() !== "" &&
      minRentUsd == null
    ) {
      setRentError("Min rent must be a positive whole number.");
      return;
    }
    if (
      draftMaxRent.trim() !== "" &&
      maxRentUsd == null
    ) {
      setRentError("Max rent must be a positive whole number.");
      return;
    }
    if (minRentUsd != null && maxRentUsd != null && minRentUsd > maxRentUsd) {
      setRentError("Min rent must be ≤ max rent.");
      return;
    }
    setRentError(null);
    setConfirmDiscard(false);
    onApply({
      areas: draftAreas,
      universitySlugs: draftSlugs.slice(0, MAX_UNIVERSITY_SLUGS),
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

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={handleRequestClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss filters"
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
        />
        <Animated.View
          style={[
            styles.panel,
            {
              paddingTop: insets.top + 8,
              paddingBottom: Math.max(insets.bottom, 12),
              transform: [{ translateX }],
            },
          ]}
          accessibilityViewIsModal
        >
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close filters"
              onPress={handleClose}
              hitSlop={12}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={24} color={Skoun.color.ink} />
            </Pressable>
            <LText variant="subtitle" style={styles.headerTitle}>
              Filters
            </LText>
            <View style={styles.closeBtn} />
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <LText variant="label" tone="muted" style={styles.sectionLabel}>
              Cities
            </LText>
            <LText variant="caption" tone="muted" style={styles.sectionHint}>
              {mode === "university"
                ? "Optional — narrow Hub results to these areas."
                : "Leave empty for all cities. Pick up to 15."}
            </LText>
            <TextInput
              style={styles.search}
              placeholder="Search cities…"
              placeholderTextColor={Skoun.color.inkFaint}
              value={areaQuery}
              onChangeText={setAreaQuery}
              accessibilityLabel="Search cities"
            />
            <View style={styles.chipWrap}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: draftAreas.length === 0 }}
                onPress={() => setDraftAreas([])}
                style={[
                  styles.chip,
                  draftAreas.length === 0 && styles.chipOn,
                ]}
              >
                <LText
                  variant="caption"
                  style={
                    draftAreas.length === 0
                      ? styles.chipLabelOn
                      : styles.chipLabel
                  }
                >
                  All cities
                </LText>
              </Pressable>
              {filteredAreas.map((area) => {
                const on = draftAreas.includes(area);
                const disabled = !on && areasAtCap;
                return (
                  <Pressable
                    key={area}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on, disabled }}
                    disabled={disabled}
                    onPress={() =>
                      setDraftAreas((prev) =>
                        toggleInList(prev, area, MAX_LISTING_AREAS),
                      )
                    }
                    style={[
                      styles.chip,
                      on && styles.chipOn,
                      disabled && styles.chipDisabled,
                    ]}
                  >
                    <LText
                      variant="caption"
                      style={on ? styles.chipLabelOn : styles.chipLabel}
                    >
                      {area}
                    </LText>
                  </Pressable>
                );
              })}
            </View>

            {mode === "university" ? (
              <View style={styles.blockSection}>
                <LText
                  variant="label"
                  tone="muted"
                  style={styles.sectionLabel}
                >
                  Universities
                </LText>
                <LText
                  variant="caption"
                  tone="muted"
                  style={styles.sectionHint}
                >
                  Optional — pick one campus to order results by distance to
                  the gate. Leave empty to browse all cities.
                </LText>
                <TextInput
                  style={styles.search}
                  placeholder="Search universities…"
                  placeholderTextColor={Skoun.color.inkFaint}
                  value={uniQuery}
                  onChangeText={setUniQuery}
                  accessibilityLabel="Search universities"
                />
                {universitiesLoading ? (
                  <LText variant="caption" tone="muted">
                    Loading campuses…
                  </LText>
                ) : (
                  <View style={styles.chipWrap}>
                    {filteredUnis.map((u) => {
                      const on = draftSlugs.includes(u.slug);
                      return (
                        <Pressable
                          key={u.slug}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: on }}
                          onPress={() =>
                            setDraftSlugs((prev) => selectOne(prev, u.slug))
                          }
                          style={[styles.chip, on && styles.chipOn]}
                        >
                          <LText
                            variant="caption"
                            style={on ? styles.chipLabelOn : styles.chipLabel}
                          >
                            {u.name}
                          </LText>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : null}

            <View style={styles.blockSection}>
              <LText variant="label" tone="muted" style={styles.sectionLabel}>
                Listing type
              </LText>
              <View style={styles.chipWrap}>
                {LISTING_TYPE_OPTIONS.map((key) => {
                  const on = draftTypes.includes(key);
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      onPress={() =>
                        setDraftTypes((prev) =>
                          toggleInList(prev, key, LISTING_TYPE_OPTIONS.length),
                        )
                      }
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <LText
                        variant="caption"
                        style={on ? styles.chipLabelOn : styles.chipLabel}
                      >
                        {LISTING_TYPE_LABELS[key]}
                      </LText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.blockSection}>
              <LText variant="label" tone="muted" style={styles.sectionLabel}>
                Rent (USD / month)
              </LText>
              <LText variant="caption" tone="muted" style={styles.sectionHint}>
                Leave blank for no bound.
              </LText>
              <View style={styles.rentRow}>
                <View style={styles.rentField}>
                  <LText variant="caption" tone="muted">
                    Min
                  </LText>
                  <TextInput
                    style={styles.rentInput}
                    value={draftMinRent}
                    onChangeText={(t) => {
                      setDraftMinRent(t.replace(/[^\d]/g, ""));
                      setRentError(null);
                    }}
                    keyboardType="number-pad"
                    placeholder="Any"
                    placeholderTextColor={Skoun.color.inkFaint}
                    accessibilityLabel="Minimum monthly rent"
                  />
                </View>
                <View style={styles.rentField}>
                  <LText variant="caption" tone="muted">
                    Max
                  </LText>
                  <TextInput
                    style={styles.rentInput}
                    value={draftMaxRent}
                    onChangeText={(t) => {
                      setDraftMaxRent(t.replace(/[^\d]/g, ""));
                      setRentError(null);
                    }}
                    keyboardType="number-pad"
                    placeholder="Any"
                    placeholderTextColor={Skoun.color.inkFaint}
                    accessibilityLabel="Maximum monthly rent"
                  />
                </View>
              </View>
              {rentError ? (
                <LText variant="caption" tone="danger" style={styles.rentError}>
                  {rentError}
                </LText>
              ) : null}
            </View>

            <View style={styles.blockSection}>
              <LText variant="label" tone="muted" style={styles.sectionLabel}>
                Electricity
              </LText>
              <View style={styles.chipWrap}>
                {ELECTRICITY_OPTIONS.map((key) => {
                  const on = draftElectricity.includes(key);
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      onPress={() =>
                        setDraftElectricity((prev) =>
                          toggleInList(prev, key, ELECTRICITY_OPTIONS.length),
                        )
                      }
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <LText
                        variant="caption"
                        style={on ? styles.chipLabelOn : styles.chipLabel}
                      >
                        {ELECTRICITY_LABELS[key]}
                      </LText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.blockSection}>
              <LText variant="label" tone="muted" style={styles.sectionLabel}>
                Water
              </LText>
              <View style={styles.chipWrap}>
                {WATER_OPTIONS.map((key) => {
                  const on = draftWater.includes(key);
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      onPress={() =>
                        setDraftWater((prev) =>
                          toggleInList(prev, key, WATER_OPTIONS.length),
                        )
                      }
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <LText
                        variant="caption"
                        style={on ? styles.chipLabelOn : styles.chipLabel}
                      >
                        {WATER_LABELS[key]}
                      </LText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.blockSection}>
              <LText variant="label" tone="muted" style={styles.sectionLabel}>
                Gender
              </LText>
              <LText variant="caption" tone="muted" style={styles.sectionHint}>
                Leave empty for any gender.
              </LText>
              <View style={styles.chipWrap}>
                {GENDER_FILTER_OPTIONS.map((key) => {
                  const on = draftGender.includes(key);
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      onPress={() =>
                        setDraftGender((prev) =>
                          toggleInList(prev, key, GENDER_FILTER_OPTIONS.length),
                        )
                      }
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <LText
                        variant="caption"
                        style={on ? styles.chipLabelOn : styles.chipLabel}
                      >
                        {GENDER_RESTRICTION_LABELS[key]}
                      </LText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.blockSection}>
              <LText variant="label" tone="muted" style={styles.sectionLabel}>
                Extras
              </LText>
              <View style={styles.toggleStack}>
                <FilterToggle
                  label="Wi‑Fi included"
                  value={draftWifi}
                  onToggle={() => setDraftWifi((v) => !v)}
                />
                <FilterToggle
                  label={TARGET_AUDIENCE_LABELS.students_only}
                  value={draftStudentsOnly}
                  onToggle={() => setDraftStudentsOnly((v) => !v)}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <LButton
              label="Clear"
              variant="ghost"
              onPress={handleClear}
              style={styles.footerBtn}
            />
            <LButton
              label="Apply"
              variant="primary"
              onPress={handleApply}
              style={styles.footerBtnPrimary}
            />
          </View>

          {confirmDiscard ? (
            <View
              style={styles.confirmLayer}
              accessibilityViewIsModal
              accessibilityLabel="Discard changes?"
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Keep editing"
                style={StyleSheet.absoluteFill}
                onPress={handleKeepEditing}
              />
              <View style={styles.confirmCard}>
                <LText variant="subtitle">Discard changes?</LText>
                <LText variant="body" tone="muted" style={styles.confirmBody}>
                  You have unsaved filter edits. Closing will revert to what’s
                  applied.
                </LText>
                <View style={styles.confirmActions}>
                  <LButton
                    label="Keep editing"
                    variant="secondary"
                    onPress={handleKeepEditing}
                    style={styles.confirmBtn}
                  />
                  <LButton
                    label="Discard"
                    variant="ghost"
                    onPress={handleDiscard}
                    style={styles.confirmBtn}
                  />
                </View>
              </View>
            </View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Skoun.color.overlay,
  },
  panel: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: "100%",
    backgroundColor: Skoun.color.bg,
    borderRightWidth: 1,
    borderRightColor: Skoun.color.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Skoun.space.md,
    paddingBottom: Skoun.space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Skoun.color.border,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: Skoun.type.displayMedium,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Skoun.space.lg,
    paddingTop: Skoun.space.md,
    paddingBottom: Skoun.space.xl,
    gap: 6,
  },
  blockSection: {
    marginTop: Skoun.space.lg,
    gap: 6,
  },
  sectionLabel: {
    marginTop: Skoun.space.sm,
    marginBottom: 2,
  },
  sectionHint: {
    marginBottom: 8,
  },
  search: {
    backgroundColor: Skoun.color.surface,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    borderRadius: Skoun.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Skoun.type.body,
    fontSize: 15,
    color: Skoun.color.ink,
    marginBottom: 8,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: Skoun.color.surface,
    borderRadius: Skoun.radius.pill,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  chipOn: {
    backgroundColor: Skoun.color.primary,
    borderColor: Skoun.color.primary,
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipLabel: {
    color: Skoun.color.ink,
    fontFamily: Skoun.type.bodyMedium,
  },
  chipLabelOn: {
    color: Skoun.color.surface,
    fontFamily: Skoun.type.bodySemi,
  },
  rentRow: {
    flexDirection: "row",
    gap: 10,
  },
  rentField: {
    flex: 1,
    gap: 4,
  },
  rentInput: {
    backgroundColor: Skoun.color.surface,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    borderRadius: Skoun.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Skoun.type.body,
    fontSize: 15,
    color: Skoun.color.ink,
  },
  rentError: {
    marginTop: 4,
  },
  toggleStack: {
    gap: 8,
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Skoun.color.surface,
    borderRadius: Skoun.radius.md,
    borderWidth: 1,
    borderColor: Skoun.color.border,
  },
  toggleOn: {
    borderColor: Skoun.color.primarySoft,
    backgroundColor: Skoun.color.primaryMist,
  },
  toggleLabel: {
    color: Skoun.color.ink,
    fontFamily: Skoun.type.bodyMedium,
    flex: 1,
  },
  toggleLabelOn: {
    color: Skoun.color.primaryDeep,
    fontFamily: Skoun.type.bodySemi,
    flex: 1,
  },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: Skoun.color.border,
    padding: 3,
    justifyContent: "center",
  },
  switchTrackOn: {
    backgroundColor: Skoun.color.primary,
  },
  switchKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Skoun.color.surface,
  },
  switchKnobOn: {
    alignSelf: "flex-end",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: Skoun.space.lg,
    paddingTop: Skoun.space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Skoun.color.border,
    backgroundColor: Skoun.color.bg,
  },
  footerBtn: {
    flex: 0.4,
  },
  footerBtnPrimary: {
    flex: 1,
  },
  confirmLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Skoun.color.overlay,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Skoun.space.lg,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: Skoun.color.surface,
    borderRadius: Skoun.radius.lg,
    borderWidth: 1,
    borderColor: Skoun.color.border,
    padding: Skoun.space.lg,
    gap: 10,
  },
  confirmBody: {
    marginBottom: 4,
  },
  confirmActions: {
    gap: 8,
    marginTop: 4,
  },
  confirmBtn: {
    width: "100%",
  },
});

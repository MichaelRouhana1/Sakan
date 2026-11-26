import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDesktopDesign, useLayoutWidth } from "@/components/ui/DesktopDesign";
import { Enter } from "@/components/lister/Enter";
import { LText } from "@/components/lister/Typography";
import { AreaDropdownPortal } from "@/components/listings/create/AreaDropdownPortal";
import { LockedCluster } from "@/components/listings/create/LockedCluster";
import { LocationPicker } from "@/components/listings/LocationPicker";
import { SegmentedPills } from "@/components/listings/create/SegmentedPills";
import { WizardCampusSearch } from "@/components/listings/create/WizardCampusSearch";
import {
  WizardFieldLabel,
  useWizardFieldInvalid,
  wizardInputStyle,
} from "@/components/listings/create/WizardField";
import { LEBANON_AREAS, type LebanonArea } from "@/constants/areas";
import { LEBANON_ZONE_TREE } from "@/constants/lebanonZones";
import { Lister } from "@/constants/listerTheme";
import { useListingForm } from "@/features/listings/forms/ListingFormContext";
import { useUniversities } from "@/features/universities/useUniversities";
import { formatCampusWalkLine } from "@/lib/listingCardMeta";
import { useReducedMotion } from "@/lib/useReducedMotion";

export type LocationLook = "1" | "2";

const LOOK_STORAGE_KEY = "studently.locationVariant";
const LOOK_VARIANTS: readonly LocationLook[] = ["1", "2"];

function readInitialLocationLook(): LocationLook {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    try {
      const saved = window.localStorage.getItem(LOOK_STORAGE_KEY);
      if (saved === "1" || saved === "2") return saved;
    } catch {
      /* ignore private mode */
    }
  }
  return "2";
}

export function useLocationLook(): [LocationLook, (next: LocationLook) => void] {
  const [look, setLookState] = useState<LocationLook>(readInitialLocationLook);

  function setLook(next: LocationLook) {
    setLookState(next);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LOOK_STORAGE_KEY, next);
      } catch {
        /* ignore private mode */
      }
    }
  }

  return [look, setLook];
}

export function LocationLookToggle({
  look,
  onChange,
}: {
  look: LocationLook;
  onChange: (next: LocationLook) => void;
}) {
  const { styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);

  return (
    <View
      testID="location-look-toggle"
      accessibilityRole="radiogroup"
      accessibilityLabel="Location step design variant"
      style={styles.toggleTrack}
    >
      {LOOK_VARIANTS.map((mode) => {
        const active = look === mode;
        return (
          <Pressable
            key={mode}
            accessibilityRole="radio"
            accessibilityLabel={`Design ${mode}`}
            accessibilityState={{ checked: active }}
            onPress={() => onChange(mode)}
            style={[styles.toggleItem, active && styles.toggleItemActive]}
          >
            <LText
              variant="caption"
              style={[styles.toggleLabel, active && styles.toggleLabelActive]}
            >
              {mode}
            </LText>
          </Pressable>
        );
      })}
    </View>
  );
}

type RegionKey = "beirut" | "mount-lebanon" | "other";

type AreaItem = {
  area: LebanonArea;
  district: string;
  governorate: string;
  arabicGovernorate: string;
  region: RegionKey;
};

const ALL_AREA_ITEMS: AreaItem[] = LEBANON_ZONE_TREE.flatMap((gov) => {
  const region: RegionKey =
    gov.slug === "beirut"
      ? "beirut"
      : gov.slug === "mount-lebanon"
        ? "mount-lebanon"
        : "other";
  return gov.districts.flatMap((district) =>
    district.neighborhoods.map((name) => ({
      area: name as LebanonArea,
      district: district.name,
      governorate: gov.name,
      arabicGovernorate: gov.arabicName,
      region,
    })),
  );
});

const REGION_COUNTS: Record<RegionKey, number> = {
  beirut: ALL_AREA_ITEMS.filter((i) => i.region === "beirut").length,
  "mount-lebanon": ALL_AREA_ITEMS.filter((i) => i.region === "mount-lebanon").length,
  other: ALL_AREA_ITEMS.filter((i) => i.region === "other").length,
};

const REGION_TABS: { key: RegionKey; label: string; shortLabel: string; count: number }[] = [
  { key: "beirut", label: "Beirut", shortLabel: "Beirut", count: REGION_COUNTS.beirut },
  {
    key: "mount-lebanon",
    label: "Mount Lebanon",
    shortLabel: "Mt. Lebanon",
    count: REGION_COUNTS["mount-lebanon"],
  },
  { key: "other", label: "Other regions", shortLabel: "Other", count: REGION_COUNTS.other },
];

function areaItemFor(area: string | null | undefined): AreaItem | null {
  if (!area) return null;
  return ALL_AREA_ITEMS.find((item) => item.area === area) ?? null;
}

function pairItems<T>(items: T[]): [T, T | null][] {
  const rows: [T, T | null][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push([items[i], items[i + 1] ?? null]);
  }
  return rows;
}

function regionForArea(area: string | null | undefined): RegionKey {
  return areaItemFor(area)?.region ?? "beirut";
}

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function CreateStepLocation({ look = "2" }: { look?: LocationLook }) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  const layoutWidth = useLayoutWidth();
  const sideBySide = layoutWidth >= 480;
  const reducedMotion = useReducedMotion();

  const { draft, patch } = useListingForm();
  const areaInvalid = useWizardFieldInvalid("area");
  const pinInvalid = useWizardFieldInvalid("pin");
  const campusInvalid = useWizardFieldInvalid("primaryCampusId");
  const campuses = useUniversities();
  const uni = (campuses.data ?? []).find((c) => c.id === draft.primaryCampusId);
  const walk =
    draft.pin.confirmed && uni?.lat != null && uni.lng != null
      ? formatCampusWalkLine(
          haversineMeters(
            { lat: draft.pin.lat, lng: draft.pin.lng },
            { lat: uni.lat, lng: uni.lng },
          ),
          uni.displayName ?? uni.name,
        )
      : null;

  const [region, setRegion] = useState<RegionKey>(() => regionForArea(draft.area));
  const [areaQuery, setAreaQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [focusedField, setFocusedField] = useState<"building" | "street" | "area" | null>(
    null,
  );
  const areaTriggerRef = useRef<View | null>(null);
  const areaSearchRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (draft.area) {
      setRegion(regionForArea(draft.area));
    }
  }, [draft.area]);

  useEffect(() => {
    if (!dropdownOpen || Platform.OS !== "web" || layoutWidth < 600) return;
    const frame = requestAnimationFrame(() => {
      areaSearchRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [dropdownOpen, layoutWidth]);

  const closeDropdown = useCallback(() => {
    setDropdownOpen(false);
    setAreaQuery("");
  }, []);

  const trimmedQuery = areaQuery.trim();
  const isSearching = trimmedQuery.length > 0;
  const compactTabs = layoutWidth < 400;
  const twoColGrid = layoutWidth >= 360;

  const selectedItem = useMemo(() => areaItemFor(draft.area), [draft.area]);

  const selectedTriggerContext = useMemo(() => {
    if (!selectedItem) return null;
    if (selectedItem.region === "beirut") return "Beirut";
    if (selectedItem.region === "mount-lebanon") {
      return selectedItem.district !== selectedItem.area
        ? `${selectedItem.district}, Mount Lebanon`
        : "Mount Lebanon";
    }
    return selectedItem.governorate !== selectedItem.area
      ? selectedItem.governorate
      : `${selectedItem.governorate} Governorate`;
  }, [selectedItem]);

  const searchMatches = useMemo(() => {
    if (!isSearching) return [];
    const q = trimmedQuery.toLowerCase();
    return ALL_AREA_ITEMS.filter(
      (item) =>
        item.area.toLowerCase().includes(q) ||
        item.district.toLowerCase().includes(q) ||
        item.governorate.toLowerCase().includes(q) ||
        item.arabicGovernorate.includes(trimmedQuery),
    );
  }, [isSearching, trimmedQuery]);

  const directoryGroups = useMemo(() => {
    if (isSearching) {
      return [{ id: "search", heading: null as string | null, items: searchMatches }];
    }
    if (region === "mount-lebanon") {
      const gov = LEBANON_ZONE_TREE.find((g) => g.slug === "mount-lebanon");
      return (gov?.districts ?? []).map((district) => ({
        id: district.slug,
        heading: district.name,
        items: ALL_AREA_ITEMS.filter(
          (item) => item.region === "mount-lebanon" && item.district === district.name,
        ),
      }));
    }
    return [
      {
        id: region,
        heading: null as string | null,
        items: ALL_AREA_ITEMS.filter((item) => item.region === region),
      },
    ];
  }, [isSearching, region, searchMatches]);

  function selectArea(item: AreaItem) {
    patch({ area: item.area });
    setRegion(item.region);
    setAreaQuery("");
    setDropdownOpen(false);
  }

  function submitAreaSearch() {
    if (!isSearching || searchMatches.length === 0) return;
    const exact = searchMatches.find(
      (item) => item.area.toLowerCase() === trimmedQuery.toLowerCase(),
    );
    if (exact) {
      selectArea(exact);
    } else if (searchMatches.length === 1) {
      selectArea(searchMatches[0]);
    }
  }

  /* Design 1: Original location step */
  if (look === "1") {
    return (
      <LockedCluster
        fields={[
          "area",
          "pin",
          "landmark",
          "addressLine",
          "buildingName",
          "primaryCampusId",
        ]}
      >
        <View style={{ gap: designSize(16) }}>
          <Enter>
            <WizardFieldLabel required>Area</WizardFieldLabel>
            <View style={{ height: designSize(8) }} />
            <SegmentedPills
              options={LEBANON_AREAS.map((a) => ({ value: a, label: a }))}
              value={draft.area}
              error={areaInvalid}
              onChange={(v) => patch({ area: v as LebanonArea })}
            />
          </Enter>
          <Enter delay={70}>
            <LText variant="subtitle">Building & street</LText>
            <TextInput
              accessibilityLabel="Building name"
              placeholder="Building name"
              placeholderTextColor={Lister.color.inkFaint}
              value={draft.buildingName}
              onChangeText={(buildingName) => patch({ buildingName })}
              style={wizardInputStyle(undefined, designSize)}
            />
            <TextInput
              accessibilityLabel="Street or address"
              placeholder="Street / address line"
              placeholderTextColor={Lister.color.inkFaint}
              value={draft.addressLine}
              onChangeText={(addressLine) => patch({ addressLine })}
              style={wizardInputStyle(undefined, designSize)}
            />
          </Enter>
          {draft.area ? (
            <Enter delay={120}>
              <WizardFieldLabel required>Map pin</WizardFieldLabel>
              <View style={{ height: designSize(8) }} />
              <LocationPicker
                area={draft.area}
                value={draft.pin}
                invalid={pinInvalid}
                onChange={(pin) =>
                  patch({
                    pin,
                    landmark: pin.landmarkLabel || draft.landmark,
                  })
                }
              />
            </Enter>
          ) : pinInvalid ? (
            <Enter delay={120}>
              <WizardFieldLabel required>Map pin</WizardFieldLabel>
              <View style={{ height: designSize(8) }} />
              <LText variant="caption" tone="muted">
                Pick an area to load the map.
              </LText>
            </Enter>
          ) : (
            <LText variant="caption" tone="muted">
              Pick an area to load the map.
            </LText>
          )}
          <Enter delay={180}>
            <WizardFieldLabel required>Primary campus</WizardFieldLabel>
            <View style={{ height: designSize(8) }} />
            <WizardCampusSearch
              selectedCampusId={draft.primaryCampusId}
              onSelectCampusId={(primaryCampusId) => patch({ primaryCampusId })}
              invalid={campusInvalid}
            />
            {walk ? (
              <LText variant="caption" tone="primary" style={{ marginTop: designSize(8) }}>
                {walk}
              </LText>
            ) : null}
          </Enter>
        </View>
      </LockedCluster>
    );
  }

  /* Design 2: Redesigned architectural location step */
  return (
    <LockedCluster
      fields={[
        "area",
        "pin",
        "landmark",
        "addressLine",
        "buildingName",
        "primaryCampusId",
      ]}
    >
      <View style={styles.root}>
        {/* 1. Area */}
        <View style={styles.section}>
          <View style={styles.sectionHeadingStack}>
            <WizardFieldLabel required>Area</WizardFieldLabel>
            <LText variant="caption" tone="muted">
              Choose the neighborhood or city where your place is located.
            </LText>
          </View>

          <View ref={areaTriggerRef} collapsable={false} testID="location-area-picker">
            <Pressable
              testID="location-area-trigger"
              accessibilityRole="button"
              accessibilityLabel={
                selectedItem
                  ? `Area: ${selectedItem.area}, ${selectedTriggerContext}`
                  : "Select an area"
              }
              accessibilityState={{ expanded: dropdownOpen }}
              onPress={() => setDropdownOpen((open) => !open)}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.areaTrigger,
                !reducedMotion && webTransition,
                hovered && !dropdownOpen && !areaInvalid && styles.areaTriggerHover,
                dropdownOpen && styles.areaTriggerOpen,
                areaInvalid && !draft.area && styles.areaTriggerInvalid,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={selectedItem ? "location" : "location-outline"}
                size={designSize(17)}
                color={
                  areaInvalid && !draft.area
                    ? Lister.color.danger
                    : selectedItem
                      ? Lister.color.primary
                      : Lister.color.inkMuted
                }
              />
              <View style={styles.areaTriggerTextRow}>
                {selectedItem ? (
                  <>
                    <LText
                      variant="caption"
                      numberOfLines={1}
                      style={styles.areaTriggerValue}
                    >
                      {selectedItem.area}
                    </LText>
                    {selectedTriggerContext ? (
                      <LText
                        variant="caption"
                        numberOfLines={1}
                        style={styles.areaTriggerContext}
                      >
                        · {selectedTriggerContext}
                      </LText>
                    ) : null}
                  </>
                ) : (
                  <LText
                    variant="caption"
                    numberOfLines={1}
                    style={styles.areaTriggerPlaceholder}
                  >
                    Select an area
                  </LText>
                )}
              </View>
              <View
                style={[
                  styles.areaTriggerChevron,
                  !reducedMotion && webChevronTransition,
                  dropdownOpen && styles.areaTriggerChevronOpen,
                ]}
              >
                <Ionicons
                  name="chevron-down"
                  size={designSize(16)}
                  color={dropdownOpen ? Lister.color.ink : Lister.color.inkMuted}
                />
              </View>
            </Pressable>

            {areaInvalid && !draft.area ? (
              <View style={styles.areaErrorInline} accessibilityRole="alert">
                <Ionicons
                  name="alert-circle-outline"
                  size={designSize(14)}
                  color={Lister.color.danger}
                />
                <LText variant="caption" style={styles.areaErrorText}>
                  Select an area to continue and load the map.
                </LText>
              </View>
            ) : null}

            <AreaDropdownPortal
              open={dropdownOpen}
              triggerRef={areaTriggerRef}
              onClose={closeDropdown}
              reducedMotion={reducedMotion}
            >
              <View style={styles.areaSearchRow}>
                <Ionicons
                  name="search"
                  size={designSize(15)}
                  color={Lister.color.inkMuted}
                />
                <TextInput
                  ref={areaSearchRef}
                  value={areaQuery}
                  onChangeText={setAreaQuery}
                  onFocus={() => setFocusedField("area")}
                  onBlur={() => setFocusedField((f) => (f === "area" ? null : f))}
                  onSubmitEditing={submitAreaSearch}
                  returnKeyType="search"
                  placeholder="Search area, district, or region"
                  placeholderTextColor={Lister.color.inkMuted}
                  style={styles.areaSearchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Search areas"
                />
                {isSearching ? (
                  <LText variant="caption" style={styles.searchCount}>
                    {searchMatches.length}
                  </LText>
                ) : null}
                {areaQuery ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear area search"
                    onPress={() => setAreaQuery("")}
                    hitSlop={8}
                    style={styles.clearBtn}
                  >
                    <Ionicons
                      name="close-circle"
                      size={designSize(16)}
                      color={Lister.color.inkMuted}
                    />
                  </Pressable>
                ) : null}
              </View>

              {!isSearching ? (
                <View style={styles.regionTabBar} accessibilityRole="tablist">
                  {REGION_TABS.map((tab) => {
                    const active = region === tab.key;
                    return (
                      <Pressable
                        key={tab.key}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`${tab.label}, ${tab.count} areas`}
                        onPress={() => setRegion(tab.key)}
                        style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
                          styles.regionTab,
                          !reducedMotion && webTransition,
                          hovered && !active && styles.regionTabHover,
                        ]}
                      >
                        <View style={styles.regionTabInner}>
                          <LText
                            variant="caption"
                            numberOfLines={1}
                            style={[
                              styles.regionTabText,
                              active && styles.regionTabTextActive,
                            ]}
                          >
                            {compactTabs ? tab.shortLabel : tab.label}
                          </LText>
                          <LText
                            variant="caption"
                            style={[
                              styles.regionTabCount,
                              active && styles.regionTabCountActive,
                            ]}
                          >
                            {tab.count}
                          </LText>
                        </View>
                        {active ? <View style={styles.regionTabIndicator} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              <ScrollView
                style={styles.directoryScroll}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
              >
                <View style={styles.directoryBody}>
                  {isSearching && searchMatches.length === 0 ? (
                    <View style={styles.emptyAreasBox}>
                      <LText variant="caption" style={styles.emptyAreasTitle}>
                        No area matches “{trimmedQuery}”.
                      </LText>
                      <LText variant="caption" tone="muted">
                        Try a neighborhood, district like Matn or Keserwan, or governorate.
                      </LText>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setAreaQuery("")}
                        style={styles.emptyAreasReset}
                      >
                        <LText variant="caption" style={styles.emptyAreasResetText}>
                          Clear search
                        </LText>
                      </Pressable>
                    </View>
                  ) : (
                    directoryGroups.map((group, groupIdx) => {
                      const rows = twoColGrid
                        ? pairItems(group.items)
                        : group.items.map((item) => [item, null] as [AreaItem, AreaItem | null]);
                      const showMeta = isSearching || region === "other";
                      return (
                        <View
                          key={group.id}
                          style={groupIdx > 0 ? styles.dirGroupDivided : undefined}
                        >
                          {group.heading ? (
                            <View style={styles.dirGroupHeader}>
                              <LText variant="caption" style={styles.dirGroupLabel}>
                                {group.heading}
                              </LText>
                              <LText variant="caption" style={styles.dirGroupCount}>
                                {group.items.length}
                              </LText>
                            </View>
                          ) : null}
                          {rows.map(([left, right], rowIdx) => {
                            const renderCell = (item: AreaItem, isRight: boolean) => {
                              const selected = draft.area === item.area;
                              const meta = isSearching
                                ? item.region === "mount-lebanon" && item.district !== item.area
                                  ? `${item.district} · Mount Lebanon`
                                  : item.governorate === item.area
                                    ? `${item.governorate} Governorate`
                                    : item.governorate
                                : item.region === "other"
                                  ? item.governorate === item.area
                                    ? `${item.governorate} Governorate`
                                    : item.governorate
                                  : null;
                              return (
                                <Pressable
                                  key={item.area}
                                  accessibilityRole="button"
                                  accessibilityLabel={
                                    meta && meta !== item.area
                                      ? `${item.area}, ${meta}`
                                      : item.area
                                  }
                                  accessibilityState={{ selected }}
                                  onPress={() => selectArea(item)}
                                  style={({
                                    pressed,
                                    hovered,
                                  }: {
                                    pressed: boolean;
                                    hovered?: boolean;
                                  }) => [
                                    styles.dirCell,
                                    isRight && styles.dirCellRight,
                                    !reducedMotion && webTransition,
                                    hovered && !selected && styles.dirCellHover,
                                    selected && styles.dirCellSelected,
                                    pressed && styles.pressed,
                                  ]}
                                >
                                  <View style={styles.dirCellCopy}>
                                    <LText
                                      variant="caption"
                                      numberOfLines={1}
                                      style={[
                                        styles.dirCellLabel,
                                        selected && styles.dirCellLabelSelected,
                                      ]}
                                    >
                                      {item.area}
                                    </LText>
                                    {showMeta && meta ? (
                                      <LText
                                        variant="caption"
                                        numberOfLines={1}
                                        style={styles.dirCellMeta}
                                      >
                                        {meta}
                                      </LText>
                                    ) : null}
                                  </View>
                                  <View
                                    style={[
                                      styles.dirRadio,
                                      selected && styles.dirRadioSelected,
                                    ]}
                                  >
                                    {selected ? (
                                      <Ionicons
                                        name="checkmark"
                                        size={designSize(11)}
                                        color={Lister.color.surface}
                                      />
                                    ) : null}
                                  </View>
                                </Pressable>
                              );
                            };
                            return (
                              <View
                                key={left.area}
                                style={[
                                  styles.dirRow,
                                  rowIdx > 0 && styles.dirRowDivided,
                                ]}
                              >
                                {renderCell(left, false)}
                                {twoColGrid ? (
                                  right ? (
                                    renderCell(right, true)
                                  ) : (
                                    <View style={styles.dirCellSpacer} />
                                  )
                                ) : null}
                              </View>
                            );
                          })}
                        </View>
                      );
                    })
                  )}
                </View>
              </ScrollView>
            </AreaDropdownPortal>
          </View>
        </View>

        {/* 2. Building & street */}
        <View style={styles.sectionDivided}>
          <View style={styles.sectionHeader}>
            <LText variant="subtitle">Address details</LText>
            <LText variant="caption" tone="faint">
              Optional
            </LText>
          </View>

          <View style={[styles.addressRow, sideBySide && styles.addressRowSide]}>
            <View style={styles.fieldCol}>
              <LText variant="caption" style={styles.fieldLabel}>
                Building name
              </LText>
              <TextInput
                accessibilityLabel="Building name"
                placeholder="e.g. Cedar House"
                placeholderTextColor={Lister.color.inkFaint}
                value={draft.buildingName}
                onFocus={() => setFocusedField("building")}
                onBlur={() => setFocusedField((f) => (f === "building" ? null : f))}
                onChangeText={(buildingName) => patch({ buildingName })}
                style={[
                  styles.fieldInput,
                  focusedField === "building" && styles.fieldInputFocused,
                ]}
              />
            </View>

            <View style={styles.fieldCol}>
              <LText variant="caption" style={styles.fieldLabel}>
                Street or address
              </LText>
              <TextInput
                accessibilityLabel="Street or address"
                placeholder="e.g. Bliss Street"
                placeholderTextColor={Lister.color.inkFaint}
                value={draft.addressLine}
                onFocus={() => setFocusedField("street")}
                onBlur={() => setFocusedField((f) => (f === "street" ? null : f))}
                onChangeText={(addressLine) => patch({ addressLine })}
                style={[
                  styles.fieldInput,
                  focusedField === "street" && styles.fieldInputFocused,
                ]}
              />
            </View>
          </View>
        </View>

        {/* 3. Map pin */}
        <View style={styles.sectionDivided}>
          <View style={styles.sectionHeadingStack}>
            <WizardFieldLabel required>Map pin</WizardFieldLabel>
            <LText variant="caption" tone="muted">
              Paste a map link, drop a pin on the map, or pick a nearby landmark.
            </LText>
          </View>

          {draft.area ? (
            <LocationPicker
              variant="refined"
              area={draft.area}
              value={draft.pin}
              invalid={pinInvalid}
              onChange={(pin) =>
                patch({
                  pin,
                  landmark: pin.landmarkLabel || draft.landmark,
                })
              }
            />
          ) : (
            <View style={[styles.mapEmpty, pinInvalid && styles.mapEmptyInvalid]}>
              <View style={styles.mapEmptyIcon}>
                <Ionicons
                  name="map-outline"
                  size={designSize(20)}
                  color={pinInvalid ? Lister.color.danger : Lister.color.inkMuted}
                />
              </View>
              <View style={styles.mapEmptyCopy}>
                <LText variant="caption" style={styles.mapEmptyTitle}>
                  Choose an area first
                </LText>
                <LText variant="caption" tone="muted">
                  Pick a neighborhood above to load the interactive map and quick landmarks.
                </LText>
              </View>
            </View>
          )}
        </View>

        {/* 4. Primary campus */}
        <View style={styles.sectionDivided}>
          <View style={styles.sectionHeadingStack}>
            <WizardFieldLabel required>Primary campus</WizardFieldLabel>
            <LText variant="caption" tone="muted">
              Students filter listings by proximity to their university.
            </LText>
          </View>

          <WizardCampusSearch
            variant="refined"
            selectedCampusId={draft.primaryCampusId}
            onSelectCampusId={(primaryCampusId) => patch({ primaryCampusId })}
            invalid={campusInvalid}
            walkLabel={walk}
          />
        </View>
      </View>
    </LockedCluster>
  );
}

const webPointer =
  Platform.OS === "web" ? ({ cursor: "pointer" } as ViewStyle) : {};

const webTransition =
  Platform.OS === "web"
    ? ({
        transitionProperty: "border-color, background-color, box-shadow",
        transitionDuration: "140ms",
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      } as unknown as ViewStyle)
    : null;

const webChevronTransition =
  Platform.OS === "web"
    ? ({
        transitionProperty: "transform",
        transitionDuration: "160ms",
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      } as unknown as ViewStyle)
    : null;

const baseStyles = StyleSheet.create({
  /* Header 1 | 2 Toggle */
  toggleTrack: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    padding: 3,
    gap: 2,
    borderRadius: 9,
    backgroundColor: Lister.color.surfaceMuted,
    borderWidth: 1,
    borderColor: Lister.color.border,
  },
  toggleItem: {
    minWidth: 32,
    minHeight: 28,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    ...webPointer,
  },
  toggleItemActive: {
    backgroundColor: Lister.color.surface,
    borderWidth: 1,
    borderColor: Lister.color.border,
  },
  toggleLabel: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    fontVariant: ["tabular-nums"],
    color: Lister.color.inkMuted,
  },
  toggleLabelActive: {
    fontFamily: Lister.type.bodySemi,
    color: Lister.color.ink,
  },

  /* Design 2 Layout */
  root: {
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionDivided: {
    gap: 12,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: Lister.color.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionHeadingStack: {
    gap: 3,
  },

  /* Area select dropdown */
  areaTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
    ...webPointer,
  },
  areaTriggerHover: {
    borderColor: Lister.color.borderStrong,
  },
  areaTriggerOpen: {
    borderColor: Lister.color.ink,
    ...(Platform.OS === "web"
      ? ({ boxShadow: "0 0 0 3px rgba(26, 26, 26, 0.08)" } as ViewStyle)
      : null),
  },
  areaTriggerInvalid: {
    borderWidth: 1.5,
    borderColor: Lister.color.danger,
  },
  areaTriggerTextRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  areaTriggerValue: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 14.5,
    lineHeight: 20,
    color: Lister.color.ink,
    flexShrink: 0,
  },
  areaTriggerContext: {
    fontFamily: Lister.type.body,
    fontSize: 13,
    lineHeight: 18,
    color: Lister.color.inkMuted,
    flexShrink: 1,
  },
  areaTriggerPlaceholder: {
    fontFamily: Lister.type.body,
    fontSize: 14.5,
    lineHeight: 20,
    color: Lister.color.inkMuted,
  },
  areaTriggerChevron: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transform: [{ rotate: "0deg" }],
  },
  areaTriggerChevronOpen: {
    transform: [{ rotate: "180deg" }],
  },
  areaErrorInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  directoryScroll: {
    maxHeight: 292,
  },
  areaSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
  },
  areaSearchInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: Lister.type.body,
    fontSize: 14,
    color: Lister.color.ink,
    paddingVertical: 2,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  },
  searchCount: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    color: Lister.color.inkMuted,
    fontVariant: ["tabular-nums"],
  },
  clearBtn: {
    padding: 2,
    ...webPointer,
  },
  regionTabBar: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: Lister.color.bg,
    borderBottomWidth: 1,
    borderBottomColor: Lister.color.border,
  },
  regionTab: {
    flex: 1,
    position: "relative",
    minHeight: 40,
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    ...webPointer,
  },
  regionTabHover: {
    backgroundColor: Lister.color.surfaceMuted,
  },
  regionTabInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  regionTabText: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 12.5,
    lineHeight: 16,
    color: Lister.color.inkMuted,
  },
  regionTabTextActive: {
    fontFamily: Lister.type.bodySemi,
    color: Lister.color.ink,
  },
  regionTabCount: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 11.5,
    lineHeight: 15,
    color: Lister.color.inkMuted,
    fontVariant: ["tabular-nums"],
  },
  regionTabCountActive: {
    fontFamily: Lister.type.bodySemi,
    color: Lister.color.primary,
  },
  regionTabIndicator: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 0,
    height: 2,
    borderRadius: 2,
    backgroundColor: Lister.color.primary,
  },
  directoryBody: {
    backgroundColor: Lister.color.surface,
  },
  dirGroupDivided: {
    borderTopWidth: 1,
    borderTopColor: Lister.color.border,
  },
  dirGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: Lister.color.bg,
    borderBottomWidth: 1,
    borderBottomColor: Lister.color.surfaceMuted,
  },
  dirGroupLabel: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 11.5,
    lineHeight: 16,
    color: Lister.color.inkMuted,
  },
  dirGroupCount: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 11,
    lineHeight: 15,
    color: Lister.color.inkMuted,
    fontVariant: ["tabular-nums"],
  },
  dirRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  dirRowDivided: {
    borderTopWidth: 1,
    borderTopColor: Lister.color.surfaceMuted,
  },
  dirCell: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: Lister.color.surface,
    ...webPointer,
  },
  dirCellRight: {
    borderLeftWidth: 1,
    borderLeftColor: Lister.color.surfaceMuted,
  },
  dirCellSpacer: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingHorizontal: 14,
    borderLeftWidth: 1,
    borderLeftColor: Lister.color.surfaceMuted,
    backgroundColor: Lister.color.bg,
  },
  dirCellHover: {
    backgroundColor: Lister.color.bg,
  },
  dirCellSelected: {
    backgroundColor: Lister.color.primaryMist,
  },
  dirCellCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  dirCellLabel: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 13.5,
    lineHeight: 18,
    color: Lister.color.ink,
  },
  dirCellLabelSelected: {
    fontFamily: Lister.type.bodySemi,
    color: Lister.color.ink,
  },
  dirCellMeta: {
    fontFamily: Lister.type.body,
    fontSize: 11.5,
    lineHeight: 15,
    color: Lister.color.inkMuted,
  },
  dirRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: Lister.color.borderStrong,
    backgroundColor: Lister.color.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  dirRadioSelected: {
    borderWidth: 0,
    backgroundColor: Lister.color.primary,
  },
  emptyAreasBox: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 4,
    alignItems: "flex-start",
  },
  emptyAreasTitle: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 13.5,
    lineHeight: 19,
    color: Lister.color.ink,
  },
  emptyAreasReset: {
    marginTop: 6,
    paddingVertical: 4,
    ...webPointer,
  },
  emptyAreasResetText: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 13,
    color: Lister.color.primary,
    textDecorationLine: "underline",
  },
  areaErrorText: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Lister.color.danger,
  },
  pressed: {
    opacity: 0.9,
  },

  /* Address details */
  addressRow: {
    gap: 12,
  },
  addressRowSide: {
    flexDirection: "row",
    gap: 12,
  },
  fieldCol: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  fieldLabel: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 13,
    lineHeight: 18,
    color: Lister.color.ink,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: Lister.color.border,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontFamily: Lister.type.body,
    fontSize: 14.5,
    color: Lister.color.ink,
    backgroundColor: Lister.color.surface,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  },
  fieldInputFocused: {
    borderColor: Lister.color.ink,
  },

  /* Map empty state */
  mapEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: Lister.color.borderStrong,
    backgroundColor: Lister.color.bg,
  },
  mapEmptyInvalid: {
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: Lister.color.danger,
    backgroundColor: Lister.color.dangerSoft,
  },
  mapEmptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Lister.color.surface,
    borderWidth: 1,
    borderColor: Lister.color.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  mapEmptyCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  mapEmptyTitle: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 13.5,
    color: Lister.color.ink,
  },
});

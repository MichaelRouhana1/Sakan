import { useDesktopDesign } from "@/components/ui/DesktopDesign";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import {
  initialWindowMetrics,
  SafeAreaListener,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { LButton } from "@/components/lister/Button";
import { LText } from "@/components/lister/Typography";
import type { SearchMode } from "@/components/listings/SearchModeToggle";
import {
  MAX_LISTING_AREAS,
  MAX_UNIVERSITY_SLUGS,
  useLiveLebanonAreaGroups,
} from "@/constants/areas";
import { ELECTRICITY_LABELS, WATER_LABELS } from "@/constants/utilities";
import { UniversityCampusFilter } from "@/components/listings/UniversityCampusFilter";
import { BudgetHistogramSlider } from "@/components/listings/BudgetHistogramSlider";
import { JellySectionPills } from "@/components/ui/JellySectionPills";
import type { JellySectionPillItem } from "@/components/ui/JellySectionPills.types";
import { Studently } from "@/constants/theme";
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
import type { PriceHistogram } from "@/types/priceHistogram";

import { EMPTY_BROWSE_FILTERS, type BrowseFiltersValue } from "@/lib/browseFiltersValue";
export { EMPTY_BROWSE_FILTERS, type BrowseFiltersValue } from "@/lib/browseFiltersValue";

const ELECTRICITY_OPTIONS = Object.keys(
  ELECTRICITY_LABELS,
) as ElectricityStatus[];
const WATER_OPTIONS = Object.keys(WATER_LABELS) as WaterStatus[];
const LISTING_TYPE_OPTIONS = Object.keys(LISTING_TYPE_LABELS) as ListingType[];

type Props = {
  visible: boolean;
  mode: SearchMode;
  applied: BrowseFiltersValue;
  priceHistogram?: PriceHistogram | null;
  universities: University[];
  universitiesLoading?: boolean;
  onClose: () => void;
  onApply: (next: BrowseFiltersValue) => void;
  /** Drawer slides from left (list). Sheet slides up (map). */
  variant?: "drawer" | "sheet";
  sort?: string;
  sortOptions?: { value: string; label: string }[];
  onSortChange?: (value: string) => void;
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
    a.institutionSlug === b.institutionSlug &&
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
      (value.city ? 1 : 0) + (value.placeId ? 1 : 0) + (value.locationId ? 1 : 0) +
    value.universitySlugs.length +
    (value.q?.trim() ? 1 : 0) +
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
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  
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

function FilterSection({
  id,
  title,
  summary,
  collapsed,
  onToggle,
  first = false,
  onLayout,
  reduceMotion,
  children,
}: {
  id: string;
  title: string;
  summary?: string | null;
  collapsed: boolean;
  onToggle: () => void;
  first?: boolean;
  onLayout: (y: number) => void;
  reduceMotion: boolean;
  children: ReactNode;
}) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  const rot = useRef(new Animated.Value(collapsed ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(rot, {
      toValue: collapsed ? 0 : 1,
      duration: reduceMotion ? 0 : 180,
      useNativeDriver: true,
    }).start();
  }, [collapsed, reduceMotion, rot]);

  const chevronRotate = rot.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View
      style={[
        styles.blockSection,
        first && styles.blockSectionFirst,
        collapsed && styles.blockSectionCollapsed,
      ]}
      onLayout={(e) => onLayout(e.nativeEvent.layout.y)}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: !collapsed }}
        aria-expanded={!collapsed}
        accessibilityLabel={`${title} filters`}
        testID={`filter-section-toggle-${id}`}
        onPress={onToggle}
        hitSlop={6}
        style={({ pressed }) => [
          styles.sectionHeader,
          pressed && styles.sectionHeaderPressed,
        ]}
      >
        <LText variant="label" tone="muted" style={styles.sectionHeaderLabel}>
          {title}
        </LText>
        <View style={styles.sectionHeaderRight}>
          {summary ? (
            <View style={styles.sectionSummaryPill}>
              <LText
                variant="caption"
                numberOfLines={1}
                style={styles.sectionSummaryText}
              >
                {summary}
              </LText>
            </View>
          ) : null}
          <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
            <Ionicons
              name="chevron-down"
              size={designSize(18)}
              color={Studently.color.inkMuted}
            />
          </Animated.View>
        </View>
      </Pressable>
      {!collapsed ? (
        <View testID={`filter-section-body-${id}`} style={styles.sectionBody}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Full-screen Filters panel — slides in from the left.
 * Dirty close confirms discard; Clear resets draft; Apply commits + closes.
 */
export function BrowseFiltersPanel({
  visible,
  mode: _mode,
  applied,
  priceHistogram,
  universities,
  onClose,
  onApply,
  variant = "drawer",
  sort,
  sortOptions,
  onSortChange,
}: Props) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  
  const parentInsets = useSafeAreaInsets();
  const [modalInsets, setModalInsets] = useState(() => ({
    top: initialWindowMetrics?.insets.top ?? parentInsets.top,
    bottom: initialWindowMetrics?.insets.bottom ?? parentInsets.bottom,
    left: initialWindowMetrics?.insets.left ?? parentInsets.left,
    right: initialWindowMetrics?.insets.right ?? parentInsets.right,
  }));
  const insets = modalInsets;
  const footerBottomPad =
    Platform.OS === "ios" && insets.bottom >= 24
      ? Math.max(insets.bottom - 12, 14)
      : Math.max(insets.bottom, 12);
  const reduceMotion = useReducedMotion();
  const screenW = Dimensions.get("window").width;
  const screenH = Dimensions.get("window").height;
  const isSheet = variant === "sheet";
  const offscreen = isSheet ? screenH : -screenW;
  const slide = useRef(new Animated.Value(offscreen)).current;
  const [mounted, setMounted] = useState(visible);

  const [draftAreas, setDraftAreas] = useState<string[]>(applied.areas);
  const [draftSlugs, setDraftSlugs] = useState<string[]>(
    applied.universitySlugs,
  );
  const [draftInstSlug, setDraftInstSlug] = useState<string | null>(
    applied.institutionSlug,
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
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [sliderDragging, setSliderDragging] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  const toggleSection = (id: string) => {
    setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const hasSortSection = Boolean(sortOptions && sortOptions.length > 0 && onSortChange);
  const sections = useMemo<JellySectionPillItem[]>(
    () => [
      ...(hasSortSection ? [{ id: "sort", label: "Sort" }] : []),
      { id: "university", label: "University" },
      { id: "listingType", label: "Type" },
      { id: "rent", label: "Rent" },
      { id: "electricity", label: "Electricity" },
      { id: "water", label: "Water" },
      { id: "gender", label: "Gender" },
      { id: "extras", label: "Extras" },
      { id: "area", label: "Area" },
    ],
    [hasSortSection],
  );

  const [activeSection, setActiveSection] = useState<string>(
    () => sections[0]?.id ?? "university",
  );
  const activeSectionRef = useRef(activeSection);
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});
  const scrollY = useRef(0);
  const scrollViewportH = useRef(0);
  const maxScroll = useRef(0);
  const scrollingTo = useRef<string | null>(null);
  const jumpToken = useRef(0);

  const syncActiveSection = (id: string) => {
    if (activeSectionRef.current === id) return;
    activeSectionRef.current = id;
    setActiveSection(id);
  };

  const destinationFor = (id: string) => {
    const raw = Math.max(0, (sectionOffsets.current[id] ?? 0) - 8);
    return maxScroll.current > 0 ? Math.min(raw, maxScroll.current) : raw;
  };

  const scrollToSectionNow = (id: string, token: number) => {
    if (jumpToken.current !== token) return;
    const y = destinationFor(id);
    if (Math.abs(scrollY.current - y) <= 2) {
      scrollingTo.current = null;
      return;
    }
    scrollingTo.current = id;
    scrollRef.current?.scrollTo({ y, animated: !reduceMotion });
    setTimeout(() => {
      if (jumpToken.current === token && scrollingTo.current === id) {
        scrollingTo.current = null;
      }
    }, 1400);
  };

  const jumpToSection = (id: string) => {
    const token = ++jumpToken.current;
    syncActiveSection(id);
    if (collapsedSections[id]) {
      setCollapsedSections((prev) => ({ ...prev, [id]: false }));
      setTimeout(() => scrollToSectionNow(id, token), 50);
      return;
    }
    scrollToSectionNow(id, token);
  };

  const sectionAt = (y: number, native: NativeScrollEvent): string => {
    const { contentSize, layoutMeasurement } = native;
    const max = Math.max(0, contentSize.height - layoutMeasurement.height);
    const atEnd = max > 0 && y >= max - 4;
    if (atEnd) return sections[sections.length - 1]!.id;
    const marker = y + 28;
    let next = sections[0]!.id;
    for (const section of sections) {
      const top = sectionOffsets.current[section.id];
      if (top != null && top <= marker) next = section.id;
    }
    return next;
  };

  const handleFormScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const { contentSize, layoutMeasurement } = event.nativeEvent;
    scrollY.current = y;
    if (layoutMeasurement.height > 0) {
      maxScroll.current = Math.max(0, contentSize.height - layoutMeasurement.height);
    }
    const pending = scrollingTo.current;
    if (pending) {
      if (Math.abs(y - destinationFor(pending)) > 2) return;
      scrollingTo.current = null;
      return;
    }
    syncActiveSection(sectionAt(y, event.nativeEvent));
  };

  const draftValue: BrowseFiltersValue = useMemo(
    () => ({
      city: applied.city,
      placeId: applied.placeId,
      locationId: applied.locationId,
      locationKind: applied.locationKind,
      areas: draftAreas,
      universitySlugs: draftSlugs.slice(0, MAX_UNIVERSITY_SLUGS),
      institutionSlug: draftInstSlug,
      campusId: applied.campusId,
      q: applied.q,
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
      draftInstSlug,
      applied.campusId,
      applied.city,
      applied.placeId,
      applied.locationId,
      applied.locationKind,
      applied.q,
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
    setConfirmDiscard(false);
    setCollapsedSections({});
    scrollingTo.current = null;
    scrollY.current = 0;
    const firstId = sections[0]?.id ?? "university";
    activeSectionRef.current = firstId;
    setActiveSection(firstId);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [visible, applied, sections]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      slide.setValue(reduceMotion ? 0 : offscreen);
      Animated.timing(slide, {
        toValue: 0,
        duration: reduceMotion ? 0 : SLIDE_MS,
        useNativeDriver: true,
      }).start();
      return;
    }
    if (!mounted) return;
    Animated.timing(slide, {
      toValue: offscreen,
      duration: reduceMotion ? 0 : SLIDE_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
    // Intentionally omit `mounted` — including it restarts the open animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion, offscreen, slide]);

  const areaGroups = useLiveLebanonAreaGroups(areaQuery);

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
    setDraftInstSlug(null);
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
    const revealRentError = (msg: string) => {
      setRentError(msg);
      if (collapsedSections.rent) {
        jumpToSection("rent");
      }
    };
    if (
      draftMinRent.trim() !== "" &&
      minRentUsd == null
    ) {
      revealRentError("Min rent must be a positive whole number.");
      return;
    }
    if (
      draftMaxRent.trim() !== "" &&
      maxRentUsd == null
    ) {
      revealRentError("Max rent must be a positive whole number.");
      return;
    }
    if (minRentUsd != null && maxRentUsd != null && minRentUsd > maxRentUsd) {
      revealRentError("Min rent must be ≤ max rent.");
      return;
    }
    setRentError(null);
    setConfirmDiscard(false);
    onApply({
      city: draftAreas.join() === applied.areas.join() && draftSlugs.join() === applied.universitySlugs.join() ? applied.city : null,
      placeId: draftAreas.join() === applied.areas.join() && draftSlugs.join() === applied.universitySlugs.join() ? applied.placeId : null,
      ...(draftAreas.join() === applied.areas.join() && draftSlugs.join() === applied.universitySlugs.join()
        ? { locationId: applied.locationId, locationKind: applied.locationKind }
        : { locationId: null, locationKind: null }),
      radiusKm: applied.radiusKm,
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

  if (!mounted) return null;

  const parsedMinRent = parseRentDraft(draftMinRent);
  const parsedMaxRent = parseRentDraft(draftMaxRent);
  const sortSummary =
    sortOptions?.find((opt) => opt.value === sort)?.label ?? null;
  const selectedCampus = draftSlugs[0]
    ? universities.find((u) => u.slug === draftSlugs[0])
    : null;
  const universitySummary = draftSlugs[0]
    ? selectedCampus?.institutionShortName ??
      selectedCampus?.mapLabel ??
      selectedCampus?.name ??
      "1 selected"
    : null;
  const listingTypeSummary =
    draftTypes.length === 1
      ? LISTING_TYPE_LABELS[draftTypes[0]!]
      : draftTypes.length > 1
        ? `${draftTypes.length} selected`
        : null;
  const rentSummary =
    parsedMinRent != null && parsedMaxRent != null
      ? `$${parsedMinRent}–$${parsedMaxRent}`
      : parsedMinRent != null
        ? `$${parsedMinRent}+`
        : parsedMaxRent != null
          ? `Up to $${parsedMaxRent}`
          : null;
  const electricitySummary =
    draftElectricity.length === 1
      ? ELECTRICITY_LABELS[draftElectricity[0]!]
      : draftElectricity.length > 1
        ? `${draftElectricity.length} selected`
        : null;
  const waterSummary =
    draftWater.length === 1
      ? WATER_LABELS[draftWater[0]!]
      : draftWater.length > 1
        ? `${draftWater.length} selected`
        : null;
  const genderSummary =
    draftGender.length === 1
      ? GENDER_RESTRICTION_LABELS[draftGender[0]!]
      : draftGender.length > 1
        ? `${draftGender.length} selected`
        : null;
  const extrasCount = (draftWifi ? 1 : 0) + (draftStudentsOnly ? 1 : 0);
  const extrasSummary =
    extrasCount === 2
      ? "2 selected"
      : draftWifi
        ? "Wi‑Fi"
        : draftStudentsOnly
          ? "Students only"
          : null;
  const areaSummary =
    draftAreas.length === 1
      ? draftAreas[0]!
      : draftAreas.length > 1
        ? `${draftAreas.length} selected`
        : null;

  return (
    <Modal
      visible={mounted}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={handleRequestClose}
    >
      <SafeAreaListener
        style={[styles.backdrop, isSheet && styles.backdropSheet]}
        onChange={({ insets: next }) =>
          setModalInsets((current) =>
            current.top === next.top &&
            current.bottom === next.bottom &&
            current.left === next.left &&
            current.right === next.right
              ? current
              : next,
          )
        }
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss filters"
          style={isSheet ? styles.sheetDismiss : StyleSheet.absoluteFill}
          onPress={handleClose}
        />
        <Animated.View
          style={[
            isSheet ? styles.panelSheet : styles.panel,
            {
              paddingTop: isSheet ? 8 : insets.top + 8,
              transform: isSheet
                ? [{ translateY: slide }]
                : [{ translateX: slide }],
            },
          ]}
          accessibilityViewIsModal
        >
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close filters"
              onPress={handleClose}
              hitSlop={designSize(12)}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={designSize(24)} color={Studently.color.ink} />
            </Pressable>
            <LText variant="subtitle" style={styles.headerTitle}>
              Filters
            </LText>
            <View style={styles.closeBtn} />
          </View>

          <JellySectionPills
            items={sections}
            activeId={activeSection}
            onSelect={jumpToSection}
            ariaLabel="Filter sections"
          />

          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollEnabled={!sliderDragging}
            onLayout={(e) => {
              scrollViewportH.current = e.nativeEvent.layout.height;
            }}
            onContentSizeChange={(_, h) => {
              if (scrollViewportH.current > 0) {
                maxScroll.current = Math.max(0, h - scrollViewportH.current);
              }
            }}
            onScroll={handleFormScroll}
            scrollEventThrottle={16}
          >
            {sortOptions && sortOptions.length > 0 && onSortChange ? (
              <FilterSection
                id="sort"
                title="Sort"
                summary={collapsedSections.sort ? sortSummary : null}
                collapsed={Boolean(collapsedSections.sort)}
                onToggle={() => toggleSection("sort")}
                first
                reduceMotion={reduceMotion}
                onLayout={(y) => {
                  sectionOffsets.current.sort = y;
                }}
              >
                <View style={styles.chipWrap}>
                  {sortOptions.map((opt) => {
                    const on = sort === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        onPress={() => onSortChange(opt.value)}
                        style={[styles.chip, on && styles.chipOn]}
                      >
                        <LText
                          variant="caption"
                          style={on ? styles.chipLabelOn : styles.chipLabel}
                        >
                          {opt.label}
                        </LText>
                      </Pressable>
                    );
                  })}
                </View>
              </FilterSection>
            ) : null}

            <FilterSection
              id="university"
              title="University"
              summary={universitySummary}
              collapsed={Boolean(collapsedSections.university)}
              onToggle={() => toggleSection("university")}
              first={!hasSortSection}
              reduceMotion={reduceMotion}
              onLayout={(y) => {
                sectionOffsets.current.university = y;
              }}
            >
              <LText variant="caption" tone="muted" style={styles.sectionHint}>
                Pick a university, then a campus. Required to search near
                campus.
              </LText>
              <UniversityCampusFilter
                hideHeading
                selectedCampusSlug={draftSlugs[0] ?? null}
                selectedInstitutionSlug={draftInstSlug}
                onSelectInstitutionSlug={setDraftInstSlug}
                onSelectCampusSlug={(slug) =>
                  setDraftSlugs(slug ? [slug] : [])
                }
              />
            </FilterSection>

            <FilterSection
              id="listingType"
              title="Listing type"
              summary={listingTypeSummary}
              collapsed={Boolean(collapsedSections.listingType)}
              onToggle={() => toggleSection("listingType")}
              reduceMotion={reduceMotion}
              onLayout={(y) => {
                sectionOffsets.current.listingType = y;
              }}
            >
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
            </FilterSection>

            <FilterSection
              id="rent"
              title="Rent (USD / month)"
              summary={rentSummary}
              collapsed={Boolean(collapsedSections.rent)}
              onToggle={() => toggleSection("rent")}
              reduceMotion={reduceMotion}
              onLayout={(y) => {
                sectionOffsets.current.rent = y;
              }}
            >
              <BudgetHistogramSlider
                minRentUsd={parsedMinRent}
                maxRentUsd={parsedMaxRent}
                histogram={priceHistogram}
                error={rentError}
                onDragStateChange={setSliderDragging}
                onChange={(min, max) => {
                  setDraftMinRent(rentToDraft(min));
                  setDraftMaxRent(rentToDraft(max));
                  setRentError(null);
                }}
              />
            </FilterSection>

            <FilterSection
              id="electricity"
              title="Electricity"
              summary={electricitySummary}
              collapsed={Boolean(collapsedSections.electricity)}
              onToggle={() => toggleSection("electricity")}
              reduceMotion={reduceMotion}
              onLayout={(y) => {
                sectionOffsets.current.electricity = y;
              }}
            >
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
            </FilterSection>

            <FilterSection
              id="water"
              title="Water"
              summary={waterSummary}
              collapsed={Boolean(collapsedSections.water)}
              onToggle={() => toggleSection("water")}
              reduceMotion={reduceMotion}
              onLayout={(y) => {
                sectionOffsets.current.water = y;
              }}
            >
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
            </FilterSection>

            <FilterSection
              id="gender"
              title="Gender"
              summary={genderSummary}
              collapsed={Boolean(collapsedSections.gender)}
              onToggle={() => toggleSection("gender")}
              reduceMotion={reduceMotion}
              onLayout={(y) => {
                sectionOffsets.current.gender = y;
              }}
            >
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
            </FilterSection>

            <FilterSection
              id="extras"
              title="Extras"
              summary={extrasSummary}
              collapsed={Boolean(collapsedSections.extras)}
              onToggle={() => toggleSection("extras")}
              reduceMotion={reduceMotion}
              onLayout={(y) => {
                sectionOffsets.current.extras = y;
              }}
            >
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
            </FilterSection>

            <FilterSection
              id="area"
              title="Area"
              summary={areaSummary}
              collapsed={Boolean(collapsedSections.area)}
              onToggle={() => toggleSection("area")}
              reduceMotion={reduceMotion}
              onLayout={(y) => {
                sectionOffsets.current.area = y;
              }}
            >
              <LText variant="caption" tone="muted" style={styles.sectionHint}>
                Optional — narrow results after campus is set.
              </LText>
              <TextInput
                style={styles.search}
                placeholder="Search areas…"
                placeholderTextColor={Studently.color.inkFaint}
                value={areaQuery}
                onChangeText={setAreaQuery}
                accessibilityLabel="Search areas"
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
                    All areas
                  </LText>
                </Pressable>
              </View>
              {areaGroups.map((group) => (
                <View key={group.governorate} style={styles.areaGroup}>
                  <LText variant="caption" tone="muted" style={styles.areaGroupLabel}>
                    {group.governorate}
                  </LText>
                  <View style={styles.chipWrap}>
                    {group.areas.map((area) => {
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
                </View>
              ))}
            </FilterSection>
          </ScrollView>

          <View
            testID="filters-footer"
            style={[styles.footer, { paddingBottom: footerBottomPad }]}
          >
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
      </SafeAreaListener>
    </Modal>
  );
}

const baseStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Studently.color.overlay,
  },
  backdropSheet: {
    justifyContent: "flex-end",
  },
  sheetDismiss: {
    flex: 1,
  },
  panel: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: "100%",
    backgroundColor: Studently.color.bg,
    borderRightWidth: 1,
    borderRightColor: Studently.color.border,
  },
  panelSheet: {
    height: "88%",
    maxHeight: "88%",
    width: "100%",
    backgroundColor: Studently.color.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: Studently.color.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Studently.space.md,
    paddingBottom: Studently.space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Studently.color.border,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: Studently.type.displayMedium,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Studently.space.lg,
    paddingTop: Studently.space.sm,
    paddingBottom: Studently.space.xl,
  },
  blockSection: {
    marginTop: 10,
    paddingTop: 12,
    paddingBottom: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Studently.color.border,
  },
  blockSectionFirst: {
    marginTop: 0,
    paddingTop: 4,
    borderTopWidth: 0,
  },
  blockSectionCollapsed: {
    paddingBottom: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 36,
    gap: 10,
    paddingVertical: 4,
  },
  sectionHeaderPressed: {
    opacity: 0.7,
  },
  sectionHeaderLabel: {
    flexShrink: 1,
  },
  sectionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  sectionSummaryPill: {
    backgroundColor: Studently.color.primaryMist,
    borderRadius: Studently.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 2,
    maxWidth: 160,
  },
  sectionSummaryText: {
    color: Studently.color.primary,
    fontFamily: Studently.type.bodySemi,
    fontSize: 12,
  },
  sectionBody: {
    marginTop: 6,
    gap: 6,
  },
  sectionHint: {
    marginBottom: 8,
  },
  search: {
    backgroundColor: Studently.color.surface,
    borderWidth: 1,
    borderColor: Studently.color.border,
    borderRadius: Studently.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Studently.type.body,
    fontSize: 15,
    color: Studently.color.ink,
    marginBottom: 8,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  areaGroup: {
    gap: 6,
    marginTop: 8,
  },
  areaGroupLabel: {
    fontFamily: Studently.type.bodyMedium,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: Studently.color.surface,
    borderRadius: Studently.radius.pill,
    borderWidth: 1,
    borderColor: Studently.color.border,
  },
  chipOn: {
    backgroundColor: Studently.color.primary,
    borderColor: Studently.color.primary,
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipLabel: {
    color: Studently.color.ink,
    fontFamily: Studently.type.bodyMedium,
  },
  chipLabelOn: {
    color: Studently.color.surface,
    fontFamily: Studently.type.bodySemi,
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
    backgroundColor: Studently.color.surface,
    borderWidth: 1,
    borderColor: Studently.color.border,
    borderRadius: Studently.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Studently.type.body,
    fontSize: 15,
    color: Studently.color.ink,
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
    backgroundColor: Studently.color.surface,
    borderRadius: Studently.radius.md,
    borderWidth: 1,
    borderColor: Studently.color.border,
  },
  toggleOn: {
    borderColor: Studently.color.primarySoft,
    backgroundColor: Studently.color.primaryMist,
  },
  toggleLabel: {
    color: Studently.color.ink,
    fontFamily: Studently.type.bodyMedium,
    flex: 1,
  },
  toggleLabelOn: {
    color: Studently.color.primaryDeep,
    fontFamily: Studently.type.bodySemi,
    flex: 1,
  },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: Studently.color.border,
    padding: 3,
    justifyContent: "center",
  },
  switchTrackOn: {
    backgroundColor: Studently.color.primary,
  },
  switchKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Studently.color.surface,
  },
  switchKnobOn: {
    alignSelf: "flex-end",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Studently.color.border,
    backgroundColor: Studently.color.surface,
  },
  footerBtn: {
    flex: 0.4,
    minHeight: 46,
  },
  footerBtnPrimary: {
    flex: 1,
    minHeight: 46,
  },
  confirmLayer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Studently.color.overlay,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Studently.space.lg,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: Studently.color.surface,
    borderRadius: Studently.radius.lg,
    borderWidth: 1,
    borderColor: Studently.color.border,
    padding: Studently.space.lg,
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

import { useState, type ComponentProps } from "react";
import { Platform, Pressable, StyleSheet, TextInput, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDesktopDesign, useLayoutWidth } from "@/components/ui/DesktopDesign";
import { Enter } from "@/components/lister/Enter";
import { LText } from "@/components/lister/Typography";
import { SegmentedPills } from "@/components/listings/create/SegmentedPills";
import { SelectableCard } from "@/components/listings/create/SelectableCard";
import { LockedCluster } from "@/components/listings/create/LockedCluster";
import { StepperControl } from "@/components/listings/create/StepperControl";
import {
  WizardFieldLabel,
  useWizardFieldInvalid,
  wizardInputStyle,
} from "@/components/listings/create/WizardField";
import {
  FURNISHING_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  SPACE_TYPE_OPTIONS,
} from "@/constants/listingWizard";
import { Lister } from "@/constants/listerTheme";
import { useListingForm } from "@/features/listings/forms/ListingFormContext";
import { patchOverride, resetOverride } from "@/features/listings/create/unitDrafts";
import { priceBasisForSpaceType } from "@/lib/bedsAvailability";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { FurnishingType, GenderRestriction, PropertyType, SpaceType } from "@/types/listing";

type Ion = ComponentProps<typeof Ionicons>["name"];

export type LayoutLook = "1" | "2";

const LOOK_STORAGE_KEY = "studently.layoutVariant";
const LOOK_VARIANTS: readonly LayoutLook[] = ["1", "2"];

function readInitialLayoutLook(): LayoutLook {
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

export function useLayoutLook(): [LayoutLook, (next: LayoutLook) => void] {
  const [look, setLookState] = useState<LayoutLook>(readInitialLayoutLook);

  function setLook(next: LayoutLook) {
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

export function LayoutLookToggle({
  look,
  onChange,
}: {
  look: LayoutLook;
  onChange: (next: LayoutLook) => void;
}) {
  const { styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);

  return (
    <View
      testID="layout-look-toggle"
      accessibilityRole="radiogroup"
      accessibilityLabel="Layout step design variant"
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

function floorLabel(n: number) {
  if (n === 0) return "Ground";
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

function roundHalf(n: number) {
  return Math.round(n * 2) / 2;
}

const SPACE_TYPE_SUB: Record<SpaceType, string> = {
  entire_place: "Whole apartment or studio",
  private_room: "Your own bedroom",
  shared_room: "Bed with roommates",
};

const FURNISHING_META: Record<FurnishingType, { label: string; sub: string; icon: Ion }> = {
  furnished: { label: "Fully furnished", sub: "Ready to move in", icon: "bed-outline" },
  semi: { label: "Semi-furnished", sub: "Key pieces included", icon: "cube-outline" },
  unfurnished: { label: "Unfurnished", sub: "Empty space", icon: "square-outline" },
};

const GENDER_RULE_OPTIONS: { value: GenderRestriction; label: string }[] = [
  { value: "anyone", label: "All / mixed" },
  { value: "girls_only", label: "Female only" },
  { value: "boys_only", label: "Male only" },
];

export function BuildingAccessFields() {
  const { size: designSize } = useDesktopDesign();
  const { draft, patch } = useListingForm();
  const source = (label: string, key: "hasElevator" | "elevator24_7") =>
    !draft.sharedValues ? null : draft.differentFields?.includes(key) ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Reset ${label} to building`}
        onPress={() => resetOverride(draft, patch, [key])}
        style={{ alignSelf: "flex-start", paddingVertical: designSize(4) }}
      >
        <LText variant="caption" style={{ color: Lister.color.primary }}>
          Reset to building
        </LText>
      </Pressable>
    ) : (
      <LText variant="caption" tone="muted">
        Same as building
      </LText>
    );
  return (
    <Enter delay={180}>
      <SelectableCard
        selected={draft.hasElevator}
        title="Elevator in building"
        body="Yes — there is a lift."
        icon="swap-vertical-outline"
        onPress={() =>
          patchOverride(draft, patch, { hasElevator: !draft.hasElevator }, ["hasElevator"])
        }
      />
      {source("elevator", "hasElevator")}
      <View style={{ height: designSize(8) }} />
      <SelectableCard
        selected={draft.elevator24_7}
        title="Elevator works during cuts"
        body="24/7 elevator on generator or solar."
        icon="flash-outline"
        onPress={() =>
          patchOverride(draft, patch, { elevator24_7: !draft.elevator24_7 }, ["elevator24_7"])
        }
      />
      {source("elevator during cuts", "elevator24_7")}
    </Enter>
  );
}

function SpecStepperRow({
  icon,
  label,
  helper,
  value,
  min = 0,
  max = 20,
  step = 1,
  format,
  required,
  error,
  divided = false,
  reducedMotion = false,
  onChange,
}: {
  icon: Ion;
  label: string;
  helper?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  format?: (n: number) => string;
  required?: boolean;
  error?: boolean;
  divided?: boolean;
  reducedMotion?: boolean;
  onChange: (n: number) => void;
}) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <View
      style={[
        styles.stepperRow,
        divided && styles.rowDivided,
        error && styles.stepperRowError,
      ]}
    >
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={designSize(17)} color={Lister.color.inkMuted} />
      </View>
      <View style={styles.rowCopy}>
        <LText variant="caption" style={styles.stepperLabel}>
          {label}
          {required ? (
            <LText variant="caption" style={styles.req}>
              {" *"}
            </LText>
          ) : null}
        </LText>
        {helper ? (
          <LText variant="caption" style={styles.cellSub}>
            {helper}
          </LText>
        ) : null}
      </View>

      <View style={styles.stepperPill}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          accessibilityState={{ disabled: atMin }}
          disabled={atMin}
          hitSlop={4}
          onPress={() => onChange(Math.max(min, roundHalf(value - step)))}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.stepperBtn,
            !reducedMotion && webTransition,
            hovered && !atMin && styles.stepperBtnHover,
            atMin && styles.stepperBtnOff,
            pressed && !atMin && styles.pressed,
          ]}
        >
          <Ionicons
            name="remove"
            size={designSize(16)}
            color={atMin ? Lister.color.borderStrong : Lister.color.ink}
          />
        </Pressable>
        <LText variant="caption" style={styles.stepperValue}>
          {format ? format(value) : String(value)}
        </LText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          accessibilityState={{ disabled: atMax }}
          disabled={atMax}
          hitSlop={4}
          onPress={() => onChange(Math.min(max, roundHalf(value + step)))}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.stepperBtn,
            !reducedMotion && webTransition,
            hovered && !atMax && styles.stepperBtnHover,
            atMax && styles.stepperBtnOff,
            pressed && !atMax && styles.pressed,
          ]}
        >
          <Ionicons
            name="add"
            size={designSize(16)}
            color={atMax ? Lister.color.borderStrong : Lister.color.ink}
          />
        </Pressable>
      </View>
    </View>
  );
}

export function CreateStepSpecs({
  showSharedDetails = true,
  showRentalAndProperty = false,
  placeKind = null,
  look = "2",
}: {
  showSharedDetails?: boolean;
  showRentalAndProperty?: boolean;
  placeKind?: "apartment" | "building" | null;
  look?: LayoutLook;
} = {}) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  const layoutWidth = useLayoutWidth();
  const reducedMotion = useReducedMotion();
  const wideRow = layoutWidth >= 480;

  const { draft, patch, formChrome } = useListingForm();
  const spaceTypeInvalid = useWizardFieldInvalid("spaceType");
  const propertyTypeInvalid = useWizardFieldInvalid("propertyType");
  const bathroomInvalid = useWizardFieldInvalid("bathroomPrivacy");
  const furnishingInvalid = useWizardFieldInvalid("furnishingType");
  const bedsInvalid = useWizardFieldInvalid("beds");
  const occupancyInvalid = useWizardFieldInvalid("maxOccupancy");

  const [sizeFocused, setSizeFocused] = useState(false);

  const sharedRoom = draft.spaceType === "shared_room";
  const bedsMin = sharedRoom ? 2 : 1;

  function setBeds(beds: number) {
    if (sharedRoom) {
      const next = Math.max(beds, 2);
      const available =
        draft.bedsAvailable == null
          ? next
          : Math.min(Math.max(1, draft.bedsAvailable), next);
      patch({ beds: next, maxOccupancy: next, bedsAvailable: available });
      return;
    }
    patch({ beds });
  }

  function selectSpaceType(value: SpaceType) {
    const priceBasis = priceBasisForSpaceType(value);
    if (value === "shared_room") {
      const beds = Math.max(draft.beds, 2);
      patch({
        spaceType: value,
        priceBasis,
        beds,
        maxOccupancy: beds,
        bedsAvailable:
          draft.bedsAvailable == null || draft.bedsAvailable > beds
            ? beds
            : Math.max(1, draft.bedsAvailable),
      });
      return;
    }
    patch({ spaceType: value, priceBasis, bedsAvailable: null });
  }

  /* Design 1: Original stacked pills + loose steppers */
  if (look === "1") {
    return (
      <View style={{ gap: designSize(8) }}>
        <WizardFieldLabel required>Bathroom</WizardFieldLabel>
        <SegmentedPills
          options={[
            { value: "private", label: "Private bathroom" },
            { value: "shared", label: "Shared bathroom" },
          ]}
          value={draft.bathroomPrivacy ?? null}
          error={bathroomInvalid}
          onChange={(v) => patch({ bathroomPrivacy: v as "private" | "shared" })}
        />
        {(sharedRoom || !showSharedDetails) && formChrome !== "edit" ? (
          <>
            <WizardFieldLabel>Gender rule</WizardFieldLabel>
            <SegmentedPills
              options={[
                { value: "anyone", label: "All / mixed" },
                { value: "girls_only", label: "Female only" },
                { value: "boys_only", label: "Male only" },
              ]}
              value={draft.genderRestriction}
              onChange={(v) =>
                patch({ genderRestriction: v as typeof draft.genderRestriction })
              }
            />
          </>
        ) : null}
        <LockedCluster
          fields={["bedrooms", "beds", "bathrooms", "maxOccupancy", "floorNumber"]}
        >
          <Enter>
            <StepperControl
              label="Bedrooms"
              value={draft.bedrooms}
              min={0}
              max={8}
              onChange={(bedrooms) => patch({ bedrooms })}
              format={(n) => (n === 0 ? "Studio" : n >= 5 ? "5+" : String(n))}
            />
            <StepperControl
              label="Beds"
              value={Math.max(draft.beds, bedsMin)}
              min={bedsMin}
              max={12}
              required
              error={bedsInvalid}
              onChange={setBeds}
            />
            <StepperControl
              label="Bathrooms"
              value={draft.bathrooms}
              min={1}
              max={6}
              step={0.5}
              onChange={(bathrooms) => patch({ bathrooms })}
            />
            {sharedRoom ? null : (
              <StepperControl
                label="Max occupancy"
                value={draft.maxOccupancy}
                min={1}
                max={12}
                required
                error={occupancyInvalid}
                onChange={(maxOccupancy) => patch({ maxOccupancy })}
              />
            )}
            <StepperControl
              label="Floor"
              value={draft.floorNumber}
              min={0}
              max={30}
              onChange={(floorNumber) => patch({ floorNumber })}
              format={floorLabel}
            />
          </Enter>
        </LockedCluster>
        <Enter delay={80}>
          <WizardFieldLabel required style={{ marginTop: designSize(12) }}>
            Furnishing
          </WizardFieldLabel>
          <View style={{ height: designSize(8) }} />
          <SegmentedPills
            options={FURNISHING_OPTIONS}
            value={draft.furnishingType}
            error={furnishingInvalid}
            onChange={(v) => patch({ furnishingType: v as FurnishingType })}
          />
        </Enter>
        <LockedCluster fields={["areaSqm"]}>
          <Enter delay={140}>
            <LText variant="subtitle" style={{ marginTop: designSize(12) }}>
              Size (m²)
            </LText>
            <TextInput
              accessibilityLabel="Area in square meters"
              keyboardType="number-pad"
              placeholder="e.g. 85"
              placeholderTextColor={Lister.color.inkFaint}
              value={draft.areaSqm}
              onChangeText={(areaSqm) => patch({ areaSqm })}
              style={wizardInputStyle(undefined, designSize)}
            />
          </Enter>
        </LockedCluster>
        {showSharedDetails && formChrome !== "edit" ? <BuildingAccessFields /> : null}
      </View>
    );
  }

  /* Design 2: Architectural layout, size & furnishing step */
  const spaceOptions = SPACE_TYPE_OPTIONS.filter(
    (o) => placeKind !== "building" || o.value === "entire_place",
  );
  const showGenderRule = (sharedRoom || !showSharedDetails) && formChrome !== "edit";
  const propertyPairs: [
    (typeof PROPERTY_TYPE_OPTIONS)[number],
    (typeof PROPERTY_TYPE_OPTIONS)[number],
  ][] = [
    [PROPERTY_TYPE_OPTIONS[0], PROPERTY_TYPE_OPTIONS[1]],
    [PROPERTY_TYPE_OPTIONS[2], PROPERTY_TYPE_OPTIONS[3]],
  ];

  return (
    <View style={styles.root} testID="layout-v2">
      {/* 1. Space & property type (in creation wizard) */}
      {showRentalAndProperty ? (
        <View style={styles.section}>
          <View style={styles.sectionHeadingStack}>
            <WizardFieldLabel required>Rental & property type</WizardFieldLabel>
            <LText variant="caption" style={styles.muted}>
              Define what the student is renting and the kind of unit.
            </LText>
          </View>

          <View style={styles.subBlock}>
            <LText variant="caption" style={styles.fieldLabel}>
              Rental type
            </LText>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel="Rental type"
              style={[
                styles.shell,
                wideRow && spaceOptions.length > 1 && styles.horizontalShell,
                spaceTypeInvalid && styles.shellInvalid,
              ]}
            >
              {spaceOptions.map((option, idx) => {
                const selected = draft.spaceType === option.value;
                const singleBuildingMode = spaceOptions.length === 1;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityLabel={option.title}
                    accessibilityState={{ checked: selected }}
                    onPress={() => selectSpaceType(option.value)}
                    style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                      wideRow && !singleBuildingMode ? styles.tileCol : styles.listRow,
                      idx > 0 &&
                        (wideRow && !singleBuildingMode
                          ? styles.colDivided
                          : styles.rowDivided),
                      !reducedMotion && webTransition,
                      hovered && !selected && styles.cellHover,
                      selected && styles.cellSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    {wideRow && !singleBuildingMode ? (
                      <>
                        <View style={styles.tileTop}>
                          <Ionicons
                            name={option.icon}
                            size={designSize(18)}
                            color={selected ? Lister.color.primary : Lister.color.inkMuted}
                          />
                          <View style={[styles.radio, selected && styles.radioOn]}>
                            {selected ? (
                              <Ionicons
                                name="checkmark"
                                size={designSize(11)}
                                color={Lister.color.surface}
                              />
                            ) : null}
                          </View>
                        </View>
                        <View style={styles.tileCopy}>
                          <LText
                            variant="caption"
                            style={[styles.cellTitle, selected && styles.cellTitleOn]}
                          >
                            {option.title}
                          </LText>
                          <LText variant="caption" style={styles.cellSub}>
                            {SPACE_TYPE_SUB[option.value]}
                          </LText>
                        </View>
                      </>
                    ) : (
                      <>
                        <View style={[styles.iconBox, selected && styles.iconBoxOn]}>
                          <Ionicons
                            name={option.icon}
                            size={designSize(17)}
                            color={selected ? Lister.color.primary : Lister.color.inkMuted}
                          />
                        </View>
                        <View style={styles.rowCopy}>
                          <LText
                            variant="caption"
                            style={[styles.cellTitle, selected && styles.cellTitleOn]}
                          >
                            {option.title}
                          </LText>
                          <LText variant="caption" style={styles.cellSub}>
                            {singleBuildingMode
                              ? "Buildings list whole apartments per unit."
                              : SPACE_TYPE_SUB[option.value]}
                          </LText>
                        </View>
                        <View style={[styles.radio, selected && styles.radioOn]}>
                          {selected ? (
                            <Ionicons
                              name="checkmark"
                              size={designSize(11)}
                              color={Lister.color.surface}
                            />
                          ) : null}
                        </View>
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>
            {spaceTypeInvalid ? (
              <LText variant="caption" style={styles.errorText} accessibilityRole="alert">
                Choose a rental type.
              </LText>
            ) : null}
          </View>

          <View style={styles.subBlock}>
            <LText variant="caption" style={styles.fieldLabel}>
              Property type <LText variant="caption" style={styles.req}>*</LText>
            </LText>
            {wideRow ? (
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel="Property type"
                style={[styles.segTrack, propertyTypeInvalid && styles.segTrackInvalid]}
              >
                {PROPERTY_TYPE_OPTIONS.map((option) => {
                  const active = draft.propertyType === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityLabel={option.label}
                      accessibilityState={{ checked: active }}
                      onPress={() => patch({ propertyType: option.value as PropertyType })}
                      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                        styles.segOption,
                        !reducedMotion && webTransition,
                        hovered && !active && styles.segOptionHover,
                        active && styles.segOptionActive,
                        pressed && styles.pressed,
                      ]}
                    >
                      <LText
                        variant="caption"
                        numberOfLines={1}
                        style={[styles.segOptionText, active && styles.segOptionTextActive]}
                      >
                        {option.label}
                      </LText>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel="Property type"
                style={[styles.shell, propertyTypeInvalid && styles.shellInvalid]}
              >
                {propertyPairs.map(([left, right], rowIdx) => (
                  <View
                    key={left.value}
                    style={[styles.pairRow, rowIdx > 0 && styles.rowDivided]}
                  >
                    {[left, right].map((option, colIdx) => {
                      const active = draft.propertyType === option.value;
                      return (
                        <Pressable
                          key={option.value}
                          accessibilityRole="radio"
                          accessibilityLabel={option.label}
                          accessibilityState={{ checked: active }}
                          onPress={() => patch({ propertyType: option.value as PropertyType })}
                          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                            styles.propCell,
                            colIdx > 0 && styles.colDivided,
                            !reducedMotion && webTransition,
                            hovered && !active && styles.cellHover,
                            active && styles.cellSelected,
                            pressed && styles.pressed,
                          ]}
                        >
                          <LText
                            variant="caption"
                            numberOfLines={1}
                            style={[styles.cellTitle, active && styles.cellTitleOn]}
                          >
                            {option.label}
                          </LText>
                          <View style={[styles.radio, active && styles.radioOn]}>
                            {active ? (
                              <Ionicons
                                name="checkmark"
                                size={designSize(11)}
                                color={Lister.color.surface}
                              />
                            ) : null}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            )}
            {propertyTypeInvalid ? (
              <LText variant="caption" style={styles.errorText} accessibilityRole="alert">
                Choose a property type.
              </LText>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* 2. Bathroom & privacy */}
      <View style={showRentalAndProperty ? styles.sectionDivided : styles.section}>
        <View style={styles.sectionHeadingStack}>
          <WizardFieldLabel required>Bathroom & privacy</WizardFieldLabel>
          <LText variant="caption" style={styles.muted}>
            {showGenderRule
              ? "Clarify bathroom access and resident gender preference."
              : "Let renters know whether the bathroom is private or shared."}
          </LText>
        </View>

        <View style={styles.subBlock}>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Bathroom privacy"
            style={[
              styles.shell,
              wideRow && styles.horizontalShell,
              bathroomInvalid && styles.shellInvalid,
            ]}
          >
            {(
              [
                {
                  value: "private" as const,
                  label: "Private bathroom",
                  sub: "Exclusive to this unit",
                  icon: "lock-closed-outline" as Ion,
                },
                {
                  value: "shared" as const,
                  label: "Shared bathroom",
                  sub: "Shared with other rooms",
                  icon: "people-outline" as Ion,
                },
              ]
            ).map((option, idx) => {
              const selected = draft.bathroomPrivacy === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ checked: selected }}
                  onPress={() => patch({ bathroomPrivacy: option.value })}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.radioChoice,
                    idx > 0 && (wideRow ? styles.colDivided : styles.rowDivided),
                    !reducedMotion && webTransition,
                    hovered && !selected && styles.cellHover,
                    selected && styles.cellSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.iconBox, selected && styles.iconBoxOn]}>
                    <Ionicons
                      name={option.icon}
                      size={designSize(17)}
                      color={selected ? Lister.color.primary : Lister.color.inkMuted}
                    />
                  </View>
                  <View style={styles.rowCopy}>
                    <LText
                      variant="caption"
                      style={[styles.cellTitle, selected && styles.cellTitleOn]}
                    >
                      {option.label}
                    </LText>
                    <LText variant="caption" style={styles.cellSub}>
                      {option.sub}
                    </LText>
                  </View>
                  <View style={[styles.radio, selected && styles.radioOn]}>
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
            })}
          </View>
          {bathroomInvalid ? (
            <LText variant="caption" style={styles.errorText} accessibilityRole="alert">
              Choose a private or shared bathroom.
            </LText>
          ) : null}
        </View>

        {showGenderRule ? (
          <View style={styles.subBlock}>
            <LText variant="caption" style={styles.fieldLabel}>
              Gender rule
            </LText>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel="Gender rule"
              style={styles.segTrack}
            >
              {GENDER_RULE_OPTIONS.map((option) => {
                const active = draft.genderRestriction === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityLabel={option.label}
                    accessibilityState={{ checked: active }}
                    onPress={() => patch({ genderRestriction: option.value })}
                    style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                      styles.segOption,
                      !reducedMotion && webTransition,
                      hovered && !active && styles.segOptionHover,
                      active && styles.segOptionActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <LText
                      variant="caption"
                      numberOfLines={1}
                      style={[styles.segOptionText, active && styles.segOptionTextActive]}
                    >
                      {option.label}
                    </LText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>

      {/* 3. Rooms, beds & floor (unified architectural stepper ledger) */}
      <LockedCluster
        fields={["bedrooms", "beds", "bathrooms", "maxOccupancy", "floorNumber"]}
      >
        <View style={styles.sectionDivided}>
          <View style={styles.sectionHeadingStack}>
            <LText variant="subtitle">Rooms & capacity</LText>
            <LText variant="caption" style={styles.muted}>
              Set bedrooms, sleeping capacity, bathrooms, and floor level.
            </LText>
          </View>

          <View style={styles.shell}>
            <SpecStepperRow
              icon="home-outline"
              label="Bedrooms"
              helper="Set to Studio for an open-plan unit."
              value={draft.bedrooms}
              min={0}
              max={8}
              format={(n) => (n === 0 ? "Studio" : n >= 5 ? "5+" : String(n))}
              reducedMotion={reducedMotion}
              onChange={(bedrooms) => patch({ bedrooms })}
            />
            <SpecStepperRow
              icon="bed-outline"
              label="Beds"
              helper={
                sharedRoom
                  ? "Shared rooms need at least 2 beds; occupancy matches beds."
                  : "Total beds available in the unit."
              }
              value={Math.max(draft.beds, bedsMin)}
              min={bedsMin}
              max={12}
              required
              error={bedsInvalid}
              divided
              reducedMotion={reducedMotion}
              onChange={setBeds}
            />
            <SpecStepperRow
              icon="water-outline"
              label="Bathrooms"
              helper="Count half-baths in 0.5 steps."
              value={draft.bathrooms}
              min={1}
              max={6}
              step={0.5}
              divided
              reducedMotion={reducedMotion}
              onChange={(bathrooms) => patch({ bathrooms })}
            />
            {sharedRoom ? null : (
              <SpecStepperRow
                icon="people-outline"
                label="Max occupancy"
                helper="Maximum students allowed to live here."
                value={draft.maxOccupancy}
                min={1}
                max={12}
                required
                error={occupancyInvalid}
                divided
                reducedMotion={reducedMotion}
                onChange={(maxOccupancy) => patch({ maxOccupancy })}
              />
            )}
            <SpecStepperRow
              icon="layers-outline"
              label="Floor"
              helper="0 = Ground floor."
              value={draft.floorNumber}
              min={0}
              max={30}
              format={floorLabel}
              divided
              reducedMotion={reducedMotion}
              onChange={(floorNumber) => patch({ floorNumber })}
            />
          </View>
        </View>
      </LockedCluster>

      {/* 4. Furnishing & size */}
      <View style={styles.sectionDivided}>
        <View style={styles.sectionHeadingStack}>
          <WizardFieldLabel required>Furnishing & size</WizardFieldLabel>
          <LText variant="caption" style={styles.muted}>
            Tell students what comes with the unit and its approximate floor area.
          </LText>
        </View>

        <View style={styles.subBlock}>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Furnishing"
            style={[
              styles.shell,
              wideRow && styles.horizontalShell,
              furnishingInvalid && styles.shellInvalid,
            ]}
          >
            {FURNISHING_OPTIONS.map((option, idx) => {
              const selected = draft.furnishingType === option.value;
              const meta = FURNISHING_META[option.value];
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ checked: selected }}
                  onPress={() => patch({ furnishingType: option.value as FurnishingType })}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                    wideRow ? styles.tileCol : styles.listRow,
                    idx > 0 && (wideRow ? styles.colDivided : styles.rowDivided),
                    !reducedMotion && webTransition,
                    hovered && !selected && styles.cellHover,
                    selected && styles.cellSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  {wideRow ? (
                    <>
                      <View style={styles.tileTop}>
                        <Ionicons
                          name={meta.icon}
                          size={designSize(18)}
                          color={selected ? Lister.color.primary : Lister.color.inkMuted}
                        />
                        <View style={[styles.radio, selected && styles.radioOn]}>
                          {selected ? (
                            <Ionicons
                              name="checkmark"
                              size={designSize(11)}
                              color={Lister.color.surface}
                            />
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.tileCopy}>
                        <LText
                          variant="caption"
                          style={[styles.cellTitle, selected && styles.cellTitleOn]}
                        >
                          {meta.label}
                        </LText>
                        <LText variant="caption" style={styles.cellSub}>
                          {meta.sub}
                        </LText>
                      </View>
                    </>
                  ) : (
                    <>
                      <Ionicons
                        name={meta.icon}
                        size={designSize(18)}
                        color={selected ? Lister.color.primary : Lister.color.inkMuted}
                      />
                      <View style={styles.rowCopy}>
                        <LText
                          variant="caption"
                          style={[styles.cellTitle, selected && styles.cellTitleOn]}
                        >
                          {meta.label}
                        </LText>
                        <LText variant="caption" style={styles.cellSub}>
                          {meta.sub}
                        </LText>
                      </View>
                      <View style={[styles.radio, selected && styles.radioOn]}>
                        {selected ? (
                          <Ionicons
                            name="checkmark"
                            size={designSize(11)}
                            color={Lister.color.surface}
                          />
                        ) : null}
                      </View>
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
          {furnishingInvalid ? (
            <LText variant="caption" style={styles.errorText} accessibilityRole="alert">
              Select a furnishing level.
            </LText>
          ) : null}
        </View>

        <LockedCluster fields={["areaSqm"]}>
          <View style={styles.subBlock}>
            <View style={styles.inlineHeader}>
              <LText variant="caption" style={styles.fieldLabel}>
                Floor area
              </LText>
              <LText variant="caption" style={styles.muted}>
                Optional
              </LText>
            </View>
            <View style={[styles.unitInputRow, sizeFocused && styles.unitInputRowFocused]}>
              <TextInput
                accessibilityLabel="Area in square meters"
                keyboardType="number-pad"
                placeholder="e.g. 85"
                placeholderTextColor={Lister.color.inkMuted}
                value={draft.areaSqm}
                onFocus={() => setSizeFocused(true)}
                onBlur={() => setSizeFocused(false)}
                onChangeText={(areaSqm) => patch({ areaSqm })}
                style={styles.unitInput}
              />
              <View style={styles.unitSuffix}>
                <LText variant="caption" style={styles.unitSuffixText}>
                  m²
                </LText>
              </View>
            </View>
          </View>
        </LockedCluster>
      </View>

      {showSharedDetails && formChrome !== "edit" ? <BuildingAccessFields /> : null}
    </View>
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

  /* Design 2 Architectural Layout */
  root: {
    gap: 26,
  },
  section: {
    gap: 14,
  },
  sectionDivided: {
    gap: 14,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: Lister.color.border,
  },
  sectionHeadingStack: {
    gap: 3,
  },
  subBlock: {
    gap: 7,
  },
  inlineHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  fieldLabel: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 13,
    lineHeight: 18,
    color: Lister.color.ink,
  },
  req: {
    fontFamily: Lister.type.bodySemi,
    color: Lister.color.danger,
  },
  muted: {
    fontFamily: Lister.type.body,
    fontSize: 13,
    lineHeight: 18,
    color: Lister.color.inkMuted,
  },
  errorText: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Lister.color.danger,
  },
  shell: {
    borderWidth: 1,
    borderColor: Lister.color.border,
    borderRadius: 12,
    backgroundColor: Lister.color.surface,
    overflow: "hidden",
  },
  shellInvalid: {
    borderWidth: 1.5,
    borderColor: Lister.color.danger,
  },
  horizontalShell: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  colDivided: {
    borderLeftWidth: 1,
    borderLeftColor: Lister.color.border,
  },
  rowDivided: {
    borderTopWidth: 1,
    borderTopColor: Lister.color.surfaceMuted,
  },
  tileCol: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
    backgroundColor: Lister.color.surface,
    ...webPointer,
  },
  tileTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  tileCopy: {
    gap: 2,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: Lister.color.surface,
    ...webPointer,
  },
  radioChoice: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Lister.color.surface,
    ...webPointer,
  },
  pairRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  propCell: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: Lister.color.surface,
    ...webPointer,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Lister.color.bg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconBoxOn: {
    backgroundColor: Lister.color.primaryMist,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  cellHover: {
    backgroundColor: Lister.color.bg,
  },
  cellSelected: {
    backgroundColor: Lister.color.primaryMist,
  },
  cellTitle: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 13.5,
    lineHeight: 18,
    color: Lister.color.ink,
  },
  cellTitleOn: {
    fontFamily: Lister.type.bodySemi,
    color: Lister.color.ink,
  },
  cellSub: {
    fontFamily: Lister.type.body,
    fontSize: 12,
    lineHeight: 16,
    color: Lister.color.inkMuted,
  },
  radio: {
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
  radioOn: {
    borderWidth: 0,
    backgroundColor: Lister.color.primary,
  },

  /* Segmented control track */
  segTrack: {
    flexDirection: "row",
    alignItems: "stretch",
    padding: 3,
    gap: 3,
    borderRadius: 9,
    backgroundColor: Lister.color.surfaceMuted,
    borderWidth: 1,
    borderColor: Lister.color.border,
  },
  segTrackInvalid: {
    borderWidth: 1.5,
    borderColor: Lister.color.danger,
    backgroundColor: Lister.color.dangerSoft,
  },
  segOption: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 38,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    ...webPointer,
  },
  segOptionHover: {
    backgroundColor: Lister.color.bg,
  },
  segOptionActive: {
    backgroundColor: Lister.color.ink,
  },
  segOptionText: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 13,
    lineHeight: 17,
    color: Lister.color.inkMuted,
  },
  segOptionTextActive: {
    fontFamily: Lister.type.bodySemi,
    color: Lister.color.surface,
  },

  /* Unified Stepper ledger */
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: Lister.color.surface,
  },
  stepperRowError: {
    backgroundColor: Lister.color.dangerSoft,
  },
  stepperLabel: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 13.5,
    lineHeight: 18,
    color: Lister.color.ink,
  },
  stepperPill: {
    flexDirection: "row",
    alignItems: "center",
    padding: 3,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.bg,
    flexShrink: 0,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Lister.color.surface,
    borderWidth: 1,
    borderColor: Lister.color.border,
    ...webPointer,
  },
  stepperBtnHover: {
    borderColor: Lister.color.borderStrong,
    backgroundColor: Lister.color.surfaceMuted,
  },
  stepperBtnOff: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    opacity: 0.45,
  },
  stepperValue: {
    minWidth: 52,
    paddingHorizontal: 6,
    textAlign: "center",
    fontFamily: Lister.type.bodySemi,
    fontSize: 13.5,
    lineHeight: 18,
    fontVariant: ["tabular-nums"],
    color: Lister.color.ink,
  },

  /* Floor area input with m² suffix */
  unitInputRow: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
    overflow: "hidden",
  },
  unitInputRowFocused: {
    borderColor: Lister.color.ink,
    ...(Platform.OS === "web"
      ? ({ boxShadow: "0 0 0 3px rgba(26, 26, 26, 0.08)" } as ViewStyle)
      : null),
  },
  unitInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontFamily: Lister.type.body,
    fontSize: 14.5,
    fontVariant: ["tabular-nums"],
    color: Lister.color.ink,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  },
  unitSuffix: {
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Lister.color.bg,
    borderLeftWidth: 1,
    borderLeftColor: Lister.color.border,
  },
  unitSuffixText: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 13,
    lineHeight: 17,
    color: Lister.color.inkMuted,
  },
  pressed: {
    opacity: 0.9,
  },
});

import { SharedDetailsChoice } from "../edit/SharedDetailsChoice";
import { SHARED_GROUPS } from "@/features/listings/create/unitDrafts";
import { Ionicons } from "@expo/vector-icons";
import { useState, type ComponentProps } from "react";
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { useDesktopDesign, useLayoutWidth } from "@/components/ui/DesktopDesign";
import { Enter } from "@/components/lister/Enter";
import { LText } from "@/components/lister/Typography";
import { LockedCluster } from "@/components/listings/create/LockedCluster";
import { SelectableCard } from "@/components/listings/create/SelectableCard";
import { SegmentedPills } from "@/components/listings/create/SegmentedPills";
import { WizardFieldLabel } from "@/components/listings/create/WizardField";
import { Lister } from "@/constants/listerTheme";
import { useListingForm } from "@/features/listings/forms/ListingFormContext";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type {
  GenderRestriction,
  GuestsPolicy,
  PetsPolicy,
  SmokingPolicy,
  TargetAudience,
} from "@/types/listing";

type Ion = ComponentProps<typeof Ionicons>["name"];

export type RulesLook = "1" | "2";

const LOOK_STORAGE_KEY = "studently.rulesVariant";
const LOOK_VARIANTS: readonly RulesLook[] = ["1", "2"];

function readInitialRulesLook(): RulesLook {
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

export function useRulesLook(): [RulesLook, (next: RulesLook) => void] {
  const [look, setLookState] = useState<RulesLook>(readInitialRulesLook);

  function setLook(next: RulesLook) {
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

export function RulesLookToggle({
  look,
  onChange,
}: {
  look: RulesLook;
  onChange: (next: RulesLook) => void;
}) {
  const { styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);

  return (
    <View
      testID="rules-look-toggle"
      accessibilityRole="radiogroup"
      accessibilityLabel="Rules step design variant"
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

const GENDER_OPTIONS: {
  value: GenderRestriction;
  label: string;
  sub: string;
  icon: Ion;
}[] = [
  { value: "anyone", label: "All / mixed", sub: "No restriction", icon: "people-outline" },
  { value: "girls_only", label: "Female only", sub: "Women residents", icon: "woman-outline" },
  { value: "boys_only", label: "Male only", sub: "Men residents", icon: "man-outline" },
];

const AUDIENCE_OPTIONS: {
  value: TargetAudience;
  label: string;
  sub: string;
  icon: Ion;
}[] = [
  {
    value: "students_only",
    label: "Students only",
    sub: "University students",
    icon: "school-outline",
  },
  {
    value: "students_professionals",
    label: "Students & pros",
    sub: "Students & young pros",
    icon: "briefcase-outline",
  },
  {
    value: "anyone",
    label: "Families / anyone",
    sub: "Open to all residents",
    icon: "people-outline",
  },
];

type PolicyOption<T extends string> = {
  value: T;
  label: string;
  shortLabel?: string;
};

const SMOKING_OPTIONS: PolicyOption<SmokingPolicy>[] = [
  { value: "no", label: "Not allowed", shortLabel: "No" },
  { value: "balcony_only", label: "Balcony only", shortLabel: "Balcony" },
  { value: "inside", label: "Inside OK", shortLabel: "Inside OK" },
];

const PETS_OPTIONS: PolicyOption<PetsPolicy>[] = [
  { value: "no", label: "Not allowed", shortLabel: "No" },
  { value: "cats_only", label: "Cats only", shortLabel: "Cats only" },
  { value: "yes", label: "Allowed", shortLabel: "Allowed" },
];

const GUESTS_OPTIONS: PolicyOption<GuestsPolicy>[] = [
  { value: "no", label: "Not allowed", shortLabel: "No" },
  { value: "restricted", label: "Restricted", shortLabel: "Restricted" },
  { value: "yes", label: "Allowed", shortLabel: "Allowed" },
];

function PolicyRow<T extends string>({
  icon,
  title,
  subtitle,
  options,
  value,
  error,
  errorText,
  compact,
  divided = false,
  reducedMotion = false,
  onChange,
}: {
  icon: Ion;
  title: string;
  subtitle: string;
  options: PolicyOption<T>[];
  value: T | null;
  error: boolean;
  errorText: string;
  compact: boolean;
  divided?: boolean;
  reducedMotion?: boolean;
  onChange: (next: T) => void;
}) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  const selected = value != null;

  return (
    <View style={[styles.policyRow, divided && styles.rowDivided]}>
      <View style={styles.policyHeader}>
        <View style={[styles.iconBox, selected && styles.iconBoxOn]}>
          <Ionicons
            name={icon}
            size={designSize(17)}
            color={selected ? Lister.color.primary : Lister.color.inkMuted}
          />
        </View>
        <View style={styles.policyCopy}>
          <LText variant="caption" style={styles.policyTitle}>
            {title}{" "}
            <LText variant="caption" style={styles.req}>
              *
            </LText>
          </LText>
          <LText variant="caption" style={styles.policySub}>
            {subtitle}
          </LText>
        </View>
      </View>

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={title}
        style={[styles.segTrack, error && styles.segTrackInvalid]}
      >
        {options.map((option) => {
          const active = value === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={`${title}: ${option.label}`}
              accessibilityState={{ checked: active }}
              onPress={() => onChange(option.value)}
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
                {compact && option.shortLabel ? option.shortLabel : option.label}
              </LText>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <LText variant="caption" style={styles.errorText} accessibilityRole="alert">
          {errorText}
        </LText>
      ) : null}
    </View>
  );
}

export function CreateStepRules({
  sharedOnly = false,
  look = "2",
}: {
  sharedOnly?: boolean;
  look?: RulesLook;
} = {}) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  const layoutWidth = useLayoutWidth();
  const reducedMotion = useReducedMotion();
  const wideRow = layoutWidth >= 480;
  const compactSegments = layoutWidth < 400;

  const form = useListingForm();
  const { draft, patch } = form;
  const ruleMissing = (field: string) =>
    typeof form.fieldInvalid === "function" ? form.fieldInvalid(field) : false;

  const showSharedRules =
    !draft.sharedValues ||
    SHARED_GROUPS.rules.some((k) => draft.differentFields?.includes(k));

  /* Design 1: Original pill rows + SelectableCard */
  if (look === "1") {
    return (
      <View style={{ gap: designSize(16) }}>
        {!sharedOnly ? (
          <LockedCluster fields={["genderRestriction"]}>
            <Enter>
              <LText variant="subtitle">Gender</LText>
              <View style={{ height: designSize(8) }} />
              <SelectableCard
                selected={draft.genderRestriction === "anyone"}
                title="All / mixed"
                body="No gender restriction."
                icon="people-outline"
                onPress={() => patch({ genderRestriction: "anyone" as GenderRestriction })}
              />
              <View style={{ height: designSize(8) }} />
              <SelectableCard
                selected={draft.genderRestriction === "girls_only"}
                title="Female only"
                icon="woman-outline"
                onPress={() => patch({ genderRestriction: "girls_only" })}
              />
              <View style={{ height: designSize(8) }} />
              <SelectableCard
                selected={draft.genderRestriction === "boys_only"}
                title="Male only"
                icon="man-outline"
                onPress={() => patch({ genderRestriction: "boys_only" })}
              />
            </Enter>
          </LockedCluster>
        ) : null}
        <SharedDetailsChoice fields={SHARED_GROUPS.rules} />
        {showSharedRules ? (
          <>
            <LockedCluster fields={["targetAudience"]}>
              <Enter delay={80}>
                <LText variant="subtitle">Tenant mix</LText>
                <View style={{ height: designSize(8) }} />
                <SegmentedPills
                  options={[
                    { value: "students_only", label: "Students only" },
                    { value: "students_professionals", label: "Students & professionals" },
                    { value: "anyone", label: "Families / anyone" },
                  ]}
                  value={draft.targetAudience}
                  error={ruleMissing("targetAudience")}
                  onChange={(v) => patch({ targetAudience: v as TargetAudience })}
                />
              </Enter>
            </LockedCluster>
            <Enter delay={140}>
              <LText variant="subtitle">Smoking</LText>
              <View style={{ height: designSize(8) }} />
              <SegmentedPills
                options={[
                  { value: "no", label: "No" },
                  { value: "balcony_only", label: "Balcony only" },
                  { value: "inside", label: "Inside OK" },
                ]}
                value={draft.smokingPolicy}
                error={ruleMissing("smokingPolicy")}
                onChange={(v) => patch({ smokingPolicy: v as SmokingPolicy })}
              />
            </Enter>
            <Enter delay={180}>
              <LText variant="subtitle">Pets</LText>
              <View style={{ height: designSize(8) }} />
              <SegmentedPills
                options={[
                  { value: "no", label: "No" },
                  { value: "cats_only", label: "Cats only" },
                  { value: "yes", label: "Yes" },
                ]}
                value={draft.petsPolicy}
                error={ruleMissing("petsPolicy")}
                onChange={(v) => patch({ petsPolicy: v as PetsPolicy })}
              />
            </Enter>
            <Enter delay={220}>
              <LText variant="subtitle">Overnight guests</LText>
              <View style={{ height: designSize(8) }} />
              <SegmentedPills
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "restricted", label: "Restricted" },
                  { value: "no", label: "No" },
                ]}
                value={draft.guestsPolicy}
                error={ruleMissing("guestsPolicy")}
                onChange={(v) => patch({ guestsPolicy: v as GuestsPolicy })}
              />
            </Enter>
            <Enter delay={260}>
              <SelectableCard
                selected={draft.quietHours}
                title="Quiet study hours"
                body="Enforced quiet hours in the evening."
                icon="moon-outline"
                onPress={() => patch({ quietHours: !draft.quietHours })}
              />
            </Enter>
          </>
        ) : null}
      </View>
    );
  }

  /* Design 2: Architectural house-rules layout */
  const audienceInvalid = ruleMissing("targetAudience");

  return (
    <View style={styles.root} testID="rules-v2">
      {!sharedOnly ? (
        <LockedCluster fields={["genderRestriction"]}>
          <View style={styles.section}>
            <View style={styles.sectionHeadingStack}>
              <LText variant="subtitle">Gender policy</LText>
              <LText variant="caption" style={styles.muted}>
                Who can rent rooms or beds in this place.
              </LText>
            </View>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel="Gender policy"
              style={[styles.shell, wideRow && styles.horizontalShell]}
            >
              {GENDER_OPTIONS.map((option, idx) => {
                const selected = draft.genderRestriction === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityLabel={option.label}
                    accessibilityState={{ checked: selected }}
                    onPress={() => patch({ genderRestriction: option.value })}
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
                            {option.label}
                          </LText>
                          <LText variant="caption" style={styles.cellSub}>
                            {option.sub}
                          </LText>
                        </View>
                      </>
                    ) : (
                      <>
                        <Ionicons
                          name={option.icon}
                          size={designSize(18)}
                          color={selected ? Lister.color.primary : Lister.color.inkMuted}
                        />
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
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </LockedCluster>
      ) : null}

      <SharedDetailsChoice fields={SHARED_GROUPS.rules} />

      {showSharedRules ? (
        <>
          {/* 1. Tenant mix */}
          <LockedCluster fields={["targetAudience"]}>
            <View style={[styles.section, !sharedOnly && styles.sectionDivided]}>
              <View style={styles.sectionHeadingStack}>
                <WizardFieldLabel required>Who lives here</WizardFieldLabel>
                <LText variant="caption" style={styles.muted}>
                  Set the resident mix students can expect in the building.
                </LText>
              </View>

              <View
                accessibilityRole="radiogroup"
                accessibilityLabel="Tenant mix"
                style={[
                  styles.shell,
                  wideRow && styles.horizontalShell,
                  audienceInvalid && styles.shellInvalid,
                ]}
              >
                {AUDIENCE_OPTIONS.map((option, idx) => {
                  const selected = draft.targetAudience === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityLabel={option.label}
                      accessibilityState={{ checked: selected }}
                      onPress={() => patch({ targetAudience: option.value })}
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
                              {option.label}
                            </LText>
                            <LText variant="caption" style={styles.cellSub}>
                              {option.sub}
                            </LText>
                          </View>
                        </>
                      ) : (
                        <>
                          <Ionicons
                            name={option.icon}
                            size={designSize(18)}
                            color={selected ? Lister.color.primary : Lister.color.inkMuted}
                          />
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
                        </>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {audienceInvalid ? (
                <LText variant="caption" style={styles.errorText} accessibilityRole="alert">
                  Choose a tenant mix to continue.
                </LText>
              ) : null}
            </View>
          </LockedCluster>

          {/* 2. Living policies (unified 3-policy architectural ledger) */}
          <View style={styles.sectionDivided}>
            <View style={styles.sectionHeadingStack}>
              <WizardFieldLabel required>Living policies</WizardFieldLabel>
              <LText variant="caption" style={styles.muted}>
                Clear expectations on smoking, pets, and overnight visitors.
              </LText>
            </View>

            <View style={styles.shell}>
              <PolicyRow
                icon="flame-outline"
                title="Smoking"
                subtitle="Where smoking is allowed in the place."
                options={SMOKING_OPTIONS}
                value={draft.smokingPolicy}
                error={ruleMissing("smokingPolicy")}
                errorText="Choose a smoking rule."
                compact={compactSegments}
                reducedMotion={reducedMotion}
                onChange={(smokingPolicy) => patch({ smokingPolicy })}
              />
              <PolicyRow
                icon="paw-outline"
                title="Pets"
                subtitle="Whether residents can keep animals."
                options={PETS_OPTIONS}
                value={draft.petsPolicy}
                error={ruleMissing("petsPolicy")}
                errorText="Choose a pets rule."
                compact={compactSegments}
                divided
                reducedMotion={reducedMotion}
                onChange={(petsPolicy) => patch({ petsPolicy })}
              />
              <PolicyRow
                icon="bed-outline"
                title="Overnight guests"
                subtitle="Rules for friends or family staying overnight."
                options={GUESTS_OPTIONS}
                value={draft.guestsPolicy}
                error={ruleMissing("guestsPolicy")}
                errorText="Choose an overnight guests rule."
                compact={compactSegments}
                divided
                reducedMotion={reducedMotion}
                onChange={(guestsPolicy) => patch({ guestsPolicy })}
              />
            </View>
          </View>

          {/* 3. Quiet hours toggle */}
          <View style={styles.sectionDivided}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeadingStack}>
                <LText variant="subtitle">Study environment</LText>
                <LText variant="caption" style={styles.muted}>
                  Optional evening policy for quieter student living.
                </LText>
              </View>
              <LText variant="caption" style={styles.muted}>
                Optional
              </LText>
            </View>

            <View style={styles.shell}>
              <Pressable
                accessibilityRole="switch"
                accessibilityLabel="Quiet study hours"
                accessibilityState={{ checked: draft.quietHours }}
                onPress={() => patch({ quietHours: !draft.quietHours })}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                  styles.switchRow,
                  !reducedMotion && webTransition,
                  hovered && styles.cellHover,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.iconBox, draft.quietHours && styles.iconBoxOn]}>
                  <Ionicons
                    name="moon-outline"
                    size={designSize(17)}
                    color={draft.quietHours ? Lister.color.primary : Lister.color.inkMuted}
                  />
                </View>
                <View style={styles.rowCopy}>
                  <LText variant="caption" style={styles.switchTitle}>
                    Quiet study hours
                  </LText>
                  <LText variant="caption" style={styles.cellSub}>
                    {draft.quietHours
                      ? "Enforced quiet hours in the evening."
                      : "No enforced quiet hours in the evening."}
                  </LText>
                </View>
                <View
                  style={[
                    styles.switchTrack,
                    draft.quietHours && styles.switchTrackOn,
                    !reducedMotion && webSwitchTransition,
                  ]}
                >
                  <View
                    style={[
                      styles.switchThumb,
                      draft.quietHours && styles.switchThumbOn,
                      !reducedMotion && webThumbTransition,
                    ]}
                  />
                </View>
              </Pressable>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}

const webPointer =
  Platform.OS === "web" ? ({ cursor: "pointer" } as ViewStyle) : {};

const webTransition =
  Platform.OS === "web"
    ? ({
        transitionProperty: "border-color, background-color",
        transitionDuration: "140ms",
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      } as unknown as ViewStyle)
    : null;

const webSwitchTransition =
  Platform.OS === "web"
    ? ({
        transitionProperty: "background-color",
        transitionDuration: "160ms",
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      } as unknown as ViewStyle)
    : null;

const webThumbTransition =
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

  /* Design 2 Architectural Rules */
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionHeadingStack: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  muted: {
    fontFamily: Lister.type.body,
    fontSize: 13,
    lineHeight: 18,
    color: Lister.color.inkMuted,
  },
  req: {
    fontFamily: Lister.type.bodySemi,
    color: Lister.color.danger,
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
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: Lister.color.surface,
    ...webPointer,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
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

  /* Policy matrix rows */
  policyRow: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 11,
  },
  policyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
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
  policyCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  policyTitle: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 13.5,
    lineHeight: 18,
    color: Lister.color.ink,
  },
  policySub: {
    fontFamily: Lister.type.body,
    fontSize: 12,
    lineHeight: 16,
    color: Lister.color.inkMuted,
  },
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
    minHeight: 36,
    paddingHorizontal: 8,
    paddingVertical: 7,
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

  /* Quiet hours switch row */
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...webPointer,
  },
  switchTitle: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 13.5,
    lineHeight: 18,
    color: Lister.color.ink,
  },
  switchTrack: {
    width: 40,
    height: 24,
    borderRadius: 12,
    padding: 3,
    backgroundColor: Lister.color.border,
    justifyContent: "center",
    flexShrink: 0,
  },
  switchTrackOn: {
    backgroundColor: Lister.color.primary,
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Lister.color.surface,
    transform: [{ translateX: 0 }],
    ...(Platform.OS === "web"
      ? ({ boxShadow: "0 1px 2px rgba(26, 26, 26, 0.22)" } as ViewStyle)
      : {
          shadowColor: "#1A1A1A",
          shadowOpacity: 0.2,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 1 },
          elevation: 2,
        }),
  },
  switchThumbOn: {
    transform: [{ translateX: 16 }],
  },
  pressed: {
    opacity: 0.9,
  },
});

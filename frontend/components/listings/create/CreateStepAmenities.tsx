import { useDesktopDesign, useLayoutWidth } from "@/components/ui/DesktopDesign";
import { BuildingAccessFields } from "./CreateStepSpecs";
import { patchOverride, resetOverride } from "@/features/listings/create/unitDrafts";
import type { CreateListingDraft } from "@/features/listings/create/draft";
import { Ionicons } from "@expo/vector-icons";
import { useState, type ComponentProps, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Enter } from "@/components/lister/Enter";
import { LText } from "@/components/lister/Typography";
import { CutClockField } from "@/components/listings/create/CutClockField";
import { SelectableCard } from "@/components/listings/create/SelectableCard";
import { SegmentedPills } from "@/components/listings/create/SegmentedPills";
import {
  WizardFieldGroup,
  WizardFieldLabel,
} from "@/components/listings/create/WizardField";
import {
  AMENITY_OPTIONS,
  GENERATOR_AMP_OPTIONS,
} from "@/constants/listingWizard";
import { Lister } from "@/constants/listerTheme";
import {
  POWER_HOURS_OPTIONS,
  POWER_SOURCE_OPTIONS,
  STATE_POWER_AR,
  legacyElectricity,
  powerFromLegacy,
} from "@/lib/electricityFacts";
import { WaterSectionMarker } from "@/features/listings/create/WizardArtSync";
import { useListingForm } from "@/features/listings/forms/ListingFormContext";
import {
  MAX_CUT_WINDOWS,
  cutHoursFromWindows,
  emptyCutWindow,
  hoursWithPowerFromWindows,
  type CutWindow,
} from "@/lib/electricityCuts";
import {
  HOT_WATER_OPTIONS,
  WATER_SOURCE_OPTIONS,
  legacyWaterStatus,
  sourcesFromLegacyWater,
} from "@/lib/waterFacts";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { HotWater, PowerHours, PowerSource, WaterSource } from "@/types/listing";

type Ion = ComponentProps<typeof Ionicons>["name"];

export type UtilitiesLook = "1" | "2";

const LOOK_STORAGE_KEY = "studently.utilitiesVariant";
const LOOK_VARIANTS: readonly UtilitiesLook[] = ["1", "2"];

function readInitialUtilitiesLook(): UtilitiesLook {
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

export function useUtilitiesLook(): [UtilitiesLook, (next: UtilitiesLook) => void] {
  const [look, setLookState] = useState<UtilitiesLook>(readInitialUtilitiesLook);

  function setLook(next: UtilitiesLook) {
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

export function UtilitiesLookToggle({
  look,
  onChange,
}: {
  look: UtilitiesLook;
  onChange: (next: UtilitiesLook) => void;
}) {
  const { styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);

  return (
    <View
      testID="utilities-look-toggle"
      accessibilityRole="radiogroup"
      accessibilityLabel="Utilities step design variant"
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

const ELEC_KEYS = ["electricity", "powerSources", "powerHours", "hasSolar"] as const;

const CUT_KEYS = [
  "electricityCutWindows",
  "electricityCutsStart",
  "electricityCutsEnd",
  "electricityHoursOn",
] as const;

const POWER_SOURCE_META: Record<
  PowerSource,
  { label: string; sub: string; icon: Ion }
> = {
  state_power: { label: "State power", sub: STATE_POWER_AR, icon: "flash-outline" },
  generator: { label: "Generator", sub: "Ishtirak", icon: "hardware-chip-outline" },
  solar: { label: "Solar", sub: "Panels / backup", icon: "sunny-outline" },
};

const POWER_HOURS_META: Record<
  PowerHours,
  { label: string; sub: string; icon: Ion }
> = {
  always: { label: "24/7 power", sub: "No scheduled outages", icon: "checkmark-circle-outline" },
  scheduled_cuts: { label: "Scheduled cuts", sub: "Daily outage windows", icon: "time-outline" },
};

const WATER_SOURCE_META: Record<
  WaterSource,
  { label: string; sub: string; icon: Ion }
> = {
  state_water: { label: "State water", sub: "مي الدولة", icon: "water-outline" },
  salty_water: { label: "Well water", sub: "Salty / building well", icon: "layers-outline" },
  tank_delivery: { label: "Tank delivery", sub: "Citerne truck", icon: "cube-outline" },
};

const HOT_WATER_META: Record<HotWater, { label: string; sub: string }> = {
  always: { label: "Always", sub: "Solar, gas, or generator" },
  state_power: { label: "With state power", sub: STATE_POWER_AR },
  none: { label: "None", sub: "Cold water only" },
};

function pairItems<T>(items: T[]): [T, T | null][] {
  const rows: [T, T | null][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push([items[i], items[i + 1] ?? null]);
  }
  return rows;
}

function FieldSource({
  label,
  keys,
  draft,
  onReset,
}: {
  label: string;
  keys: readonly string[];
  draft: CreateListingDraft;
  onReset: (keys: readonly string[]) => void;
}) {
  const { size: designSize } = useDesktopDesign();
  if (!draft.sharedValues) return null;
  const overridden = keys.some((key) => draft.differentFields?.includes(key));
  if (!overridden) {
    return (
      <LText variant="caption" tone="muted">
        Same as building
      </LText>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Reset ${label} to building`}
      onPress={() => onReset(keys)}
      style={{ alignSelf: "flex-start", paddingVertical: designSize(4) }}
    >
      <LText variant="caption" style={{ color: Lister.color.primary }}>
        Reset to building
      </LText>
    </Pressable>
  );
}

function IncludedInRent({ children }: { children: ReactNode }) {
  const { styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);

  return (
    <View style={styles.included}>
      <LText variant="caption" tone="muted" style={styles.includedLabel}>
        Included in rent
      </LText>
      {children}
    </View>
  );
}

function SwitchRow({
  icon,
  title,
  subtitle,
  badge,
  checked,
  onToggle,
  divided = false,
  indented = false,
  reducedMotion = false,
  footer,
}: {
  icon: Ion;
  title: string;
  subtitle?: string;
  badge?: string;
  checked: boolean;
  onToggle: () => void;
  divided?: boolean;
  indented?: boolean;
  reducedMotion?: boolean;
  footer?: ReactNode;
}) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);

  return (
    <View style={[divided && styles.switchRowDivided, indented && styles.switchRowIndentedWrap]}>
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={title}
        accessibilityState={{ checked }}
        onPress={onToggle}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.switchRow,
          indented && styles.switchRowIndented,
          !reducedMotion && webTransition,
          hovered && styles.switchRowHover,
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.switchIconBox, checked && styles.switchIconBoxOn]}>
          <Ionicons
            name={icon}
            size={designSize(17)}
            color={checked ? Lister.color.primary : Lister.color.inkMuted}
          />
        </View>
        <View style={styles.switchCopy}>
          <View style={styles.switchTitleRow}>
            <LText variant="caption" style={styles.switchTitle}>
              {title}
            </LText>
            {badge ? (
              <View style={[styles.rentTag, checked && styles.rentTagOn]}>
                <LText
                  variant="caption"
                  style={[styles.rentTagText, checked && styles.rentTagTextOn]}
                >
                  {badge}
                </LText>
              </View>
            ) : null}
          </View>
          {subtitle ? (
            <LText variant="caption" style={styles.switchSub}>
              {subtitle}
            </LText>
          ) : null}
        </View>
        <View
          style={[
            styles.switchTrack,
            checked && styles.switchTrackOn,
            !reducedMotion && webSwitchTransition,
          ]}
        >
          <View
            style={[
              styles.switchThumb,
              checked && styles.switchThumbOn,
              !reducedMotion && webThumbTransition,
            ]}
          />
        </View>
      </Pressable>
      {footer ? <View style={styles.switchFooter}>{footer}</View> : null}
    </View>
  );
}

export function CreateStepAmenities({ look = "2" }: { look?: UtilitiesLook } = {}) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  const layoutWidth = useLayoutWidth();
  const reducedMotion = useReducedMotion();
  const wideRow = layoutWidth >= 480;
  const twoColAmenities = layoutWidth >= 360;

  const { draft, patch, fieldInvalid, formChrome } = useListingForm();
  const change = (values: Partial<CreateListingDraft>, keys: readonly string[]) =>
    patchOverride(draft, patch, values, keys);
  const reset = (keys: readonly string[]) => resetOverride(draft, patch, keys);
  const sourcesInvalid = fieldInvalid("powerSources");
  const hoursInvalid = fieldInvalid("powerHours");
  const ampsInvalid = fieldInvalid("generatorAmperes");
  const windowsInvalid = fieldInvalid("electricityCutWindows");
  const waterInvalid = fieldInvalid("waterSources");
  const hotWaterInvalid = fieldInvalid("hotWater");
  const power = powerFromLegacy(draft);
  const waterSources = sourcesFromLegacyWater(draft.water, draft.waterSources);
  const showUtilityDisclaimer =
    formChrome !== "edit" &&
    (power.sources.includes("generator") ||
      power.sources.includes("solar") ||
      draft.elevator24_7);

  const windows: CutWindow[] =
    draft.electricityCutWindows?.length > 0
      ? draft.electricityCutWindows
      : [emptyCutWindow()];
  const hoursOn = hoursWithPowerFromWindows(windows);
  const cutHours = cutHoursFromWindows(windows);
  const completeCount = windows.filter((w) => w.start && w.end).length;
  const showAmps =
    power.hours === "scheduled_cuts" || power.sources.includes("generator");

  function setWindows(next: CutWindow[]) {
    const first = next[0] ?? emptyCutWindow();
    change(
      {
        electricityCutWindows: next,
        electricityCutsStart: first.start,
        electricityCutsEnd: first.end,
        electricityHoursOn: hoursWithPowerFromWindows(next),
      },
      CUT_KEYS,
    );
  }

  function patchWindow(index: number, field: "start" | "end", value: string) {
    setWindows(
      windows.map((w, i) => (i === index ? { ...w, [field]: value } : w)),
    );
  }

  function togglePowerSource(value: PowerSource) {
    const selected = power.sources.includes(value);
    const next: PowerSource[] = selected
      ? power.sources.filter((source) => source !== value)
      : [...power.sources, value];
    change(
      {
        powerSources: next,
        powerHours: power.hours,
        hasSolar: next.includes("solar"),
        electricity:
          next.length && power.hours
            ? legacyElectricity(next, power.hours)
            : draft.electricity,
      },
      ELEC_KEYS,
    );
  }

  function selectPowerHours(hours: PowerHours) {
    const electricity = power.sources.length
      ? legacyElectricity(power.sources, hours)
      : draft.electricity;
    if (draft.sharedValues) {
      change({ powerHours: hours, electricity }, ELEC_KEYS);
      return;
    }
    patch({
      powerHours: hours,
      electricity,
      generatorAmperes:
        hours === "always" && !power.sources.includes("generator")
          ? null
          : draft.generatorAmperes,
      electricityCutWindows:
        hours === "scheduled_cuts" && windows.length === 0
          ? [emptyCutWindow()]
          : draft.electricityCutWindows,
    });
  }

  function toggleWaterSource(value: WaterSource) {
    const selected = waterSources.includes(value);
    const next: WaterSource[] = selected
      ? waterSources.filter((source) => source !== value)
      : [...waterSources, value];
    change(
      {
        waterSources: next,
        water: next.length ? legacyWaterStatus(next) : null,
      },
      ["water", "waterSources"],
    );
  }

  function toggleAmenity(slug: string) {
    const on = draft.amenities.includes(slug);
    change(
      {
        amenities: on
          ? draft.amenities.filter((s) => s !== slug)
          : [...draft.amenities, slug],
      },
      ["amenities"],
    );
  }

  /* Design 1: Original stacked SelectableCard layout */
  if (look === "1") {
    return (
      <View style={{ gap: designSize(16) }}>
        {formChrome === "edit" ? <BuildingAccessFields /> : null}
        <Enter>
          <WizardFieldLabel required>What power sources does the place have?</WizardFieldLabel>
          <FieldSource label="electricity" keys={ELEC_KEYS} draft={draft} onReset={reset} />
          <View style={{ height: designSize(8) }} />
          <WizardFieldGroup field="powerSources" style={{ gap: designSize(8) }}>
            {POWER_SOURCE_OPTIONS.map((option) => {
              const selected = power.sources.includes(option.value);
              return (
                <SelectableCard
                  key={option.value}
                  selected={selected}
                  title={option.title}
                  icon={option.value === "solar" ? "sunny-outline" : "flash-outline"}
                  error={sourcesInvalid}
                  onPress={() => togglePowerSource(option.value)}
                />
              );
            })}
          </WizardFieldGroup>
          <View style={{ height: designSize(16) }} />
          <WizardFieldLabel required>How many hours of power does the place get?</WizardFieldLabel>
          <View style={{ height: designSize(8) }} />
          <WizardFieldGroup field="powerHours" style={{ gap: designSize(8) }}>
            {POWER_HOURS_OPTIONS.map((option) => (
              <SelectableCard
                key={option.value}
                selected={power.hours === option.value}
                title={option.title}
                icon="time-outline"
                error={hoursInvalid}
                onPress={() => selectPowerHours(option.value)}
              />
            ))}
          </WizardFieldGroup>
          {showAmps ? (
            <>
              <View style={{ height: designSize(8) }} />
              <WizardFieldLabel required>Generator / ishtirak amps</WizardFieldLabel>
              <FieldSource label="generator amps" keys={["generatorAmperes"]} draft={draft} onReset={reset} />
              <View style={{ height: designSize(8) }} />
              <WizardFieldGroup field="generatorAmperes">
                <SegmentedPills
                  options={GENERATOR_AMP_OPTIONS.map((n) => ({
                    value: String(n),
                    label: `${n}A`,
                  }))}
                  value={
                    draft.generatorAmperes != null
                      ? String(draft.generatorAmperes)
                      : null
                  }
                  onChange={(v) => change({ generatorAmperes: Number(v) }, ["generatorAmperes"])}
                />
              </WizardFieldGroup>
            </>
          ) : null}
        </Enter>
        {power.hours === "scheduled_cuts" ? (
          <Enter delay={40}>
            <View style={[styles.cutsBox, windowsInvalid && styles.cutsBoxError]}>
              <WizardFieldLabel required>When are the cuts?</WizardFieldLabel>
              <FieldSource label="cut windows" keys={CUT_KEYS} draft={draft} onReset={reset} />
              <LText variant="caption" tone="muted">
                Daily windows with no EDL power. Add each cut — overnight included.
              </LText>
              {windows.map((w, i) => (
                <View key={`cut-${i}`} style={styles.periodCard}>
                  <View style={styles.periodHead}>
                    <LText variant="caption" style={styles.periodLabel}>
                      Period {i + 1}
                    </LText>
                    {windows.length > 1 ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove period ${i + 1}`}
                        onPress={() => setWindows(windows.filter((_, j) => j !== i))}
                        hitSlop={8}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={designSize(18)}
                          color={Lister.color.danger}
                        />
                      </Pressable>
                    ) : null}
                  </View>
                  <View style={styles.timeRow}>
                    <CutClockField
                      label="Cuts from"
                      value={w.start}
                      defaultMeridiem={i === 0 ? "pm" : "am"}
                      error={fieldInvalid(`electricityCutWindows.${i}`)}
                      onChange={(start) => patchWindow(i, "start", start)}
                    />
                    <CutClockField
                      label="Cuts until"
                      value={w.end}
                      defaultMeridiem={i === 0 ? "pm" : "am"}
                      error={fieldInvalid(`electricityCutWindows.${i}`)}
                      onChange={(end) => patchWindow(i, "end", end)}
                    />
                  </View>
                </View>
              ))}
              {windows.length < MAX_CUT_WINDOWS ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add another cut period"
                  onPress={() => setWindows([...windows, emptyCutWindow()])}
                  style={styles.addPeriod}
                >
                  <View style={styles.addPlus}>
                    <Ionicons name="add" size={designSize(22)} color={Lister.color.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <LText variant="body" style={styles.addTitle}>
                      Add another cut period
                    </LText>
                    <LText variant="caption" tone="muted">
                      e.g. 6 PM–9 PM and 3 AM–5 AM
                    </LText>
                  </View>
                </Pressable>
              ) : null}
              <View style={styles.hoursCard}>
                <LText variant="caption" tone="muted">
                  Hours with electricity
                </LText>
                <LText variant="title" style={styles.hoursValue}>
                  {hoursOn != null ? `${hoursOn}/24` : "—"}
                </LText>
                <LText variant="caption" tone="muted">
                  {hoursOn == null
                    ? "Fill each period to calculate."
                    : `${cutHours}h of cuts across ${completeCount} period${completeCount === 1 ? "" : "s"}`}
                </LText>
              </View>
            </View>
          </Enter>
        ) : null}
        <Enter delay={80}>
          <IncludedInRent>
            <SelectableCard
              selected={draft.generatorIncluded}
              title="Generator fee included in rent"
              body="Off = billed by meter / ishtirak separately."
              icon="cash-outline"
              onPress={() => change({ generatorIncluded: !draft.generatorIncluded }, ["generatorIncluded"])}
            />
            <FieldSource label="generator fee" keys={["generatorIncluded"]} draft={draft} onReset={reset} />
          </IncludedInRent>
        </Enter>
        {showUtilityDisclaimer ? (
          <View
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
            style={styles.disclaimer}
          >
            <Ionicons
              name="warning-outline"
              size={designSize(18)}
              color={Lister.color.warning}
            />
            <View style={styles.disclaimerCopy}>
              <LText variant="caption" style={styles.disclaimerTitle}>
                Inaccurate utility claims will result in your post being
                permanently removed without a refund.
              </LText>
              <LText variant="caption" tone="muted">
                Renters can report false utilities. We review and may remove the
                listing.
              </LText>
            </View>
          </View>
        ) : null}
        <Enter delay={140}>
          <WaterSectionMarker />
          <WizardFieldLabel required>Where does the water come from?</WizardFieldLabel>
          <FieldSource label="water" keys={["water", "waterSources"]} draft={draft} onReset={reset} />
          <View style={{ height: designSize(8) }} />
          <WizardFieldGroup field="waterSources" style={{ gap: designSize(8) }}>
            {WATER_SOURCE_OPTIONS.map((option) => {
              const selected = waterSources.includes(option.value);
              return (
                <SelectableCard
                  key={option.value}
                  selected={selected}
                  title={option.title}
                  icon="water-outline"
                  error={waterInvalid}
                  onPress={() => toggleWaterSource(option.value)}
                />
              );
            })}
          </WizardFieldGroup>
          <View style={{ height: designSize(16) }} />
          <WizardFieldLabel required>Is there hot water?</WizardFieldLabel>
          <View style={{ height: designSize(8) }} />
          <WizardFieldGroup field="hotWater" style={{ gap: designSize(8) }}>
            {HOT_WATER_OPTIONS.map((option) => (
              <SelectableCard
                key={option.value}
                selected={draft.hotWater === option.value}
                title={option.title}
                body={option.body}
                icon="flame-outline"
                error={hotWaterInvalid}
                onPress={() => change({ hotWater: option.value }, ["hotWater"])}
              />
            ))}
          </WizardFieldGroup>
          <View style={{ height: designSize(16) }} />
          <IncludedInRent>
            <SelectableCard
              selected={draft.waterBillIncluded}
              title="Water bill included in rent"
              body="Off = renter pays municipality / tanker / overage separately."
              icon="cash-outline"
              onPress={() =>
                change({ waterBillIncluded: !draft.waterBillIncluded }, ["waterBillIncluded"])
              }
            />
            <FieldSource label="water bill" keys={["waterBillIncluded"]} draft={draft} onReset={reset} />
          </IncludedInRent>
        </Enter>
        <Enter delay={180}>
          <IncludedInRent>
            <SelectableCard
              selected={draft.wifiIncluded}
              title="High-speed Wi-Fi included"
              icon="wifi-outline"
              onPress={() => change({ wifiIncluded: !draft.wifiIncluded }, ["wifiIncluded"])}
            />
            <FieldSource label="Wi-Fi" keys={["wifiIncluded"]} draft={draft} onReset={reset} />
          </IncludedInRent>
          <View style={{ height: designSize(8) }} />
          <SelectableCard
            selected={draft.routerUps}
            title="Router on UPS"
            icon="battery-charging-outline"
            onPress={() => change({ routerUps: !draft.routerUps }, ["routerUps"])}
          />
          <FieldSource label="router UPS" keys={["routerUps"]} draft={draft} onReset={reset} />
          <View style={{ height: designSize(8) }} />
          <SelectableCard
            selected={draft.conciergeIncluded}
            title="Concierge / natour included"
            icon="person-outline"
            onPress={() => change({ conciergeIncluded: !draft.conciergeIncluded }, ["conciergeIncluded"])}
          />
          <FieldSource label="concierge" keys={["conciergeIncluded"]} draft={draft} onReset={reset} />
          <View style={{ height: designSize(8) }} />
          <IncludedInRent>
            <SelectableCard
              selected={draft.buildingFeesIncluded}
              title="Building / common fees included"
              body="Syndic, elevator fund, shared generator share beyond your unit meter — if billed with rent."
              icon="cash-outline"
              onPress={() =>
                change({ buildingFeesIncluded: !draft.buildingFeesIncluded }, ["buildingFeesIncluded"])
              }
            />
            <FieldSource label="building fees" keys={["buildingFeesIncluded"]} draft={draft} onReset={reset} />
          </IncludedInRent>
          <View style={{ height: designSize(8) }} />
          <IncludedInRent>
            <SelectableCard
              selected={draft.cookingGasIncluded}
              title="Cooking gas included"
              icon="flame-outline"
              onPress={() => change({ cookingGasIncluded: !draft.cookingGasIncluded }, ["cookingGasIncluded"])}
            />
            <FieldSource label="cooking gas" keys={["cookingGasIncluded"]} draft={draft} onReset={reset} />
          </IncludedInRent>
        </Enter>
        <Enter delay={220}>
          <LText variant="subtitle">Interior amenities</LText>
          <FieldSource label="amenities" keys={["amenities"]} draft={draft} onReset={reset} />
          <View style={styles.grid}>
            {AMENITY_OPTIONS.map((opt) => {
              const on = draft.amenities.includes(opt.slug);
              return (
                <Pressable
                  key={opt.slug}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => toggleAmenity(opt.slug)}
                  style={[styles.cell, on && styles.cellOn]}
                >
                  <Ionicons
                    name={opt.icon}
                    size={designSize(20)}
                    color={on ? Lister.color.primary : Lister.color.inkMuted}
                  />
                  <LText variant="caption" style={on ? styles.cellLabelOn : undefined}>
                    {opt.label}
                  </LText>
                </Pressable>
              );
            })}
          </View>
          {draft.amenities.includes("parking") ? (
            <View style={{ marginTop: designSize(8) }}>
              <IncludedInRent>
                <SelectableCard
                  selected={draft.parkingIncludedInRent}
                  title="Parking included in rent"
                  body="Off = parking is extra."
                  icon="cash-outline"
                  onPress={() =>
                    change({ parkingIncludedInRent: !draft.parkingIncludedInRent }, ["parkingIncludedInRent"])
                  }
                />
                <FieldSource label="parking fee" keys={["parkingIncludedInRent"]} draft={draft} onReset={reset} />
              </IncludedInRent>
            </View>
          ) : null}
        </Enter>
      </View>
    );
  }

  const fieldSource = (label: string, keys: readonly string[]) =>
    draft.sharedValues ? (
      <FieldSource label={label} keys={keys} draft={draft} onReset={reset} />
    ) : null;

  /* Design 2: Redesigned architectural utilities & amenities step */
  const amenityRows = twoColAmenities
    ? pairItems(AMENITY_OPTIONS)
    : AMENITY_OPTIONS.map((opt) => [opt, null] as [(typeof AMENITY_OPTIONS)[number], null]);
  const selectedAmenityCount = draft.amenities.length;

  return (
    <View style={styles.v2Root} testID="utilities-v2">
      {/* 1. Power & electricity */}
      <View style={styles.v2Section}>
        <View style={styles.v2SectionHeader}>
          <View style={styles.v2SectionHeadingStack}>
            <WizardFieldLabel required>Power & electricity</WizardFieldLabel>
            <LText variant="caption" style={styles.v2Muted}>
              Select all power sources and daily availability.
            </LText>
          </View>
          <FieldSource label="electricity" keys={ELEC_KEYS} draft={draft} onReset={reset} />
        </View>

        {/* Power sources (multi-select checkboxes) */}
        <View style={styles.v2SubBlock}>
          <LText variant="caption" style={styles.v2FieldLabel}>
            Power sources
          </LText>
          <View
            style={[
              styles.v2Shell,
              wideRow && styles.v2HorizontalShell,
              sourcesInvalid && styles.v2ShellInvalid,
            ]}
          >
            {POWER_SOURCE_OPTIONS.map((option, idx) => {
              const selected = power.sources.includes(option.value);
              const meta = POWER_SOURCE_META[option.value];
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="checkbox"
                  accessibilityLabel={option.title}
                  accessibilityState={{ checked: selected }}
                  onPress={() => togglePowerSource(option.value)}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                    wideRow ? styles.v2TileCol : styles.v2ListRow,
                    idx > 0 && (wideRow ? styles.v2ColDivided : styles.v2RowDivided),
                    !reducedMotion && webTransition,
                    hovered && !selected && styles.v2CellHover,
                    selected && styles.v2CellSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  {wideRow ? (
                    <>
                      <View style={styles.v2TileTop}>
                        <Ionicons
                          name={meta.icon}
                          size={designSize(18)}
                          color={selected ? Lister.color.primary : Lister.color.inkMuted}
                        />
                        <View style={[styles.v2Checkbox, selected && styles.v2CheckboxOn]}>
                          {selected ? (
                            <Ionicons
                              name="checkmark"
                              size={designSize(12)}
                              color={Lister.color.surface}
                            />
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.v2TileCopy}>
                        <LText
                          variant="caption"
                          style={[styles.v2CellTitle, selected && styles.v2CellTitleOn]}
                        >
                          {meta.label}
                        </LText>
                        <LText variant="caption" style={styles.v2CellSub}>
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
                      <View style={styles.v2RowCopy}>
                        <LText
                          variant="caption"
                          style={[styles.v2CellTitle, selected && styles.v2CellTitleOn]}
                        >
                          {meta.label}
                        </LText>
                        <LText variant="caption" style={styles.v2CellSub}>
                          {meta.sub}
                        </LText>
                      </View>
                      <View style={[styles.v2Checkbox, selected && styles.v2CheckboxOn]}>
                        {selected ? (
                          <Ionicons
                            name="checkmark"
                            size={designSize(12)}
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
          {sourcesInvalid ? (
            <LText variant="caption" style={styles.v2ErrorText} accessibilityRole="alert">
              Select at least one power source.
            </LText>
          ) : null}
        </View>

        {/* Power availability (single-select radio) */}
        <View style={styles.v2SubBlock}>
          <LText variant="caption" style={styles.v2FieldLabel}>
            Availability
          </LText>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Power availability"
            style={[
              styles.v2Shell,
              styles.v2HorizontalShell,
              hoursInvalid && styles.v2ShellInvalid,
            ]}
          >
            {POWER_HOURS_OPTIONS.map((option, idx) => {
              const selected = power.hours === option.value;
              const meta = POWER_HOURS_META[option.value];
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityLabel={option.title}
                  accessibilityState={{ checked: selected }}
                  onPress={() => selectPowerHours(option.value)}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.v2RadioChoice,
                    idx > 0 && styles.v2ColDivided,
                    !reducedMotion && webTransition,
                    hovered && !selected && styles.v2CellHover,
                    selected && styles.v2CellSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.v2RowCopy}>
                    <LText
                      variant="caption"
                      style={[styles.v2CellTitle, selected && styles.v2CellTitleOn]}
                    >
                      {meta.label}
                    </LText>
                    <LText variant="caption" style={styles.v2CellSub}>
                      {meta.sub}
                    </LText>
                  </View>
                  <View style={[styles.v2Radio, selected && styles.v2RadioOn]}>
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
          {hoursInvalid ? (
            <LText variant="caption" style={styles.v2ErrorText} accessibilityRole="alert">
              Choose whether power is 24/7 or has scheduled cuts.
            </LText>
          ) : null}
        </View>

        {/* Conditional Generator / ishtirak capacity */}
        {showAmps ? (
          <View style={styles.v2SubBlock}>
            <View style={styles.v2InlineHeader}>
              <LText variant="caption" style={styles.v2FieldLabel}>
                Generator / ishtirak amps <LText variant="caption" style={styles.v2Req}>*</LText>
              </LText>
              <FieldSource
                label="generator amps"
                keys={["generatorAmperes"]}
                draft={draft}
                onReset={reset}
              />
            </View>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel="Generator amperes"
              style={[
                styles.v2Shell,
                styles.v2HorizontalShell,
                ampsInvalid && styles.v2ShellInvalid,
              ]}
            >
              {GENERATOR_AMP_OPTIONS.map((amp, idx) => {
                const selected = draft.generatorAmperes === amp;
                return (
                  <Pressable
                    key={amp}
                    accessibilityRole="radio"
                    accessibilityLabel={`${amp} amps`}
                    accessibilityState={{ checked: selected }}
                    onPress={() => change({ generatorAmperes: amp }, ["generatorAmperes"])}
                    style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                      styles.v2AmpSegment,
                      idx > 0 && styles.v2ColDivided,
                      !reducedMotion && webTransition,
                      hovered && !selected && styles.v2CellHover,
                      selected && styles.v2AmpSegmentOn,
                      pressed && styles.pressed,
                    ]}
                  >
                    <LText
                      variant="caption"
                      style={[styles.v2AmpText, selected && styles.v2AmpTextOn]}
                    >
                      {amp}A
                    </LText>
                  </Pressable>
                );
              })}
            </View>
            {ampsInvalid ? (
              <LText variant="caption" style={styles.v2ErrorText} accessibilityRole="alert">
                Select the generator amperage available to this place.
              </LText>
            ) : null}
          </View>
        ) : null}

        {/* Conditional Scheduled cut windows */}
        {power.hours === "scheduled_cuts" ? (
          <View
            style={[styles.v2Shell, windowsInvalid && styles.v2ShellInvalid]}
            testID="utilities-cut-schedule"
          >
            <View style={styles.v2ScheduleHeader}>
              <View style={styles.v2RowCopy}>
                <LText variant="caption" style={styles.v2CellTitle}>
                  Daily cut windows <LText variant="caption" style={styles.v2Req}>*</LText>
                </LText>
                <LText variant="caption" style={styles.v2CellSub}>
                  Add each daily outage window (overnight included).
                </LText>
                <FieldSource label="cut windows" keys={CUT_KEYS} draft={draft} onReset={reset} />
              </View>
              <View style={styles.v2HoursPill}>
                <LText variant="caption" style={styles.v2HoursPillValue}>
                  {hoursOn != null ? `${hoursOn}/24h` : "—/24h"}
                </LText>
                <LText variant="caption" style={styles.v2HoursPillSub}>
                  {hoursOn != null ? `${cutHours}h cuts` : "power on"}
                </LText>
              </View>
            </View>

            {windows.map((w, i) => (
              <View
                key={`cut-${i}`}
                style={[styles.v2PeriodRow, i > 0 && styles.v2RowDivided]}
              >
                <View style={styles.v2PeriodMeta}>
                  <LText variant="caption" style={styles.v2PeriodTitle}>
                    Period {i + 1}
                  </LText>
                  {windows.length > 1 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove period ${i + 1}`}
                      onPress={() => setWindows(windows.filter((_, j) => j !== i))}
                      hitSlop={8}
                      style={styles.v2RemoveBtn}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={designSize(15)}
                        color={Lister.color.danger}
                      />
                      <LText variant="caption" style={styles.v2RemoveText}>
                        Remove
                      </LText>
                    </Pressable>
                  ) : null}
                </View>
                <View style={styles.timeRow}>
                  <CutClockField
                    label="Cuts from"
                    value={w.start}
                    defaultMeridiem={i === 0 ? "pm" : "am"}
                    error={fieldInvalid(`electricityCutWindows.${i}`)}
                    onChange={(start) => patchWindow(i, "start", start)}
                  />
                  <CutClockField
                    label="Cuts until"
                    value={w.end}
                    defaultMeridiem={i === 0 ? "pm" : "am"}
                    error={fieldInvalid(`electricityCutWindows.${i}`)}
                    onChange={(end) => patchWindow(i, "end", end)}
                  />
                </View>
              </View>
            ))}

            {windows.length < MAX_CUT_WINDOWS ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add another cut period"
                onPress={() => setWindows([...windows, emptyCutWindow()])}
                style={({ hovered, pressed }: { pressed: boolean; hovered?: boolean }) => [
                  styles.v2AddCutRow,
                  !reducedMotion && webTransition,
                  hovered && styles.switchRowHover,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={designSize(17)}
                  color={Lister.color.primary}
                />
                <LText variant="caption" style={styles.v2AddCutText}>
                  Add another cut period
                </LText>
                <LText variant="caption" style={styles.v2AddCutHint}>
                  e.g. 6 PM–9 PM & 3 AM–5 AM
                </LText>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Generator fee switch */}
        <View style={styles.v2Shell}>
          <SwitchRow
            icon="cash-outline"
            title="Generator fee included in rent"
            subtitle={
              draft.generatorIncluded
                ? "Monthly rent covers generator / ishtirak fees."
                : "Billed separately by meter or ishtirak."
            }
            checked={draft.generatorIncluded}
            onToggle={() =>
              change(
                { generatorIncluded: !draft.generatorIncluded },
                ["generatorIncluded"],
              )
            }
            reducedMotion={reducedMotion}
            footer={fieldSource("generator fee", ["generatorIncluded"])}
          />
        </View>

        {showUtilityDisclaimer ? (
          <View
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
            style={styles.v2Notice}
          >
            <Ionicons
              name="information-circle-outline"
              size={designSize(18)}
              color={Lister.color.warning}
            />
            <View style={styles.disclaimerCopy}>
              <LText variant="caption" style={styles.v2NoticeTitle}>
                Keep utility details accurate
              </LText>
              <LText variant="caption" style={styles.v2Muted}>
                Renters can report inaccurate generator, solar, or 24/7 elevator claims—false listings are removed without refund.
              </LText>
            </View>
          </View>
        ) : null}
      </View>

      {/* 2. Water & heating (scroll marker triggers Water Lottie illustration) */}
      <View style={styles.v2SectionDivided}>
        <WaterSectionMarker />
        <View style={styles.v2SectionHeader}>
          <View style={styles.v2SectionHeadingStack}>
            <WizardFieldLabel required>Water & heating</WizardFieldLabel>
            <LText variant="caption" style={styles.v2Muted}>
              How water reaches the building and when hot water runs.
            </LText>
          </View>
          <FieldSource
            label="water"
            keys={["water", "waterSources"]}
            draft={draft}
            onReset={reset}
          />
        </View>

        {/* Water sources (multi-select checkboxes) */}
        <View style={styles.v2SubBlock}>
          <LText variant="caption" style={styles.v2FieldLabel}>
            Water sources
          </LText>
          <View
            style={[
              styles.v2Shell,
              wideRow && styles.v2HorizontalShell,
              waterInvalid && styles.v2ShellInvalid,
            ]}
          >
            {WATER_SOURCE_OPTIONS.map((option, idx) => {
              const selected = waterSources.includes(option.value);
              const meta = WATER_SOURCE_META[option.value];
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="checkbox"
                  accessibilityLabel={option.title}
                  accessibilityState={{ checked: selected }}
                  onPress={() => toggleWaterSource(option.value)}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                    wideRow ? styles.v2TileCol : styles.v2ListRow,
                    idx > 0 && (wideRow ? styles.v2ColDivided : styles.v2RowDivided),
                    !reducedMotion && webTransition,
                    hovered && !selected && styles.v2CellHover,
                    selected && styles.v2CellSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  {wideRow ? (
                    <>
                      <View style={styles.v2TileTop}>
                        <Ionicons
                          name={meta.icon}
                          size={designSize(18)}
                          color={selected ? Lister.color.primary : Lister.color.inkMuted}
                        />
                        <View style={[styles.v2Checkbox, selected && styles.v2CheckboxOn]}>
                          {selected ? (
                            <Ionicons
                              name="checkmark"
                              size={designSize(12)}
                              color={Lister.color.surface}
                            />
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.v2TileCopy}>
                        <LText
                          variant="caption"
                          style={[styles.v2CellTitle, selected && styles.v2CellTitleOn]}
                        >
                          {meta.label}
                        </LText>
                        <LText variant="caption" style={styles.v2CellSub}>
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
                      <View style={styles.v2RowCopy}>
                        <LText
                          variant="caption"
                          style={[styles.v2CellTitle, selected && styles.v2CellTitleOn]}
                        >
                          {meta.label}
                        </LText>
                        <LText variant="caption" style={styles.v2CellSub}>
                          {meta.sub}
                        </LText>
                      </View>
                      <View style={[styles.v2Checkbox, selected && styles.v2CheckboxOn]}>
                        {selected ? (
                          <Ionicons
                            name="checkmark"
                            size={designSize(12)}
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
          {waterInvalid ? (
            <LText variant="caption" style={styles.v2ErrorText} accessibilityRole="alert">
              Select at least one water source.
            </LText>
          ) : null}
        </View>

        {/* Hot water (single-select radio) */}
        <View style={styles.v2SubBlock}>
          <LText variant="caption" style={styles.v2FieldLabel}>
            Hot water
          </LText>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Hot water availability"
            style={[
              styles.v2Shell,
              wideRow && styles.v2HorizontalShell,
              hotWaterInvalid && styles.v2ShellInvalid,
            ]}
          >
            {HOT_WATER_OPTIONS.map((option, idx) => {
              const selected = draft.hotWater === option.value;
              const meta = HOT_WATER_META[option.value];
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityLabel={option.title}
                  accessibilityState={{ checked: selected }}
                  onPress={() => change({ hotWater: option.value }, ["hotWater"])}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                    wideRow ? styles.v2TileCol : styles.v2ListRow,
                    idx > 0 && (wideRow ? styles.v2ColDivided : styles.v2RowDivided),
                    !reducedMotion && webTransition,
                    hovered && !selected && styles.v2CellHover,
                    selected && styles.v2CellSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  {wideRow ? (
                    <>
                      <View style={styles.v2TileTop}>
                        <LText
                          variant="caption"
                          style={[styles.v2CellTitle, selected && styles.v2CellTitleOn]}
                        >
                          {meta.label}
                        </LText>
                        <View style={[styles.v2Radio, selected && styles.v2RadioOn]}>
                          {selected ? (
                            <Ionicons
                              name="checkmark"
                              size={designSize(11)}
                              color={Lister.color.surface}
                            />
                          ) : null}
                        </View>
                      </View>
                      <LText variant="caption" style={styles.v2CellSub}>
                        {meta.sub}
                      </LText>
                    </>
                  ) : (
                    <>
                      <View style={styles.v2RowCopy}>
                        <LText
                          variant="caption"
                          style={[styles.v2CellTitle, selected && styles.v2CellTitleOn]}
                        >
                          {meta.label}
                        </LText>
                        <LText variant="caption" style={styles.v2CellSub}>
                          {meta.sub}
                        </LText>
                      </View>
                      <View style={[styles.v2Radio, selected && styles.v2RadioOn]}>
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
          {hotWaterInvalid ? (
            <LText variant="caption" style={styles.v2ErrorText} accessibilityRole="alert">
              Select hot water availability.
            </LText>
          ) : null}
        </View>

        {/* Water bill switch */}
        <View style={styles.v2Shell}>
          <SwitchRow
            icon="cash-outline"
            title="Water bill included in rent"
            subtitle={
              draft.waterBillIncluded
                ? "Municipality and tanker refills are covered in rent."
                : "Renter pays municipality / tanker / overage separately."
            }
            checked={draft.waterBillIncluded}
            onToggle={() =>
              change(
                { waterBillIncluded: !draft.waterBillIncluded },
                ["waterBillIncluded"],
              )
            }
            reducedMotion={reducedMotion}
            footer={fieldSource("water bill", ["waterBillIncluded"])}
          />
        </View>
      </View>

      {/* 3. Building access & included bills (unified switchboard) */}
      <View style={styles.v2SectionDivided}>
        <View style={styles.v2SectionHeadingStack}>
          <LText variant="subtitle">Building access & bills</LText>
          <LText variant="caption" style={styles.v2Muted}>
            Elevator access, internet backup, and shared bills included in rent.
          </LText>
        </View>

        <View style={styles.v2Shell}>
          <SwitchRow
            icon="swap-vertical-outline"
            title="Elevator in building"
            subtitle="Building has a passenger lift."
            checked={draft.hasElevator}
            onToggle={() => {
              const next = !draft.hasElevator;
              change(
                next
                  ? { hasElevator: true }
                  : { hasElevator: false, elevator24_7: false },
                next ? ["hasElevator"] : ["hasElevator", "elevator24_7"],
              );
            }}
            reducedMotion={reducedMotion}
            footer={fieldSource("elevator", ["hasElevator"])}
          />
          {draft.hasElevator || draft.elevator24_7 ? (
            <SwitchRow
              icon="flash-outline"
              title="Elevator works during power cuts"
              subtitle="24/7 lift backed up by generator or solar."
              checked={draft.elevator24_7}
              onToggle={() =>
                change({ elevator24_7: !draft.elevator24_7 }, ["elevator24_7"])
              }
              divided
              indented
              reducedMotion={reducedMotion}
              footer={fieldSource("elevator during cuts", ["elevator24_7"])}
            />
          ) : null}
          <SwitchRow
            icon="wifi-outline"
            title="High-speed Wi-Fi"
            subtitle={
              draft.wifiIncluded
                ? "Included in monthly rent."
                : "Renter sets up or pays separately."
            }
            badge="In rent"
            checked={draft.wifiIncluded}
            onToggle={() =>
              change({ wifiIncluded: !draft.wifiIncluded }, ["wifiIncluded"])
            }
            divided
            reducedMotion={reducedMotion}
            footer={fieldSource("Wi-Fi", ["wifiIncluded"])}
          />
          <SwitchRow
            icon="battery-charging-outline"
            title="Router on UPS"
            subtitle="Internet stays up when power switches or cuts."
            checked={draft.routerUps}
            onToggle={() =>
              change({ routerUps: !draft.routerUps }, ["routerUps"])
            }
            divided
            reducedMotion={reducedMotion}
            footer={fieldSource("router UPS", ["routerUps"])}
          />
          <SwitchRow
            icon="person-outline"
            title="Concierge / natour"
            subtitle="On-site building caretaker included."
            checked={draft.conciergeIncluded}
            onToggle={() =>
              change(
                { conciergeIncluded: !draft.conciergeIncluded },
                ["conciergeIncluded"],
              )
            }
            divided
            reducedMotion={reducedMotion}
            footer={fieldSource("concierge", ["conciergeIncluded"])}
          />
          <SwitchRow
            icon="business-outline"
            title="Building / common fees"
            subtitle="Syndic, elevator fund, and shared upkeep."
            badge="In rent"
            checked={draft.buildingFeesIncluded}
            onToggle={() =>
              change(
                { buildingFeesIncluded: !draft.buildingFeesIncluded },
                ["buildingFeesIncluded"],
              )
            }
            divided
            reducedMotion={reducedMotion}
            footer={fieldSource("building fees", ["buildingFeesIncluded"])}
          />
          <SwitchRow
            icon="flame-outline"
            title="Cooking gas"
            subtitle="Gas cylinders or line covered with rent."
            badge="In rent"
            checked={draft.cookingGasIncluded}
            onToggle={() =>
              change(
                { cookingGasIncluded: !draft.cookingGasIncluded },
                ["cookingGasIncluded"],
              )
            }
            divided
            reducedMotion={reducedMotion}
            footer={fieldSource("cooking gas", ["cookingGasIncluded"])}
          />
        </View>
      </View>

      {/* 4. Interior amenities (unified 2-col hairline checklist) */}
      <View style={styles.v2SectionDivided}>
        <View style={styles.v2SectionHeader}>
          <View style={styles.v2SectionHeadingStack}>
            <LText variant="subtitle">Interior amenities</LText>
            <LText variant="caption" style={styles.v2Muted}>
              Appliances, climate control, and shared perks.
            </LText>
          </View>
          <View style={styles.v2CountRight}>
            {selectedAmenityCount > 0 ? (
              <LText variant="caption" style={styles.v2CountBadge}>
                {selectedAmenityCount} selected
              </LText>
            ) : (
              <LText variant="caption" style={styles.v2Muted}>
                Optional
              </LText>
            )}
            <FieldSource label="amenities" keys={["amenities"]} draft={draft} onReset={reset} />
          </View>
        </View>

        <View style={styles.v2Shell}>
          {amenityRows.map(([left, right], rowIdx) => {
            const renderAmenity = (
              opt: (typeof AMENITY_OPTIONS)[number],
              isRight: boolean,
            ) => {
              const on = draft.amenities.includes(opt.slug);
              return (
                <Pressable
                  key={opt.slug}
                  accessibilityRole="checkbox"
                  accessibilityLabel={opt.label}
                  accessibilityState={{ checked: on }}
                  onPress={() => toggleAmenity(opt.slug)}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.v2AmenityCell,
                    isRight && styles.v2ColDivided,
                    !reducedMotion && webTransition,
                    hovered && !on && styles.v2CellHover,
                    on && styles.v2CellSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    name={opt.icon}
                    size={designSize(17)}
                    color={on ? Lister.color.primary : Lister.color.inkMuted}
                  />
                  <LText
                    variant="caption"
                    numberOfLines={2}
                    style={[styles.v2AmenityLabel, on && styles.v2CellTitleOn]}
                  >
                    {opt.label}
                  </LText>
                  <View style={[styles.v2Checkbox, on && styles.v2CheckboxOn]}>
                    {on ? (
                      <Ionicons
                        name="checkmark"
                        size={designSize(12)}
                        color={Lister.color.surface}
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            };

            return (
              <View
                key={left.slug}
                style={[styles.v2AmenityRow, rowIdx > 0 && styles.v2RowDivided]}
              >
                {renderAmenity(left, false)}
                {twoColAmenities ? (
                  right ? (
                    renderAmenity(right, true)
                  ) : (
                    <View style={styles.v2AmenitySpacer} />
                  )
                ) : null}
              </View>
            );
          })}

          {draft.amenities.includes("parking") ? (
            <SwitchRow
              icon="car-outline"
              title="Parking included in rent"
              subtitle={
                draft.parkingIncludedInRent
                  ? "Dedicated spot covered with monthly rent."
                  : "Dedicated spot billed as an extra fee."
              }
              checked={draft.parkingIncludedInRent}
              onToggle={() =>
                change(
                  { parkingIncludedInRent: !draft.parkingIncludedInRent },
                  ["parkingIncludedInRent"],
                )
              }
              divided
              reducedMotion={reducedMotion}
              footer={fieldSource("parking fee", ["parkingIncludedInRent"])}
            />
          ) : null}
        </View>
      </View>
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

  /* Design 2 Architectural Utilities */
  v2Root: {
    gap: 28,
  },
  v2Section: {
    gap: 14,
  },
  v2SectionDivided: {
    gap: 14,
    paddingTop: 26,
    borderTopWidth: 1,
    borderTopColor: Lister.color.border,
  },
  v2SectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  v2SectionHeadingStack: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  v2SubBlock: {
    gap: 7,
  },
  v2InlineHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  v2FieldLabel: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 13,
    lineHeight: 18,
    color: Lister.color.ink,
  },
  v2Req: {
    fontFamily: Lister.type.bodySemi,
    color: Lister.color.danger,
  },
  v2Muted: {
    fontFamily: Lister.type.body,
    fontSize: 13,
    lineHeight: 18,
    color: Lister.color.inkMuted,
  },
  v2ErrorText: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Lister.color.danger,
  },
  v2Shell: {
    borderWidth: 1,
    borderColor: Lister.color.border,
    borderRadius: 12,
    backgroundColor: Lister.color.surface,
    overflow: "hidden",
  },
  v2ShellInvalid: {
    borderWidth: 1.5,
    borderColor: Lister.color.danger,
  },
  v2HorizontalShell: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  v2ColDivided: {
    borderLeftWidth: 1,
    borderLeftColor: Lister.color.border,
  },
  v2RowDivided: {
    borderTopWidth: 1,
    borderTopColor: Lister.color.surfaceMuted,
  },
  v2TileCol: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
    backgroundColor: Lister.color.surface,
    ...webPointer,
  },
  v2TileTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  v2TileCopy: {
    gap: 2,
  },
  v2ListRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: Lister.color.surface,
    ...webPointer,
  },
  v2RadioChoice: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Lister.color.surface,
    ...webPointer,
  },
  v2RowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  v2CellHover: {
    backgroundColor: Lister.color.bg,
  },
  v2CellSelected: {
    backgroundColor: Lister.color.primaryMist,
  },
  v2CellTitle: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 13.5,
    lineHeight: 18,
    color: Lister.color.ink,
  },
  v2CellTitleOn: {
    fontFamily: Lister.type.bodySemi,
    color: Lister.color.ink,
  },
  v2CellSub: {
    fontFamily: Lister.type.body,
    fontSize: 12,
    lineHeight: 16,
    color: Lister.color.inkMuted,
    textAlign: "left",
  },
  v2Checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Lister.color.borderStrong,
    backgroundColor: Lister.color.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  v2CheckboxOn: {
    borderWidth: 0,
    backgroundColor: Lister.color.primary,
  },
  v2Radio: {
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
  v2RadioOn: {
    borderWidth: 0,
    backgroundColor: Lister.color.primary,
  },

  /* Amps 4-segment bar */
  v2AmpSegment: {
    flex: 1,
    flexBasis: 0,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Lister.color.surface,
    ...webPointer,
  },
  v2AmpSegmentOn: {
    backgroundColor: Lister.color.ink,
  },
  v2AmpText: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 13.5,
    lineHeight: 18,
    fontVariant: ["tabular-nums"],
    color: Lister.color.ink,
  },
  v2AmpTextOn: {
    color: Lister.color.surface,
  },

  /* Scheduled cuts panel */
  v2ScheduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Lister.color.bg,
    borderBottomWidth: 1,
    borderBottomColor: Lister.color.border,
  },
  v2HoursPill: {
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Lister.color.surface,
    borderWidth: 1,
    borderColor: Lister.color.border,
    flexShrink: 0,
  },
  v2HoursPillValue: {
    fontFamily: Lister.type.bodyBold,
    fontSize: 14,
    lineHeight: 18,
    fontVariant: ["tabular-nums"],
    color: Lister.color.ink,
  },
  v2HoursPillSub: {
    fontFamily: Lister.type.body,
    fontSize: 11,
    lineHeight: 14,
    fontVariant: ["tabular-nums"],
    color: Lister.color.inkMuted,
  },
  v2PeriodRow: {
    padding: 14,
    gap: 10,
  },
  v2PeriodMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  v2PeriodTitle: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 12,
    lineHeight: 16,
    color: Lister.color.inkMuted,
  },
  v2RemoveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
    ...webPointer,
  },
  v2RemoveText: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 12,
    color: Lister.color.danger,
  },
  v2AddCutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: Lister.color.border,
    backgroundColor: Lister.color.bg,
    ...webPointer,
  },
  v2AddCutText: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 13,
    lineHeight: 18,
    color: Lister.color.ink,
  },
  v2AddCutHint: {
    fontFamily: Lister.type.body,
    fontSize: 12,
    lineHeight: 16,
    color: Lister.color.inkMuted,
    marginLeft: "auto",
  },

  /* Switchboard rows */
  switchRowDivided: {
    borderTopWidth: 1,
    borderTopColor: Lister.color.surfaceMuted,
  },
  switchRowIndentedWrap: {
    backgroundColor: Lister.color.bg,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 11,
    ...webPointer,
  },
  switchRowIndented: {
    paddingLeft: 32,
  },
  switchRowHover: {
    backgroundColor: Lister.color.bg,
  },
  switchIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Lister.color.bg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  switchIconBoxOn: {
    backgroundColor: Lister.color.primaryMist,
  },
  switchCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  switchTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
  },
  switchTitle: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 13.5,
    lineHeight: 18,
    color: Lister.color.ink,
  },
  switchSub: {
    fontFamily: Lister.type.body,
    fontSize: 12,
    lineHeight: 16,
    color: Lister.color.inkMuted,
  },
  switchFooter: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  rentTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: Lister.color.surfaceMuted,
  },
  rentTagOn: {
    backgroundColor: Lister.color.primaryMist,
  },
  rentTagText: {
    fontFamily: Lister.type.bodyMedium,
    fontSize: 11,
    lineHeight: 14,
    color: Lister.color.inkMuted,
  },
  rentTagTextOn: {
    fontFamily: Lister.type.bodySemi,
    color: Lister.color.primary,
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

  /* Accuracy notice */
  v2Notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.bg,
  },
  v2NoticeTitle: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 13,
    lineHeight: 18,
    color: Lister.color.ink,
  },

  /* Interior amenities hairline grid */
  v2CountRight: {
    alignItems: "flex-end",
    gap: 2,
    flexShrink: 0,
  },
  v2CountBadge: {
    fontFamily: Lister.type.bodySemi,
    fontSize: 12,
    lineHeight: 16,
    fontVariant: ["tabular-nums"],
    color: Lister.color.primary,
  },
  v2AmenityRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  v2AmenityCell: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: Lister.color.surface,
    ...webPointer,
  },
  v2AmenityLabel: {
    flex: 1,
    minWidth: 0,
    fontFamily: Lister.type.bodyMedium,
    fontSize: 13,
    lineHeight: 17,
    color: Lister.color.ink,
  },
  v2AmenitySpacer: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingHorizontal: 14,
    borderLeftWidth: 1,
    borderLeftColor: Lister.color.border,
    backgroundColor: Lister.color.bg,
  },
  pressed: {
    opacity: 0.9,
  },

  /* Design 1 styles (preserved) */
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: Lister.radius.md,
    borderWidth: 1,
    borderColor: "rgba(180,83,9,0.22)",
    backgroundColor: Lister.color.warningSoft,
  },
  disclaimerCopy: {
    flex: 1,
    gap: 2,
  },
  disclaimerTitle: {
    fontFamily: Lister.type.bodySemi,
    color: Lister.color.ink,
  },
  cutsBox: {
    gap: 12,
    padding: 14,
    borderRadius: Lister.radius.lg,
    borderWidth: 1.5,
    borderColor: Lister.color.primarySoft,
    backgroundColor: Lister.color.primaryMist,
  },
  cutsBoxError: {
    borderColor: Lister.color.danger,
    backgroundColor: Lister.color.dangerSoft,
  },
  periodCard: {
    gap: 8,
    padding: 10,
    borderRadius: Lister.radius.md,
    backgroundColor: Lister.color.surface,
    borderWidth: 1,
    borderColor: Lister.color.border,
  },
  periodHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  periodLabel: {
    fontFamily: Lister.type.bodySemi,
    color: Lister.color.inkMuted,
  },
  timeRow: {
    flexDirection: "row",
    gap: 10,
  },
  addPeriod: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: Lister.radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Lister.color.primary,
    backgroundColor: Lister.color.surface,
  },
  addPlus: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Lister.color.primaryMist,
    borderWidth: 1.5,
    borderColor: Lister.color.primary,
  },
  addTitle: {
    fontFamily: Lister.type.bodySemi,
    color: Lister.color.primaryDeep,
  },
  hoursCard: {
    gap: 2,
    padding: 12,
    borderRadius: Lister.radius.md,
    backgroundColor: Lister.color.surface,
    borderWidth: 1,
    borderColor: Lister.color.border,
  },
  hoursValue: {
    color: Lister.color.primaryDeep,
  },
  included: {
    gap: 8,
    padding: 10,
    borderRadius: Lister.radius.md,
    borderWidth: 1,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surfaceMuted,
  },
  includedLabel: {
    fontFamily: Lister.type.bodySemi,
    letterSpacing: 0.2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  cell: {
    width: "48%",
    minHeight: 72,
    padding: 12,
    gap: 6,
    borderRadius: Lister.radius.md,
    borderWidth: 1.5,
    borderColor: Lister.color.border,
    backgroundColor: Lister.color.surface,
    cursor: "pointer",
  },
  cellOn: {
    borderColor: Lister.color.primary,
    backgroundColor: Lister.color.primaryMist,
  },
  cellLabelOn: { color: Lister.color.primaryDeep, fontFamily: Lister.type.bodySemi },
});

import { useDesktopDesign } from "@/components/ui/DesktopDesign";
import { BuildingAccessFields } from './CreateStepSpecs';
import { patchOverride, resetOverride } from '@/features/listings/create/unitDrafts';
import type { CreateListingDraft } from '@/features/listings/create/draft';
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
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
  legacyElectricity,
  powerFromLegacy,
} from "@/lib/electricityFacts";
import { WaterSectionMarker } from '@/features/listings/create/WizardArtSync';
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
import type { PowerSource, WaterSource } from "@/types/listing";

const ELEC_KEYS = ["electricity", "powerSources", "powerHours", "hasSolar"] as const;

const CUT_KEYS = [
  "electricityCutWindows",
  "electricityCutsStart",
  "electricityCutsEnd",
  "electricityHoursOn",
] as const;

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
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
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

export function CreateStepAmenities() {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const styles = resolveStyles(baseStyles);
  
  const { draft, patch, fieldInvalid, formChrome } = useListingForm();
  const change = (values: Partial<CreateListingDraft>, keys: readonly string[]) =>
    patchOverride(draft, patch, values, keys);
  const reset = (keys: readonly string[]) => resetOverride(draft, patch, keys);
  const sourcesInvalid = fieldInvalid("powerSources");
  const hoursInvalid = fieldInvalid("powerHours");
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

  return (
    <View style={{ gap: designSize(16) }}>
      {formChrome==='edit' ? <BuildingAccessFields/> : null}
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
                onPress={() => {
                  const next: PowerSource[] = selected
                    ? power.sources.filter((source) => source !== option.value)
                    : [...power.sources, option.value];
                  change(
                    {
                      powerSources: next,
                      powerHours: power.hours,
                      hasSolar: next.includes("solar"),
                      electricity: next.length && power.hours ? legacyElectricity(next, power.hours) : draft.electricity,
                    },
                    ELEC_KEYS,
                  );
                }}
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
              onPress={() => {
                const hours = option.value;
                const electricity = power.sources.length ? legacyElectricity(power.sources, hours) : draft.electricity;
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
              }}
            />
          ))}
        </WizardFieldGroup>
        {power.hours === "scheduled_cuts" || power.sources.includes("generator") ? (
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
                onPress={() => {
                  const next: WaterSource[] = selected
                    ? waterSources.filter((source) => source !== option.value)
                    : [...waterSources, option.value];
                  change(
                    { waterSources: next, water: next.length ? legacyWaterStatus(next) : null },
                    ["water", "waterSources"],
                  );
                }}
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

const baseStyles = StyleSheet.create({
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

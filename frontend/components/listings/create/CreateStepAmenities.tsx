import { Ionicons } from "@expo/vector-icons";
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
import { ELECTRICITY_LABELS, WATER_LABELS } from "@/constants/utilities";
import { Lister } from "@/constants/listerTheme";
import { useCreateListingDraft } from "@/features/listings/create/CreateListingProvider";
import { WaterSectionMarker } from "@/features/listings/create/WizardArtSync";
import {
  MAX_CUT_WINDOWS,
  cutHoursFromWindows,
  emptyCutWindow,
  hoursWithPowerFromWindows,
  type CutWindow,
} from "@/lib/electricityCuts";
import type { ElectricityStatus, WaterStatus } from "@/types/listing";

const ELEC: ElectricityStatus[] = ["generator_24_7", "scheduled_cuts", "solar"];
const WATER: WaterStatus[] = ["state_well_24_7", "tank_delivery"];

export function CreateStepAmenities() {
  const { draft, patch, fieldInvalid } = useCreateListingDraft();
  const electricityInvalid = fieldInvalid("electricity");
  const windowsInvalid = fieldInvalid("electricityCutWindows");
  const waterInvalid = fieldInvalid("water");

  const windows: CutWindow[] =
    draft.electricityCutWindows?.length > 0
      ? draft.electricityCutWindows
      : [emptyCutWindow()];
  const hoursOn = hoursWithPowerFromWindows(windows);
  const cutHours = cutHoursFromWindows(windows);
  const completeCount = windows.filter((w) => w.start && w.end).length;

  function setWindows(next: CutWindow[]) {
    const first = next[0] ?? emptyCutWindow();
    patch({
      electricityCutWindows: next,
      electricityCutsStart: first.start,
      electricityCutsEnd: first.end,
      electricityHoursOn: hoursWithPowerFromWindows(next),
    });
  }

  function patchWindow(index: number, field: "start" | "end", value: string) {
    setWindows(
      windows.map((w, i) => (i === index ? { ...w, [field]: value } : w)),
    );
  }

  function toggleAmenity(slug: string) {
    const on = draft.amenities.includes(slug);
    patch({
      amenities: on
        ? draft.amenities.filter((s) => s !== slug)
        : [...draft.amenities, slug],
    });
  }

  return (
    <View style={{ gap: 16 }}>
      <Enter>
        <WizardFieldLabel required>Electricity</WizardFieldLabel>
        <View style={{ height: 8 }} />
        <WizardFieldGroup field="electricity" style={{ gap: 8 }}>
          {ELEC.map((value) => (
            <SelectableCard
              key={value}
              selected={draft.electricity === value}
              title={ELECTRICITY_LABELS[value]}
              icon="flash-outline"
              error={electricityInvalid}
              onPress={() =>
                patch({
                  electricity: value,
                  hasSolar: value === "solar" ? true : draft.hasSolar,
                  electricityCutWindows:
                    value === "scheduled_cuts" && windows.length === 0
                      ? [emptyCutWindow()]
                      : draft.electricityCutWindows,
                })
              }
            />
          ))}
        </WizardFieldGroup>
        <View style={{ height: 8 }} />
        <SegmentedPills
          options={GENERATOR_AMP_OPTIONS.map((n) => ({
            value: String(n),
            label: `${n}A`,
          }))}
          value={draft.generatorAmperes != null ? String(draft.generatorAmperes) : null}
          onChange={(v) => patch({ generatorAmperes: Number(v) })}
        />
      </Enter>
      {draft.electricity === "scheduled_cuts" ? (
        <Enter delay={40}>
          <View style={[styles.cutsBox, windowsInvalid && styles.cutsBoxError]}>
            <WizardFieldLabel required>When are the cuts?</WizardFieldLabel>
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
                        size={18}
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
                  <Ionicons name="add" size={22} color={Lister.color.primary} />
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
        <SelectableCard
          selected={draft.hasSolar}
          title="Solar / UPS inverter"
          body="Backup present even if generator is the main source."
          icon="sunny-outline"
          onPress={() => patch({ hasSolar: !draft.hasSolar })}
        />
        <View style={{ height: 8 }} />
        <SelectableCard
          selected={draft.generatorIncluded}
          title="Generator fee included in rent"
          body="Off = billed by meter / ishtirak separately."
          icon="cash-outline"
          onPress={() => patch({ generatorIncluded: !draft.generatorIncluded })}
        />
      </Enter>
      <Enter delay={140}>
        <WaterSectionMarker />
        <WizardFieldLabel required>Water</WizardFieldLabel>
        <View style={{ height: 8 }} />
        <WizardFieldGroup field="water" style={{ gap: 8 }}>
          {WATER.map((value) => (
            <SelectableCard
              key={value}
              selected={draft.water === value}
              title={WATER_LABELS[value]}
              icon="water-outline"
              error={waterInvalid}
              onPress={() => patch({ water: value })}
            />
          ))}
        </WizardFieldGroup>
      </Enter>
      <Enter delay={180}>
        <SelectableCard
          selected={draft.wifiIncluded}
          title="High-speed Wi-Fi included"
          icon="wifi-outline"
          onPress={() => patch({ wifiIncluded: !draft.wifiIncluded })}
        />
        <View style={{ height: 8 }} />
        <SelectableCard
          selected={draft.routerUps}
          title="Router on UPS"
          icon="battery-charging-outline"
          onPress={() => patch({ routerUps: !draft.routerUps })}
        />
        <View style={{ height: 8 }} />
        <SelectableCard
          selected={draft.conciergeIncluded}
          title="Concierge / natour included"
          icon="person-outline"
          onPress={() => patch({ conciergeIncluded: !draft.conciergeIncluded })}
        />
        <View style={{ height: 8 }} />
        <SelectableCard
          selected={draft.cookingGasIncluded}
          title="Cooking gas included"
          icon="flame-outline"
          onPress={() => patch({ cookingGasIncluded: !draft.cookingGasIncluded })}
        />
      </Enter>
      <Enter delay={220}>
        <LText variant="subtitle">Interior amenities</LText>
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
                  size={20}
                  color={on ? Lister.color.primary : Lister.color.inkMuted}
                />
                <LText variant="caption" style={on ? styles.cellLabelOn : undefined}>
                  {opt.label}
                </LText>
              </Pressable>
            );
          })}
        </View>
      </Enter>
    </View>
  );
}

const styles = StyleSheet.create({
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

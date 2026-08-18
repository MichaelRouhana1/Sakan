import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { Enter } from "@/components/lister/Enter";
import { LText } from "@/components/lister/Typography";
import { SelectableCard } from "@/components/listings/create/SelectableCard";
import { SegmentedPills } from "@/components/listings/create/SegmentedPills";
import {
  WizardFieldGroup,
  WizardFieldLabel,
  useWizardFieldInvalid,
} from "@/components/listings/create/WizardField";
import {
  AMENITY_OPTIONS,
  GENERATOR_AMP_OPTIONS,
} from "@/constants/listingWizard";
import { ELECTRICITY_LABELS, WATER_LABELS } from "@/constants/utilities";
import { Lister } from "@/constants/listerTheme";
import { useCreateListingDraft } from "@/features/listings/create/CreateListingProvider";
import { WaterSectionMarker } from "@/features/listings/create/WizardArtSync";
import type { ElectricityStatus, WaterStatus } from "@/types/listing";

const ELEC: ElectricityStatus[] = ["generator_24_7", "scheduled_cuts", "solar"];
const WATER: WaterStatus[] = ["state_well_24_7", "tank_delivery"];

export function CreateStepAmenities() {
  const { draft, patch } = useCreateListingDraft();
  const electricityInvalid = useWizardFieldInvalid("electricity");
  const waterInvalid = useWizardFieldInvalid("water");

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

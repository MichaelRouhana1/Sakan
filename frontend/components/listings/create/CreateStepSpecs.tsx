import { TextInput, View } from "react-native";
import { Enter } from "@/components/lister/Enter";
import { LText } from "@/components/lister/Typography";
import { SegmentedPills } from "@/components/listings/create/SegmentedPills";
import { SelectableCard } from "@/components/listings/create/SelectableCard";
import { StepperControl } from "@/components/listings/create/StepperControl";
import {
  WizardFieldLabel,
  useWizardFieldInvalid,
  wizardInputStyle,
} from "@/components/listings/create/WizardField";
import { FURNISHING_OPTIONS } from "@/constants/listingWizard";
import { Lister } from "@/constants/listerTheme";
import { useCreateListingDraft } from "@/features/listings/create/CreateListingProvider";
import type { FurnishingType } from "@/types/listing";

function floorLabel(n: number) {
  if (n === 0) return "Ground";
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

export function CreateStepSpecs() {
  const { draft, patch } = useCreateListingDraft();
  const furnishingInvalid = useWizardFieldInvalid("furnishingType");
  const bedsInvalid = useWizardFieldInvalid("beds");
  const occupancyInvalid = useWizardFieldInvalid("maxOccupancy");

  return (
    <View style={{ gap: 8 }}>
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
          value={draft.beds}
          min={1}
          max={12}
          required
          error={bedsInvalid}
          onChange={(beds) => patch({ beds })}
        />
        <StepperControl
          label="Bathrooms"
          value={draft.bathrooms}
          min={1}
          max={6}
          step={0.5}
          onChange={(bathrooms) => patch({ bathrooms })}
        />
        <StepperControl
          label="Max occupancy"
          value={draft.maxOccupancy}
          min={1}
          max={12}
          required
          error={occupancyInvalid}
          onChange={(maxOccupancy) => patch({ maxOccupancy })}
        />
        <StepperControl
          label="Floor"
          value={draft.floorNumber}
          min={0}
          max={30}
          onChange={(floorNumber) => patch({ floorNumber })}
          format={floorLabel}
        />
      </Enter>
      <Enter delay={80}>
        <WizardFieldLabel required style={{ marginTop: 12 }}>
          Furnishing
        </WizardFieldLabel>
        <View style={{ height: 8 }} />
        <SegmentedPills
          options={FURNISHING_OPTIONS}
          value={draft.furnishingType}
          error={furnishingInvalid}
          onChange={(v) => patch({ furnishingType: v as FurnishingType })}
        />
      </Enter>
      <Enter delay={140}>
        <LText variant="subtitle" style={{ marginTop: 12 }}>
          Size (m²)
        </LText>
        <TextInput
          accessibilityLabel="Area in square meters"
          keyboardType="number-pad"
          placeholder="e.g. 85"
          placeholderTextColor={Lister.color.inkFaint}
          value={draft.areaSqm}
          onChangeText={(areaSqm) => patch({ areaSqm })}
          style={wizardInputStyle()}
        />
      </Enter>
      <Enter delay={180}>
        <SelectableCard
          selected={draft.hasElevator}
          title="Elevator in building"
          body="Yes — there is a lift."
          icon="swap-vertical-outline"
          onPress={() => patch({ hasElevator: !draft.hasElevator })}
        />
        <View style={{ height: 8 }} />
        <SelectableCard
          selected={draft.elevator24_7}
          title="Elevator works during cuts"
          body="24/7 elevator on generator or solar."
          icon="flash-outline"
          onPress={() => patch({ elevator24_7: !draft.elevator24_7 })}
        />
      </Enter>
    </View>
  );
}

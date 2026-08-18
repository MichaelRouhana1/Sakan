import { View } from "react-native";
import { Enter } from "@/components/lister/Enter";
import { LText } from "@/components/lister/Typography";
import { SegmentedPills } from "@/components/listings/create/SegmentedPills";
import { SelectableCard } from "@/components/listings/create/SelectableCard";
import {
  WizardFieldGroup,
  WizardFieldLabel,
  useWizardFieldInvalid,
} from "@/components/listings/create/WizardField";
import {
  PRICE_BASIS_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  SPACE_TYPE_OPTIONS,
} from "@/constants/listingWizard";
import { useCreateListingDraft } from "@/features/listings/create/CreateListingProvider";
import type { PriceBasis, PropertyType, SpaceType } from "@/types/listing";

export function CreateStepType() {
  const { draft, patch } = useCreateListingDraft();
  const spaceInvalid = useWizardFieldInvalid("spaceType");
  const propertyInvalid = useWizardFieldInvalid("propertyType");

  function pickSpace(spaceType: SpaceType) {
    const priceBasis: PriceBasis =
      spaceType === "shared_room"
        ? "per_bed_month"
        : spaceType === "private_room"
          ? "per_room_month"
          : "per_unit_month";
    patch({ spaceType, priceBasis });
  }

  return (
    <View style={{ gap: 18 }}>
      <WizardFieldGroup field="spaceType" style={{ gap: 18 }}>
        <WizardFieldLabel required>What kind of place?</WizardFieldLabel>
        {SPACE_TYPE_OPTIONS.map((opt, i) => (
          <Enter key={opt.value} delay={i * 70}>
            <SelectableCard
              selected={draft.spaceType === opt.value}
              title={opt.title}
              body={opt.body}
              icon={opt.icon}
              error={spaceInvalid}
              onPress={() => pickSpace(opt.value)}
            />
          </Enter>
        ))}
      </WizardFieldGroup>
      <Enter delay={240}>
        <WizardFieldLabel required>Property type</WizardFieldLabel>
        <View style={{ height: 8 }} />
        <SegmentedPills
          options={PROPERTY_TYPE_OPTIONS}
          value={draft.propertyType}
          error={propertyInvalid}
          onChange={(v) => patch({ propertyType: v as PropertyType })}
        />
      </Enter>
      <Enter delay={310}>
        <LText variant="subtitle">How is rent listed?</LText>
        <View style={{ height: 8 }} />
        <SegmentedPills
          options={PRICE_BASIS_OPTIONS}
          value={draft.priceBasis}
          onChange={(v) => patch({ priceBasis: v as PriceBasis })}
        />
      </Enter>
    </View>
  );
}

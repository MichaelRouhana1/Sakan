import { View } from "react-native";
import { useDesktopDesign } from "@/components/ui/DesktopDesign";
import { Enter } from "@/components/lister/Enter";
import { SegmentedPills } from "@/components/listings/create/SegmentedPills";
import { SelectableCard } from "@/components/listings/create/SelectableCard";
import { LockedCluster } from "@/components/listings/create/LockedCluster";
import {
  WizardFieldGroup,
  WizardFieldLabel,
  useWizardFieldInvalid,
} from "@/components/listings/create/WizardField";
import {
  PROPERTY_TYPE_OPTIONS,
  SPACE_TYPE_OPTIONS,
} from "@/constants/listingWizard";
import { useListingForm } from "@/features/listings/forms/ListingFormContext";
import { priceBasisForSpaceType } from "@/lib/bedsAvailability";
import type { PropertyType, SpaceType } from "@/types/listing";

export function CreateStepType() {
  const { size: designSize } = useDesktopDesign();
  const { draft, patch } = useListingForm();
  const spaceInvalid = useWizardFieldInvalid("spaceType");
  const propertyInvalid = useWizardFieldInvalid("propertyType");

  function pickSpace(spaceType: SpaceType) {
    const priceBasis = priceBasisForSpaceType(spaceType);
    if (spaceType === "shared_room") {
      const beds = Math.max(draft.beds, 2);
      patch({
        spaceType,
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
    patch({ spaceType, priceBasis, bedsAvailable: null });
  }

  return (
    <View style={{ gap: designSize(18) }}>
      <LockedCluster fields={["spaceType"]}>
        <WizardFieldGroup field="spaceType" style={{ gap: designSize(18) }}>
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
      </LockedCluster>

      <LockedCluster fields={["propertyType"]}>
        <Enter delay={240}>
          <WizardFieldLabel required>Property type</WizardFieldLabel>
          <View style={{ height: designSize(8) }} />
          <SegmentedPills
            options={PROPERTY_TYPE_OPTIONS}
            value={draft.propertyType}
            error={propertyInvalid}
            onChange={(v) => patch({ propertyType: v as PropertyType })}
          />
        </Enter>
      </LockedCluster>
    </View>
  );
}

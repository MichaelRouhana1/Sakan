import { View } from 'react-native';
import { useDesktopDesign } from "@/components/ui/DesktopDesign";
import { PhotoPickerGrid } from "@/components/listings/PhotoPickerGrid";
import { WizardFieldGroup } from "@/components/listings/create/WizardField";
import { useListingForm } from "@/features/listings/forms/ListingFormContext";

export function CreateStepPhotos() {
  const { size: designSize } = useDesktopDesign();
  const { draft, setPhotos } = useListingForm();
  return (
    <View style={{ gap: designSize(32) }}>
    <WizardFieldGroup field="photos">
      <PhotoPickerGrid
        photos={draft.photos}
        setPhotos={setPhotos}
        style={{ marginTop: -14 }}
      />
    </WizardFieldGroup>
    </View>
  );
}

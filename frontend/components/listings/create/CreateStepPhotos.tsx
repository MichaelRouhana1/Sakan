import { View } from 'react-native';
import { PhotoPickerGrid } from "@/components/listings/PhotoPickerGrid";
import { WizardFieldGroup } from "@/components/listings/create/WizardField";
import { useListingForm } from "@/features/listings/forms/ListingFormContext";

export function CreateStepPhotos() {
  const { draft, setPhotos } = useListingForm();
  return (
    <View style={{gap:32}}>
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

import { View } from 'react-native';
import { SharedGallery } from './UnitCards';
import { PhotoPickerGrid } from "@/components/listings/PhotoPickerGrid";
import { WizardFieldGroup } from "@/components/listings/create/WizardField";
import { useCreateListingDraft } from "@/features/listings/create/CreateListingProvider";

export function CreateStepPhotos() {
  const { draft, setPhotos, formChrome } = useCreateListingDraft();
  return (
    <View style={{gap:32}}>
    {formChrome==='wizard' ? <SharedGallery/> : null}
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

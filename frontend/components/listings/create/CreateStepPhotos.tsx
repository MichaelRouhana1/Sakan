import { PhotoPickerGrid } from "@/components/listings/PhotoPickerGrid";
import { WizardFieldGroup } from "@/components/listings/create/WizardField";
import { useCreateListingDraft } from "@/features/listings/create/CreateListingProvider";

export function CreateStepPhotos() {
  const { draft, setPhotos } = useCreateListingDraft();
  return (
    <WizardFieldGroup field="photos">
      <PhotoPickerGrid
        photos={draft.photos}
        setPhotos={setPhotos}
        style={{ marginTop: -14 }}
      />
    </WizardFieldGroup>
  );
}

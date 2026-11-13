import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';
import type { DraftPhoto } from '@/components/listings/PhotoPickerGrid';
import type { CreateListingDraft } from '../create/draft';

export type ListingFormChrome = 'wizard' | 'edit';
export type ListingFormApi = {
  draft: CreateListingDraft;
  committedStep: number;
  patch: (patch: Partial<CreateListingDraft>) => void;
  setPhotos: Dispatch<SetStateAction<DraftPhoto[]>>;
  setStep: (step: number) => void;
  goNext: () => boolean;
  goBack: () => void;
  saveAndExit: () => Promise<void>;
  reset: () => Promise<void>;
  showValidation: boolean;
  fieldErrors: string[];
  fieldInvalid: (field: string) => boolean;
  setShowValidation: (show: boolean) => void;
  formChrome: ListingFormChrome;
  lockedFields: ReadonlySet<string>;
  isLocked: (field: string) => boolean;
};
export const ListingFormContext = createContext<ListingFormApi | null>(null);
export function useListingForm() {
  const value = useContext(ListingFormContext);
  if (!value) throw new Error('Listing fields require a listing form.');
  return value;
}

import { useLocalSearchParams } from 'expo-router';
import { CreationWizard } from '@/components/listings/create/CreationWizard';

export default function CreateListingScreen() {
  const params = useLocalSearchParams<{ draftId?: string; placeId?: string; new?: string }>();
  return <CreationWizard draftId={params.draftId} placeId={params.placeId} fresh={params.new === '1'} />;
}

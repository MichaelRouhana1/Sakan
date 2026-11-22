import { useLocalSearchParams } from 'expo-router';
import { Platform, useWindowDimensions } from 'react-native';
import { DesktopDesignProvider } from '@/components/ui/DesktopDesign';
import { CreationWizard } from '@/components/listings/create/CreationWizard';
import { DesktopDesign } from '@/constants/theme';

export default function CreateListingScreen() {
  const params = useLocalSearchParams<{ draftId?: string; placeId?: string; new?: string }>();
  const { width } = useWindowDimensions();
  return (
    <DesktopDesignProvider enabled={Platform.OS === 'web' && width >= DesktopDesign.layout.minWidth}>
      <CreationWizard draftId={params.draftId} placeId={params.placeId} fresh={params.new === '1'} />
    </DesktopDesignProvider>
  );
}

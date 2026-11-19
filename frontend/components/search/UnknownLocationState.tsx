import { WebEmptyState } from '@/components/web/WebEmptyState';

export function UnknownLocationState({ onClear }: { onClear: () => void }) {
  return <WebEmptyState
    icon="location-outline"
    title="We couldn't find that location"
    message="Try another city or area, or clear the location to browse homes with your other filters."
    actionLabel="Clear location"
    onAction={onClear}
  />;
}

import { HostInventoryControl } from './HostInventoryControl';
import type { ListingAvailability } from '@/types/listing';

// Keep existing detail/analytics callers on the same owner inventory workflow.
export function ListingAvailabilityControl({listingId}: {
  listingId: string;
  availability?: ListingAvailability | null;
  variant?: 'pills' | 'dropdown';
  surface?: 'default' | 'overlay';
}) {
  return <HostInventoryControl listingId={listingId}/>;
}

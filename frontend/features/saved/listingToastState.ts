import type { Listing } from '@/types/listing';
import type { SavedToastEvent } from './savedToast';

type Base = {key: string; seq: number; open: boolean; title: string};
export type ListingToastItem = Base & (
  {kind: 'saved'; listing: Listing} | {kind: 'feedback'; id: string}
);

export function applyListingToastEvent(prev: ListingToastItem[], event: SavedToastEvent): ListingToastItem[] {
  if (event.kind === 'clear') {
    return prev.map(toast => toast.kind === 'saved' && toast.listing.id === event.listingId && toast.open &&
      (event.seq == null || toast.seq === event.seq) ? {...toast, open: false} : toast);
  }
  if (event.kind === 'feedback') {
    return [...prev.filter(toast => toast.kind !== 'feedback' || toast.id !== event.id),
      {kind: 'feedback', key: `feedback:${event.id}:${event.seq}`, id: event.id, seq: event.seq, title: event.title, open: true}];
  }
  return [...prev.filter(toast => toast.kind !== 'saved' || toast.listing.id !== event.listing.id),
    {kind: 'saved', key: `${event.listing.id}:${event.seq}`, seq: event.seq, listing: event.listing, title: 'Added to favorites', open: true}];
}

import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { CardBadgeEditor } from './CardBadgeEditor';
import { useListingForm } from '@/features/listings/forms/ListingFormContext';
import { previewListingFromDraft } from '@/features/listings/create/previewListingFromDraft';
import { draftCardBadgeKeys, sameBadgeKeys } from '@/lib/listingCardBadges';

/** The live-listing editor keeps its existing card customisation. */
export function CreateStepReview() {
  const { draft, patch } = useListingForm();
  const listing = useMemo(() => { const preview = previewListingFromDraft(draft); return { ...preview, cardBadges: draftCardBadgeKeys(preview) }; }, [draft]);
  useEffect(() => { if (draft.cardBadges != null && !sameBadgeKeys(listing.cardBadges, draft.cardBadges)) patch({ cardBadges: listing.cardBadges }); }, [draft.cardBadges, listing.cardBadges, patch]);
  return <View><CardBadgeEditor listing={listing} onChange={cardBadges => patch({ cardBadges })} /></View>;
}

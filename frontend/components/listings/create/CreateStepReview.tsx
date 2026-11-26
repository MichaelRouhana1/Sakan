import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { CardBadgeEditor } from './CardBadgeEditor';
import { useListingForm } from '@/features/listings/forms/ListingFormContext';
import { previewListingFromDraft } from '@/features/listings/create/previewListingFromDraft';
import { draftCardBadgeKeys, sameBadgeKeys, wizardCardBadgeKeys } from '@/lib/listingCardBadges';

/** Card badge customisation for both the creation wizard and the live-listing editor. */
export function CreateStepReview({
  showHeading,
  matchSearchList,
}: {
  showHeading?: boolean;
  matchSearchList?: boolean;
} = {}) {
  const { draft, patch, formChrome } = useListingForm();
  const listing = useMemo(() => {
    const preview = previewListingFromDraft(draft);
    const cardBadges =
      formChrome === 'edit'
        ? draftCardBadgeKeys(preview)
        : wizardCardBadgeKeys(preview);
    return { ...preview, cardBadges };
  }, [draft, formChrome]);

  useEffect(() => {
    if (formChrome === 'edit' && draft.cardBadges == null) return;
    if (draft.cardBadges == null || !sameBadgeKeys(listing.cardBadges, draft.cardBadges)) {
      patch({ cardBadges: listing.cardBadges });
    }
  }, [draft.cardBadges, formChrome, listing.cardBadges, patch]);

  return (
    <View>
      <CardBadgeEditor
        listing={listing}
        onChange={cardBadges => patch({ cardBadges })}
        showHeading={showHeading}
        matchSearchList={matchSearchList}
      />
    </View>
  );
}

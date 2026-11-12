import { useState, type ComponentProps } from 'react';
import { Image } from 'expo-image';
import { Modal, Platform, Pressable, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LText } from '@/components/lister/Typography';
import { Studently } from '@/constants/theme';
import { amenityLabel } from '@/constants/listingWizard';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import { detailLabels } from '@/lib/listingDetailOwnership';
import { placeExtras } from '@/lib/listingDetailDisplay';
import { DetailFilterChip } from './OtherPlaceUnits';
import type { Listing, ListingPhoto } from '@/types/listing';

type Props = {
  listing: Listing;
  onSectionLayout?: (section: 'place') => (event: LayoutChangeEvent) => void;
  style?: StyleProp<ViewStyle>;
};

/** Building context that is not covered by the effective unit sections. */
export function PlaceListingIntro({ listing, onSectionLayout, style }: Props) {
  const labels = detailLabels(listing);
  const extras = placeExtras(listing);
  const photoTitle = `${labels.place === 'building' ? 'Building' : 'Apartment'} photos`;
  if (!extras.visible) return null;

  return (
    <View testID="place-intro" style={[styles.folio, style]} onLayout={onSectionLayout?.('place')}>
      <View nativeID="listing-place" testID="place-details" collapsable={false} style={styles.dossier}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <LText accessibilityRole="header" variant="title" style={styles.dossierTitle}>{labels.placeTitle}</LText>
            {extras.address ? <LText style={styles.address} tone="muted">{extras.address}</LText> : null}
          </View>
          <PlacePhotoGallery key={listing.id} photos={listing.sharedPhotos ?? []} title={photoTitle} />
        </View>
        {extras.solar || extras.concierge ? (
          <View style={styles.overview} testID="place-extras">
            {extras.solar ? <BuildingFact label="Solar backup" value="Available" icon="sunny-outline" /> : null}
            {extras.concierge ? <BuildingFact label="Concierge" value="Included in rent" icon="person-outline" /> : null}
          </View>
        ) : null}
        {extras.unavailableAmenities.length ? (
          <LText style={styles.excludedAmenities} tone="muted" testID="place-excluded-amenities">
            In the {labels.place}, not in this unit: {extras.unavailableAmenities.map(amenityLabel).join(', ')}
          </LText>
        ) : null}
      </View>
    </View>
  );
}

function BuildingFact({ label, value, icon }: {
  label: string;
  value: string;
  icon: ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <View style={styles.fact}>
      <View style={styles.iconLabel}>
        <Ionicons name={icon} size={16} color={Studently.color.inkMuted} accessible={false} aria-hidden />
        <LText style={styles.factLabel} tone="muted">{label}</LText>
      </View>
      <LText style={styles.factValue}>{value}</LText>
    </View>
  );
}

function PlacePhotoGallery({ photos, title }: { photos: ListingPhoto[]; title: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  if (!photos.length) return null;
  const photo = index === null ? null : photos[index];
  return (
    <View testID="place-photos">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${title.toLowerCase()} 1`}
        onPress={() => setIndex(0)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={({ hovered, pressed }) => [styles.photoButton, (hovered || pressed) && styles.photoHover, focused && styles.focus]}
      >
        <Image source={{ uri: resolveMediaUrl(photos[0].url) ?? photos[0].url }} accessibilityLabel={photos[0].caption || title} style={StyleSheet.absoluteFill} contentFit="cover" />
        <View style={styles.photoCount}>
          <Ionicons name="images-outline" size={12} color="white" />
          <LText style={styles.photoCountLabel}>{photos.length} {photos.length === 1 ? 'photo' : 'photos'}</LText>
        </View>
      </Pressable>
      <Modal visible={index !== null} transparent animationType="none" onRequestClose={() => setIndex(null)}>
        <View style={styles.lightbox} accessibilityViewIsModal>
          <DetailFilterChip label="Close shared photos" onPress={() => setIndex(null)} />
          {photo ? <Image source={{ uri: resolveMediaUrl(photo.url) ?? photo.url }} accessibilityLabel={photo.caption || title} style={styles.lightboxImage} contentFit="contain" /> : null}
          <LText style={styles.lightboxCaption}>{title} · {(index ?? 0) + 1} / {photos.length}{photo?.caption ? ` · ${photo.caption}` : ''}</LText>
          <View style={styles.lightboxNav}>
            <DetailFilterChip label="Previous shared photo" onPress={() => setIndex((i) => ((i ?? 0) - 1 + photos.length) % photos.length)} />
            <DetailFilterChip label="Next shared photo" onPress={() => setIndex((i) => ((i ?? 0) + 1) % photos.length)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const anchor = Platform.OS === 'web' ? ({ scrollMarginTop: 90 } as object) : null;

const styles = StyleSheet.create({
  folio: {
    borderRadius: Studently.radius.lg,
    borderWidth: 1,
    borderColor: Studently.color.border,
    backgroundColor: Studently.color.surface,
    overflow: 'hidden',
  },
  dossier: {
    gap: 18,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    ...anchor,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  headerCopy: { flex: 1, minWidth: 0, gap: 4 },
  dossierTitle: { fontFamily: Studently.type.bodyBold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  address: { fontSize: 13, lineHeight: 19 },
  overview: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 24, rowGap: 12 },
  fact: { flexBasis: '45%', flexGrow: 1, minWidth: 120, gap: 3 },
  iconLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  factLabel: { fontSize: 12, lineHeight: 18 },
  factValue: { fontFamily: Studently.type.bodyMedium, fontSize: 14, lineHeight: 20 },
  excludedAmenities: { fontSize: 13, lineHeight: 20 },
  photoButton: { width: 88, height: 64, borderRadius: 8, overflow: 'hidden', backgroundColor: Studently.color.bgWash, ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null) },
  photoHover: { opacity: 0.85 },
  photoCount: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4, backgroundColor: 'rgba(18,24,38,0.75)' },
  photoCountLabel: { color: 'white', fontSize: 11, lineHeight: 16 },
  focus: { outlineWidth: 2, outlineColor: Studently.color.primary, outlineOffset: 3 },
  lightbox: { flex: 1, padding: 24, paddingTop: 48, gap: 16, backgroundColor: '#121826F5' },
  lightboxImage: { width: '100%', flex: 1 },
  lightboxCaption: { color: 'white' },
  lightboxNav: { flexDirection: 'row', gap: 12 },
});

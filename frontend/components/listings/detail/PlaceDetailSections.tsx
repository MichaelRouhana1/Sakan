import { useState } from 'react';
import { Image } from 'expo-image';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LText } from '@/components/lister/Typography';
import { Studently } from '@/constants/theme';
import { amenityLabel } from '@/constants/listingWizard';
import { formatFreshUsd } from '@/lib/format';
import { formatAvailableFrom, labelGenderRestriction } from '@/lib/listingLabels';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import { detailLabels, detailUnitType, scopedAmenities, scopedFields, utilityFields, ruleFields } from '@/lib/listingDetailOwnership';
import { ListingNearbyCampuses } from './ListingNearbyCampuses';
import { ListingDetailMapSection } from './ListingDetailMapSection';
import { DetailFilterChip } from './OtherPlaceUnits';
import type { Listing, ListingPhoto } from '@/types/listing';

type Props = { listing: Listing; onSectionLayout?: (section: 'unit' | 'place') => (event: LayoutChangeEvent) => void };

export function UnitPhotoLabel({ listing }: { listing: Listing }) {
  return <LText testID="unit-photo-label" variant="caption" style={styles.photoLabel}>{detailLabels(listing).unitTitle} photos · {listing.photos.length}</LText>;
}

export function PlaceDetailSections({ listing, onSectionLayout }: Props) {
  const labels = detailLabels(listing);
  const amenities = scopedAmenities(listing);
  const type = detailUnitType(listing);
  const specs = [
    ['Monthly rent', `${formatFreshUsd(listing.monthlyRentUsd)} / ${type === 'shared_bed' ? 'bed' : labels.unit}`],
    ['Deposit', listing.securityDepositUsd != null ? formatFreshUsd(listing.securityDepositUsd) : null],
    ['Size', listing.areaSqm ? `${listing.areaSqm} m²` : null],
    ['Bedrooms', type === 'whole_apartment' && listing.bedrooms != null ? (listing.bedrooms === 0 ? 'Studio' : String(listing.bedrooms)) : null],
    ['Beds', type !== 'shared_bed' && listing.beds ? String(listing.beds) : null],
    ['Bed availability', type === 'shared_bed' && listing.bedsTotal != null && listing.bedsAvailable != null ? `${listing.bedsAvailable} of ${listing.bedsTotal} available` : null],
    ['Bathrooms', listing.bathrooms ? `${listing.bathrooms}${listing.bathroomPrivacy ? ` · ${listing.bathroomPrivacy}` : ''}` : listing.bathroomPrivacy],
    ['Furnishing', listing.furnishingType ? ({ furnished: 'Furnished', semi: 'Semi-furnished', unfurnished: 'Unfurnished' })[listing.furnishingType] : null],
    ['Floor', listing.floorNumber != null ? String(listing.floorNumber) : null],
    ['Available from', formatAvailableFrom(listing.availableFrom)],
    ['Lease term', listing.leaseTerm ? ({ semester: 'Semester', months_6: '6 months', months_9: '9 months', year: '1 year', flexible: 'Flexible' })[listing.leaseTerm] : null],
    ['Payment', listing.paymentModality ? ({ monthly: 'Monthly', semester: 'Per semester', quarterly: 'Quarterly' })[listing.paymentModality] : null],
    ['Gender preference', listing.genderRestriction ? labelGenderRestriction(listing.genderRestriction) : null],
  ].filter((row): row is [string, string] => typeof row[1] === 'string' && row[1].length > 0);

  return <>
    <View nativeID="listing-unit" testID="unit-details" onLayout={onSectionLayout?.('unit')} style={styles.section}>
      <SectionHeading number="01" title={labels.unitTitle} description={`The space you’re enquiring about. Prices and details below belong to this ${labels.unit}.`}/>
      <View style={styles.specs}>{specs.map(([label, value]) => <View key={label} style={styles.spec}><LText variant="caption" tone="muted">{label}</LText><LText variant="subtitle">{value}</LText></View>)}</View>
      {listing.description?.trim() ? <View style={styles.group}><LText variant="subtitle">About this {labels.unit}</LText><LText style={styles.description}>{listing.description.trim()}</LText></View> : null}
      {amenities.unit.length ? <View style={styles.group}><LText variant="subtitle">Amenities for this {labels.unit}</LText><View style={styles.amenities}>{amenities.unit.map(key => <Amenity key={key} name={amenityLabel(key)}/>)}</View></View> : null}
      <FieldGroup listing={listing} scope="unit" rules={false}/>
      <FieldGroup listing={listing} scope="unit" rules/>
      {!scopedFields(listing, utilityFields, 'unit').length ? <LText variant="caption" tone="muted">Utilities follow the {labels.place} details below.</LText> : null}
    </View>
    <View nativeID="listing-place" testID="place-details" onLayout={onSectionLayout?.('place')} style={[styles.section, styles.place]}>
      <SectionHeading number="02" title={labels.placeTitle} description={`Shared spaces and ${labels.place} defaults. Any differences for this ${labels.unit} are called out above.`}/>
      {listing.buildingName ? <LText variant="subtitle">{listing.buildingName}</LText> : null}
      <PlacePhotoGallery key={listing.id} photos={listing.sharedPhotos ?? []} title={`${labels.place === 'building' ? 'Building' : 'Apartment'} photos`}/>
      {amenities.shared.length ? <View style={styles.group}><LText variant="subtitle">Shared amenities</LText><View style={styles.amenities}>{amenities.shared.map(({ key, available }) => <Amenity key={key} name={amenityLabel(key)} unavailable={!available} unit={labels.unit}/>)}</View></View> : null}
      <FieldGroup listing={listing} scope="place" rules={false}/>
      <FieldGroup listing={listing} scope="place" rules/>
      <View nativeID="listing-location" style={styles.group}>
        <LText variant="subtitle">Location & campus connections</LText>
        <LText tone="muted">{[listing.addressLine, listing.landmark, listing.area].filter(Boolean).join(' · ')}</LText>
        <ListingNearbyCampuses listing={listing}/>
        <View nativeID="listing-map"><ListingDetailMapSection listing={listing} variant="web"/></View>
      </View>
    </View>
  </>;
}

function SectionHeading({ number, title, description }: { number: string; title: string; description: string }) {
  return <View style={styles.group}><View style={styles.heading}><LText variant="label" style={styles.number}>{number}</LText><LText accessibilityRole="header" variant="title" style={styles.title}>{title}</LText></View><LText tone="muted" style={styles.description}>{description}</LText></View>;
}

function Amenity({ name, unavailable, unit }: { name: string; unavailable?: boolean; unit?: string }) {
  return <View style={styles.amenity}><Ionicons name={unavailable ? 'remove-circle-outline' : 'checkmark-circle-outline'} size={18} color={unavailable ? Studently.color.inkMuted : Studently.color.primary}/><View style={{ flex: 1 }}><LText variant="caption">{name}</LText>{unavailable ? <LText variant="caption" tone="muted">Not available for this {unit}</LText> : null}</View></View>;
}

function FieldGroup({ listing, scope, rules }: { listing: Listing; scope: 'unit' | 'place'; rules: boolean }) {
  const fields = scopedFields(listing, rules ? ruleFields : utilityFields, scope);
  if (!fields.length) return null;
  const { unit, place } = detailLabels(listing);
  return <View style={styles.group} testID={`${scope}-${rules ? 'rules' : 'utilities'}`}>
    <LText variant="subtitle">{scope === 'unit' ? `${rules ? 'Rules' : 'Utilities'} specific to this ${unit}` : `${rules ? 'Shared rules' : 'Utilities'} · ${place} defaults`}</LText>
    <View style={styles.fieldGrid}>{fields.map(field => <View key={field.key} style={styles.field}>
      <LText variant="caption" tone="muted">{field.label}</LText><LText variant="body" style={{ fontFamily: Studently.type.bodySemi }}>{field.value}</LText>
      {field.specific ? <LText variant="caption" style={styles.source}>{scope === 'unit' ? `Specific to this ${unit}` : `Different for this ${unit} — see above`}</LText> : null}
    </View>)}</View>
  </View>;
}

function PlacePhotoGallery({ photos, title }: { photos: ListingPhoto[]; title: string }) {
  const [index, setIndex] = useState<number | null>(null);
  if (!photos.length) return null;
  const photo = index === null ? null : photos[index];
  return <View style={styles.group} testID="place-photos">
    <LText variant="subtitle">{title} ({photos.length})</LText>
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
      {photos.map((item, i) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Open ${title.toLowerCase()} ${i + 1}`} onPress={() => setIndex(i)} style={{ width: 220, gap: 6 }}>
        <Image source={{ uri: resolveMediaUrl(item.url) ?? item.url }} accessibilityLabel={item.caption || `${title} ${i + 1}`} style={{ width: 220, height: 150, borderRadius: 12 }} contentFit="cover"/>
        {item.caption ? <LText variant="caption" tone="muted">{item.caption}</LText> : null}
      </Pressable>)}
    </ScrollView>
    <Modal visible={index !== null} transparent animationType="none" onRequestClose={() => setIndex(null)}>
      <View style={styles.lightbox} accessibilityViewIsModal>
        <DetailFilterChip label="Close shared photos" onPress={() => setIndex(null)}/>
        {photo ? <Image source={{ uri: resolveMediaUrl(photo.url) ?? photo.url }} accessibilityLabel={photo.caption || title} style={{ width: '100%', flex: 1 }} contentFit="contain"/> : null}
        <LText style={{ color: 'white' }}>{title} · {(index ?? 0) + 1} / {photos.length}{photo?.caption ? ` · ${photo.caption}` : ''}</LText>
        <View style={{ flexDirection: 'row', gap: 12 }}><DetailFilterChip label="Previous shared photo" onPress={() => setIndex(i => ((i ?? 0) - 1 + photos.length) % photos.length)}/><DetailFilterChip label="Next shared photo" onPress={() => setIndex(i => ((i ?? 0) + 1) % photos.length)}/></View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  photoLabel: { color: Studently.color.primary, fontFamily: Studently.type.bodySemi, paddingVertical: 10 },
  section: { gap: 24, paddingVertical: 28, paddingHorizontal: 16, borderTopWidth: 2, borderTopColor: Studently.color.border, ...(Platform.OS === 'web' ? { scrollMarginTop: 90 } as object : {}) },
  place: { borderTopColor: Studently.color.primarySoft },
  group: { gap: 12 }, heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  number: { color: Studently.color.primary, fontSize: 12, letterSpacing: 1 }, title: { fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  description: { lineHeight: 24 }, specs: { flexDirection: 'row', flexWrap: 'wrap', gap: 1, backgroundColor: Studently.color.border, borderWidth: 1, borderColor: Studently.color.border, borderRadius: 12, overflow: 'hidden' },
  spec: { flexBasis: '45%', flexGrow: 1, padding: 16, gap: 6, backgroundColor: Studently.color.surface },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, amenity: { flexDirection: 'row', alignItems: 'center', gap: 8, flexBasis: '45%', flexGrow: 1, minWidth: 140, paddingVertical: 8 },
  fieldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, field: { flexBasis: '45%', flexGrow: 1, minWidth: 140, padding: 14, gap: 6, borderRadius: 12, backgroundColor: Studently.color.primaryMist },
  source: { color: Studently.color.primaryDeep, fontSize: 12 }, lightbox: { flex: 1, padding: 24, paddingTop: 48, gap: 16, backgroundColor: '#121826F5' },
});

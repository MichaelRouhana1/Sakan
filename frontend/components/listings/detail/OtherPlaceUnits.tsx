import { useState } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LText } from '@/components/lister/Typography';
import { Studently } from '@/constants/theme';
import { formatFreshUsd } from '@/lib/format';
import { formatAvailableFrom } from '@/lib/listingLabels';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import { detailUnitType, filterSiblingUnits, siblingHeading } from '@/lib/listingDetailOwnership';
import type { Listing } from '@/types/listing';

export function DetailFilterChip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.chip, selected && styles.chipSelected, (focused || pressed) && styles.focus]}>
    <LText variant="caption" style={{ color: Studently.color.ink, fontFamily: selected ? Studently.type.bodyBold : Studently.type.bodySemi }}>{label}</LText>
  </Pressable>;
}

const types = [['whole_apartment', 'Apartments'], ['private_room', 'Private rooms'], ['shared_bed', 'Shared beds']] as const;
type Props = { listing: Listing; siblings: Listing[]; loading?: boolean; error?: boolean; onRetry: () => void };

export function OtherPlaceUnits({ listing, siblings, loading, error, onRetry }: Props) {
  const [type, setType] = useState('all');
  const [availability, setAvailability] = useState('all');
  const [maxRent, setMaxRent] = useState('');
  const { width } = useWindowDimensions();
  const shown = filterSiblingUnits(siblings, { type, availability, maxRent });
  const clear = () => { setType('all'); setAvailability('all'); setMaxRent(''); };
  return <View testID="other-place-units" style={styles.section}>
    <View style={styles.heading}>
      <LText variant="label" style={styles.eyebrow}>MORE AT THIS ADDRESS</LText>
      <LText accessibilityRole="header" variant="title" style={styles.title}>{loading || error ? 'Other units in this place' : siblingHeading(listing, siblings)}</LText>
      <LText variant="caption" tone="muted">Same place, same host. Choose the space that fits you.</LText>
    </View>
    {loading ? <LText accessibilityLiveRegion="polite">Loading other units…</LText> : error ? <View style={{ gap: 8 }}>
      <LText accessibilityRole="alert">Other units could not be loaded.</LText><DetailFilterChip label="Retry other units" onPress={onRetry}/>
    </View> : siblings.length === 0 ? <LText tone="muted">No other units are currently available to browse.</LText> : <>
      <View style={styles.chips} accessibilityLabel="Unit type filters">
        <DetailFilterChip label={`All (${siblings.length})`} selected={type === 'all'} onPress={() => setType('all')}/>
        {types.map(([key, label]) => {
          const count = siblings.filter(unit => detailUnitType(unit) === key).length;
          return count ? <DetailFilterChip key={key} label={`${label} (${count})`} selected={type === key} onPress={() => setType(key)}/> : null;
        })}
      </View>
      <View style={styles.filters}>
        <View style={styles.chips} accessibilityLabel="Availability filters">
          {[['all', 'All availability'], ['available', 'Available'], ['pending', 'Under offer']].map(([key, label]) =>
            <DetailFilterChip key={key} label={label} selected={availability === key} onPress={() => setAvailability(key)}/>) }
        </View>
        <View style={styles.priceFilter}>
          <LText variant="caption" tone="muted">Max rent · USD / month</LText>
          <TextInput accessibilityLabel="Maximum monthly rent in USD" placeholder="No maximum" keyboardType="number-pad"
            value={maxRent} onChangeText={value => setMaxRent(value.replace(/[^0-9]/g, ''))} style={styles.input}/>
        </View>
      </View>
      <LText variant="caption" tone="muted" accessibilityLiveRegion="polite">Showing {shown.length} of {siblings.length}</LText>
      <View style={styles.cards}>
        {shown.map(unit => <UnitCard key={unit.id} unit={unit} narrow={width < 600}/>) }
      </View>
      {shown.length === 0 ? <View style={{ gap: 10 }}><LText>No units match these filters.</LText><DetailFilterChip label="Clear filters" onPress={clear}/></View> : null}
    </>}
  </View>;
}

function UnitCard({ unit, narrow }: { unit: Listing; narrow: boolean }) {
  const [focused, setFocused] = useState(false);
  const type = detailUnitType(unit);
  const cover = resolveMediaUrl(unit.coverUrl ?? unit.photos[0]?.url ?? null);
  const name = type === 'whole_apartment' ? 'Apartment' : type === 'private_room' ? 'Private room' : 'Shared bed';
  const basis = unit.priceBasis === 'per_bed_month' ? 'bed' : unit.priceBasis === 'per_room_month' ? 'room' : 'apartment';
  return <Pressable testID={`sibling-unit-${unit.id}`} accessibilityRole="link"
    accessibilityLabel={`View ${unit.title || name}, ${formatFreshUsd(unit.monthlyRentUsd)} per ${basis} per month`}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    onPress={() => router.push(`/(renter)/listing/${unit.id}` as never)}
    style={({ pressed, hovered }) => [styles.card, narrow && styles.cardNarrow, (pressed || hovered || focused) && styles.focus]}>
    <View style={styles.photo}>
      {cover ? <Image source={{ uri: cover }} accessibilityLabel={`${unit.title || name} photo`} style={StyleSheet.absoluteFill} contentFit="cover"/> : <Ionicons name="image-outline" size={28} color={Studently.color.inkMuted}/>}
      <View style={styles.typeTag}><LText variant="caption" style={{ color: 'white' }}>{name}</LText></View>
    </View>
    <View style={styles.cardBody}>
      <LText variant="subtitle" numberOfLines={2}>{unit.title || name}</LText>
      <LText variant="caption" tone="muted">{[unit.areaSqm ? `${unit.areaSqm} m²` : null, unit.bathroomPrivacy ? `${unit.bathroomPrivacy === 'private' ? 'Private' : 'Shared'} bathroom` : null,
        type === 'shared_bed' && unit.bedsAvailable != null && unit.bedsTotal != null ? `${unit.bedsAvailable} of ${unit.bedsTotal} beds available` : null].filter(Boolean).join(' · ')}</LText>
      <LText variant="caption" tone="muted">{unit.availability === 'pending' ? 'Under offer' : 'Available'}{unit.availableFrom ? ` · From ${formatAvailableFrom(unit.availableFrom)}` : ''}</LText>
      <View style={styles.priceRow}><View style={{ flex: 1 }}><LText variant="title">{formatFreshUsd(unit.monthlyRentUsd)}</LText><LText variant="caption" tone="muted">per {basis} / month</LText></View><Ionicons name="arrow-forward" size={20} color={Studently.color.primary}/></View>
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  section: { gap: 16, paddingVertical: 24, borderTopWidth: 1, borderTopColor: Studently.color.border },
  heading: { gap: 8 }, eyebrow: { color: Studently.color.primary, letterSpacing: 1.4, fontSize: 11 },
  title: { fontSize: 24, lineHeight: 30, letterSpacing: -0.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 14, borderRadius: Studently.radius.pill, borderWidth: 1, borderColor: Studently.color.border, backgroundColor: Studently.color.surface },
  chipSelected: { backgroundColor: Studently.color.primaryMist, borderColor: Studently.color.primary },
  focus: { borderColor: Studently.color.primary, backgroundColor: Studently.color.primaryMist },
  filters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, justifyContent: 'space-between' },
  priceFilter: { gap: 4 }, input: { width: 180, minHeight: 44, borderWidth: 1, borderColor: Studently.color.border, borderRadius: Studently.radius.sm, paddingHorizontal: 12, backgroundColor: Studently.color.surface, color: Studently.color.ink, fontFamily: Studently.type.body },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { flexBasis: '47%', flexGrow: 1, minWidth: 220, maxWidth: '100%', borderWidth: 1, borderColor: Studently.color.border, borderRadius: Studently.radius.lg, overflow: 'hidden', backgroundColor: Studently.color.surface },
  cardNarrow: { flexBasis: '100%', minWidth: 0 },
  photo: { height: 150, backgroundColor: Studently.color.bgWash, justifyContent: 'center', alignItems: 'center' },
  typeTag: { position: 'absolute', bottom: 12, left: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Studently.radius.pill, backgroundColor: Studently.color.primaryDeep },
  cardBody: { gap: 8, padding: 16 }, priceRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 8 },
});

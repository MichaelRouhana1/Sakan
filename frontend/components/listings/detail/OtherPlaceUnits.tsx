import { useState } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LText } from '@/components/lister/Typography';
import { Studently } from '@/constants/theme';
import { formatFreshUsd } from '@/lib/format';
import { formatAvailableFrom } from '@/lib/listingLabels';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import { detailUnitType, filterSiblingUnits, siblingHeading } from '@/lib/listingDetailOwnership';
import type { Listing } from '@/types/listing';

const pointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null;

export function DetailFilterChip({ label, selected, onPress, tab = false, dense = false }: { label: string; selected?: boolean; onPress: () => void; tab?: boolean; dense?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed, hovered }) => [
        tab ? styles.tab : styles.chip,
        dense && (tab ? styles.tabDense : styles.chipDense),
        pointer,
        selected && (tab ? styles.tabOn : styles.chipSelected),
        (focused || pressed || hovered) && (tab ? styles.tabHover : styles.focus),
      ]}
    >
      <LText variant="caption" style={[styles.tabLabel, dense && styles.denseLabel, selected && (tab ? styles.tabLabelOn : styles.chipLabelOn)]}>{label}</LText>
    </Pressable>
  );
}

const types = [['whole_apartment', 'Apartments'], ['private_room', 'Private rooms'], ['shared_bed', 'Shared beds']] as const;
const typeDetails = {
  whole_apartment: { icon: 'business-outline', description: 'Browse the other apartments at this address.' },
  private_room: { icon: 'bed-outline', description: 'A room of your own, with shared spaces in the same place.' },
  shared_bed: { icon: 'people-outline', description: 'A bed in a room shared with other residents.' },
} as const;
type Props = { listing: Listing; siblings: Listing[]; loading?: boolean; error?: boolean; onRetry: () => void };

export function OtherPlaceUnits({ listing, siblings, loading, error, onRetry }: Props) {
  const [type, setType] = useState('all');
  const [availability, setAvailability] = useState('all');
  const [maxRent, setMaxRent] = useState('');
  const [sectionWidth, setSectionWidth] = useState(0);
  const compact = sectionWidth > 0 && sectionWidth < 560;
  const shown = filterSiblingUnits(siblings, { type, availability, maxRent });
  const clear = () => { setType('all'); setAvailability('all'); setMaxRent(''); };
  const filtered = type !== 'all' || availability !== 'all' || maxRent !== '';
  return (
    <View testID="other-place-units" onLayout={event => setSectionWidth(event.nativeEvent.layout.width)} style={styles.section}>
      <View style={styles.heading}>
        <LText accessibilityRole="header" variant="title" style={styles.title}>{loading || error ? 'Other units in this place' : siblingHeading(listing, siblings)}</LText>
        {!loading && !error && siblings.length > 0 ? (
          <LText variant="caption" tone="muted" style={styles.count} accessibilityLiveRegion="polite">Showing {shown.length} of {siblings.length}</LText>
        ) : null}
      </View>
      {loading ? <LText style={styles.message} accessibilityLiveRegion="polite">Loading other units…</LText> : error ? (
        <View style={[styles.inline, styles.message]}>
          <LText accessibilityRole="alert">Other units could not be loaded.</LText>
          <DetailFilterChip label="Retry other units" onPress={onRetry} />
        </View>
      ) : siblings.length === 0 ? <LText style={styles.message} tone="muted">No other units are currently available to browse.</LText> : (
        <>
          <View style={styles.toolbar}>
            <View style={styles.availabilityFilters} accessibilityLabel="Availability filters">
              {([['all', 'All availability'], ['available', 'Available'], ['pending', 'Under offer']] as const).map(([key, label]) => (
                <DetailFilterChip dense key={key} label={label} selected={availability === key} onPress={() => setAvailability(key)} />
              ))}
            </View>
            <TextInput
              accessibilityLabel="Maximum monthly rent in USD"
              placeholder="Max USD / month"
              placeholderTextColor={Studently.color.inkFaint}
              keyboardType="number-pad"
              value={maxRent}
              onChangeText={value => setMaxRent(value.replace(/[^0-9]/g, ''))}
              style={styles.input}
            />
            {filtered ? <DetailFilterChip dense label="Clear filters" onPress={clear} /> : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabs} accessibilityLabel="Unit type filters">
            <DetailFilterChip dense tab label={`All (${siblings.length})`} selected={type === 'all'} onPress={() => setType('all')} />
            {types.map(([key, label]) => {
              const count = siblings.filter(unit => detailUnitType(unit) === key).length;
              return count ? <DetailFilterChip dense tab key={key} label={`${label} (${count})`} selected={type === key} onPress={() => setType(key)} /> : null;
            })}
          </ScrollView>
          {shown.length === 0 ? <LText style={styles.message}>No units match these filters.</LText> : (
            <View style={styles.list}>
              {types.map(([key, label]) => {
                const units = shown.filter(unit => detailUnitType(unit) === key);
                if (!units.length) return null;
                const details = typeDetails[key];
                return (
                  <View key={key}>
                    <View style={styles.category}>
                      <View style={styles.categoryIcon}><Ionicons name={details.icon} size={24} color={Studently.color.ink} /></View>
                      <View style={styles.categoryCopy}>
                        <LText variant="subtitle" style={styles.categoryTitle}>{label}</LText>
                        <LText style={styles.categoryDescription} tone="muted">{details.description}</LText>
                      </View>
                    </View>
                    {units.map(unit => <UnitRow key={unit.id} unit={unit} compact={compact} />)}
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </View>
  );
}

function UnitRow({ unit, compact }: { unit: Listing; compact: boolean }) {
  const [focused, setFocused] = useState(false);
  const type = detailUnitType(unit);
  const cover = resolveMediaUrl(unit.coverUrl ?? unit.photos[0]?.url ?? null);
  const name = type === 'whole_apartment' ? 'Apartment' : type === 'private_room' ? 'Private room' : 'Shared bed';
  const basis = unit.priceBasis === 'per_bed_month' ? 'bed' : unit.priceBasis === 'per_room_month' ? 'room' : 'apartment';
  const from = formatAvailableFrom(unit.availableFrom);
  const features: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { icon: typeDetails[type].icon, label: name },
    ...(unit.areaSqm ? [{ icon: 'resize-outline' as const, label: `${unit.areaSqm} m²` }] : []),
    ...(unit.bathroomPrivacy ? [{ icon: 'water-outline' as const, label: `${unit.bathroomPrivacy === 'private' ? 'Private' : 'Shared'} bathroom` }] : []),
    ...(type === 'shared_bed' && unit.bedsAvailable != null && unit.bedsTotal != null ? [{ icon: 'people-outline' as const, label: `${unit.bedsAvailable} of ${unit.bedsTotal} beds` }] : []),
  ];
  const status = unit.availability === 'pending' ? 'Under offer' : 'Available';
  return (
    <Pressable
      testID={`sibling-unit-${unit.id}`}
      accessibilityRole="link"
      accessibilityLabel={`View ${unit.title || name}, ${formatFreshUsd(unit.monthlyRentUsd)} per ${basis} per month`}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={() => router.push(`/(renter)/listing/${unit.id}` as never)}
      style={({ pressed, hovered }) => [styles.row, compact && styles.rowCompact, pointer, (pressed || hovered || focused) && styles.rowOn, focused && styles.rowFocused]}
    >
      <View style={[styles.thumb, compact && styles.thumbCompact]}>
        {cover ? (
          <Image source={{ uri: cover }} accessibilityLabel={`${unit.title || name} photo`} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Ionicons name="image-outline" size={28} color={Studently.color.inkMuted} />
        )}
      </View>
      <View style={[styles.copy, compact && styles.copyCompact]}>
        <LText variant="subtitle" numberOfLines={2} style={[styles.name, compact && styles.nameCompact]}>{unit.title || name}</LText>
        <View style={[styles.offer, compact && styles.offerCompact]}>
          <View style={[styles.status, unit.availability === 'pending' && styles.statusPending]}>
            <LText style={[styles.statusText, compact && styles.smallText, unit.availability === 'pending' && styles.statusTextPending]}>{status}{from ? ` · From ${from}` : ''}</LText>
          </View>
          <LText style={[styles.rent, compact && styles.smallText]}>From: <LText style={[styles.price, compact && styles.smallText]}>{formatFreshUsd(unit.monthlyRentUsd)}</LText> /{basis}/month</LText>
        </View>
        <View style={[styles.features, compact && styles.featuresCompact]}>
          {features.map(feature => (
            <View key={feature.label} style={styles.feature}>
              <Ionicons name={feature.icon} size={16} color={Studently.color.inkMuted} />
              <LText style={[styles.featureLabel, compact && styles.smallText]}>{feature.label}</LText>
            </View>
          ))}
        </View>
        <View style={styles.detailsLink}>
          <LText style={styles.detailsLabel}>View {type === 'whole_apartment' ? 'apartment' : type === 'shared_bed' ? 'bed' : 'room'} details</LText>
          <Ionicons name="chevron-forward" size={17} color={Studently.color.primary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: Studently.radius.lg,
    borderWidth: 1,
    borderColor: Studently.color.border,
    backgroundColor: Studently.color.surface,
    overflow: 'hidden',
  },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, paddingHorizontal: 16, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: Studently.color.bgWash },
  title: { flexGrow: 1, flexShrink: 1, fontFamily: Studently.type.bodyBold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  count: { fontSize: 13, lineHeight: 20 },
  message: { padding: 16 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  tabBar: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: Studently.color.bgWash },
  tabs: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingHorizontal: 16, paddingTop: 8 },
  tab: {
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'transparent',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  tabDense: { minHeight: 34, paddingHorizontal: 12 },
  tabOn: { borderColor: Studently.color.primary, backgroundColor: Studently.color.primaryMist },
  tabHover: { backgroundColor: Studently.color.primaryMist },
  tabLabel: { fontSize: 14, lineHeight: 20, color: Studently.color.inkMuted, fontFamily: Studently.type.bodySemi },
  denseLabel: { fontSize: 13, lineHeight: 18 },
  tabLabelOn: { color: Studently.color.primary, fontFamily: Studently.type.bodyBold },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Studently.color.bgWash },
  availabilityFilters: { flexDirection: 'row', flexWrap: 'wrap', maxWidth: '100%', gap: 6 },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: Studently.radius.pill,
    borderWidth: 1,
    borderColor: Studently.color.border,
    backgroundColor: Studently.color.surface,
  },
  chipDense: { minHeight: 32, paddingHorizontal: 12 },
  chipSelected: { backgroundColor: Studently.color.primaryMist, borderColor: Studently.color.primary },
  chipLabelOn: { color: Studently.color.primary, fontFamily: Studently.type.bodyBold },
  focus: { borderColor: Studently.color.primary, backgroundColor: Studently.color.primaryMist },
  input: {
    width: 156,
    height: 32,
    borderWidth: 1,
    borderColor: Studently.color.border,
    borderRadius: Studently.radius.pill,
    paddingHorizontal: 12,
    backgroundColor: Studently.color.surface,
    color: Studently.color.ink,
    fontFamily: Studently.type.body,
    fontSize: 13,
  },
  list: { backgroundColor: Studently.color.surfaceMuted },
  category: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderTopWidth: 8, borderTopColor: Studently.color.surfaceMuted, borderBottomWidth: 1, borderBottomColor: Studently.color.bgWash, backgroundColor: Studently.color.surface },
  categoryIcon: { width: 44, height: 44, borderRadius: 8, backgroundColor: Studently.color.bgWash, alignItems: 'center', justifyContent: 'center' },
  categoryCopy: { flex: 1, minWidth: 0, gap: 2 },
  categoryTitle: { fontSize: 16, lineHeight: 22, fontFamily: Studently.type.bodyBold },
  categoryDescription: { fontSize: 14, lineHeight: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
    minHeight: 200,
    padding: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Studently.color.bgWash,
  },
  rowCompact: { gap: 12, minHeight: 0, paddingVertical: 16 },
  rowOn: { backgroundColor: Studently.color.primaryMist },
  rowFocused: { outlineWidth: 2, outlineColor: Studently.color.primary, outlineOffset: -2 },
  thumb: {
    width: 160,
    height: 160,
    flexShrink: 0,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Studently.color.bgWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbCompact: { width: 96, height: 96 },
  copy: { flex: 1, minWidth: 0, minHeight: 160, gap: 18, justifyContent: 'space-between', paddingVertical: 2 },
  copyCompact: { minHeight: 0, gap: 10, paddingVertical: 0 },
  name: { fontSize: 17, lineHeight: 24 },
  nameCompact: { fontSize: 16, lineHeight: 22 },
  offer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  offerCompact: { gap: 6 },
  status: { alignSelf: 'flex-start', maxWidth: '100%', borderWidth: 1, borderColor: Studently.color.primarySoft, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: Studently.color.surface },
  statusPending: { borderColor: Studently.color.warning, backgroundColor: Studently.color.warningSoft },
  statusText: { color: Studently.color.primary, fontSize: 14, lineHeight: 20 },
  statusTextPending: { color: Studently.color.warning },
  rent: { fontSize: 14, lineHeight: 20 },
  price: { color: Studently.color.ink, fontFamily: Studently.type.bodySemi, fontSize: 15, lineHeight: 20 },
  features: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 8 },
  featuresCompact: { columnGap: 12, rowGap: 6 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  featureLabel: { flexShrink: 1, fontSize: 14, lineHeight: 20 },
  smallText: { fontSize: 12, lineHeight: 18 },
  detailsLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailsLabel: { fontSize: 14, lineHeight: 20, color: Studently.color.primary, fontFamily: Studently.type.bodyMedium },
});

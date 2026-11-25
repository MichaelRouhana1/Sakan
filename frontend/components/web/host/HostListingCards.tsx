import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useDesktopDesign } from '@/components/ui/DesktopDesign';
import { SquishSwitch } from '@/components/ui/SquishSwitch';
import { Studently } from '@/constants/theme';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import type { Listing } from '@/types/listing';
import { HostBedsControl } from '@/components/listings/HostBedsControl';
import { Button, MenuTrigger, type Anchor } from './hostWorkspacePrimitives';
import { autoRenewCaption, autoRenewInfo, date, unitCampusName, unitTitle, unitTypeName, workspaceFacts, type WorkspaceAction } from './listingsWorkspaceModel';

const actionCopy: Record<WorkspaceAction, { short: string; full: string }> = {
  renew: { short: 'Renew', full: 'Renew' },
  edit: { short: 'Edit', full: 'Edit' },
  analytics: { short: 'Analytics', full: 'View analytics' },
  availability: { short: 'Availability', full: 'Update availability' },
};

/** Responsive card grid. Tracks never shrink below the minimum, so cards keep a readable measure. */
export function CardGrid({ children, testID }: { children: ReactNode; testID?: string }) {
  const { styles: resolveStyles } = useDesktopDesign();
  const s = resolveStyles(base);
  return <View style={s.grid} testID={testID}>{children}</View>;
}

type HeadingProps = {
  name: string; area: string; shown: number; total: number; attention: number; folded: boolean;
  createDisabled: boolean; onToggle: () => void; onAdd: () => void; onMenu: (anchor: Anchor) => void;
};

/** A place is a section, not a container: plain heading, no fill, no border. */
export function PlaceHeading({ name, area, shown, total, attention, folded, createDisabled, onToggle, onAdd, onMenu }: HeadingProps) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const s = resolveStyles(base);
  return <View style={s.placeHead}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${folded ? 'Expand' : 'Collapse'} ${name}`} accessibilityState={{ expanded: !folded }} onPress={onToggle} style={s.placeToggle}>
      <Ionicons name={folded ? 'chevron-forward' : 'chevron-down'} size={designSize(18)} color={Studently.color.inkMuted} />
      <View style={s.flex}>
        <Text style={s.placeTitle} numberOfLines={1}>{name}<Text style={s.placeArea}> · {area}</Text></Text>
        <Text style={s.placeMeta}>
          {shown === total ? `${total} units` : `${shown} of ${total} units`}
          {attention ? <Text style={s.warnText}> · {attention} need attention</Text> : null}
        </Text>
      </View>
    </Pressable>
    <Button label="Add unit" icon="add" disabled={createDisabled} onPress={onAdd} />
    <MenuTrigger label={`Place options for ${name}`} onPress={onMenu} />
  </View>;
}

type UnitCardProps = {
  unit: Listing; now: number; singlePlace: boolean; autoBusy: boolean;
  onAction: (kind: WorkspaceAction) => void; onMenu: (anchor: Anchor) => void;
  onToggle: (enabled: boolean) => void; onAnalytics: () => void;
};

export function UnitCard({ unit, now, singlePlace, autoBusy, onAction, onMenu, onToggle, onAnalytics }: UnitCardProps) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const s = resolveStyles(base);
  const f = workspaceFacts(unit, now);
  const info = autoRenewInfo(unit, now);
  const caption = autoRenewCaption(unit, now);
  const title = unitTitle(unit);
  const photo = resolveMediaUrl(unit.coverUrl ?? unit.photos?.[0]?.url ?? null);
  const dim = f.expired || f.rented;
  const meta = [unitTypeName(unit), singlePlace ? unit.area : null, unitCampusName(unit)].filter(Boolean).join(' · ');
  const unitSuffix = unit.priceBasis === 'per_bed_month' ? '/bed/mo' : unit.priceBasis === 'per_room_month' ? '/room/mo' : '/mo';
  const tone = f.expired ? 'expired' : f.expiring ? 'expiring' : f.live ? 'live' : 'muted';
  const dot = { expired: '#B42318', expiring: '#B45309', live: '#25814C', muted: '#6B7280' }[tone];

  return <Pressable accessible={false} focusable={false} testID={`unit-${unit.id}`} style={(state) => [s.card, (state as { hovered?: boolean }).hovered && s.cardHover]}>
    <View style={s.photo}>
      {photo
        ? <Image source={{ uri: photo }} testID="listing-thumbnail" style={[StyleSheet.absoluteFill, dim && s.photoDim]} contentFit="cover" accessibilityLabel="" />
        : <View style={s.photoFallback} testID="listing-thumbnail"><Ionicons name="home-outline" size={designSize(32)} color="#8A847C" /></View>}
      <View style={[s.chip, tone === 'expiring' && s.chipExpiring, tone === 'expired' && s.chipExpired]}>
        <View style={[s.dot, { backgroundColor: dot }]} />
        <Text style={[s.chipText, tone === 'expiring' && s.expiringText, tone === 'expired' && s.expiredText]} numberOfLines={1}>{f.status.label}</Text>
      </View>
      <View style={s.photoMenuSlot}><MenuTrigger onPhoto label={`Actions for ${title}`} onPress={onMenu} /></View>
    </View>

    <View style={s.body}>
      <Text style={s.title} numberOfLines={2}>{title}</Text>
      <Text style={s.meta} numberOfLines={1}>{meta}</Text>
      <View style={s.priceRow}>
        <Text style={s.price}>${unit.monthlyRentUsd.toLocaleString()}<Text style={s.priceUnit}>{unitSuffix}</Text></Text>
        <Text style={[s.availability, f.needsBeds && s.warnText]} numberOfLines={1}>{f.availability}</Text>
      </View>
      <HostBedsControl listing={unit} compact />
      <Pressable accessibilityRole="button" accessibilityLabel={`Analytics for ${title}`} onPress={onAnalytics} style={s.stats}>
        <Ionicons name="stats-chart-outline" size={designSize(14)} color={Studently.color.inkMuted} />
        <Text style={s.statsText}>{unit.viewCount ?? 0} views · {unit.contactTapCount ?? 0} taps</Text>
      </Pressable>
    </View>

    <View style={s.footer}>
      <SquishSwitch accessibilityLabel={`Auto-renew for ${title}`} value={f.enabled} disabled={info.disabled || !info.ready || autoBusy} onValueChange={onToggle} />
      <View style={s.autoCopy}>
        <Text style={s.autoLabel} numberOfLines={1}>Auto-renew {info.ready ? (f.enabled ? 'on' : 'off') : '—'}</Text>
        {caption.short ? <Text style={[s.autoCaption, caption.warn && s.warnText]} numberOfLines={1} accessibilityLabel={caption.full}>{caption.short}</Text> : null}
      </View>
      <Button label={actionCopy[f.primary].short} accessibilityLabel={`${actionCopy[f.primary].full} ${title}`} primary={f.primary === 'renew'} onPress={() => onAction(f.primary)} />
    </View>
  </Pressable>;
}

export function DraftCard({ title, subtitle, coverUrl, onPress, testID }: { title: string; subtitle: string; coverUrl?: string | null; onPress: () => void; testID: string }) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const s = resolveStyles(base);
  const photo = resolveMediaUrl(coverUrl ?? null);
  return <Pressable accessible={false} focusable={false} testID={testID} style={(state) => [s.card, (state as { hovered?: boolean }).hovered && s.cardHover]}>
    <View style={s.photo}>
      {photo
        ? <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel="" />
        : <View style={s.photoFallback}><Ionicons name="document-text-outline" size={designSize(32)} color="#8A847C" /></View>}
      <View style={s.chip}><View style={[s.dot, { backgroundColor: '#6B7280' }]} /><Text style={s.chipText}>In progress</Text></View>
    </View>
    <View style={s.body}>
      <Text style={s.title} numberOfLines={2}>{title}</Text>
      <Text style={s.meta} numberOfLines={2}>{subtitle}</Text>
    </View>
    <View style={s.footer}>
      <Text style={[s.autoCaption, s.flex]}>Not published</Text>
      <Button label="Continue" accessibilityLabel={`Continue draft ${title}`} onPress={onPress} />
    </View>
  </Pressable>;
}

export function GridSkeleton() {
  const { styles: resolveStyles } = useDesktopDesign();
  const s = resolveStyles(base);
  return <CardGrid testID="listings-loading">
    {[0, 1, 2, 3, 4, 5].map(i => <View key={i} style={s.card} accessibilityLabel="Loading listings">
      <View style={s.skeletonPhoto} />
      <View style={s.body}>
        <View style={[s.bone, { width: '70%', height: 16 }]} />
        <View style={[s.bone, { width: '45%', height: 12 }]} />
        <View style={[s.bone, { width: '30%', height: 18, marginTop: 6 }]} />
      </View>
      <View style={s.footer}><View style={[s.bone, { width: 56, height: 28, borderRadius: 14 }]} /><View style={s.flex} /><View style={[s.bone, { width: 84, height: 44, borderRadius: 8 }]} /></View>
    </View>)}
  </CardGrid>;
}

const base = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(296px, 1fr))', gap: 20 } as Record<string, unknown>,

  placeHead: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  placeToggle: { flex: 1, minWidth: 0, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  placeTitle: { fontFamily: Studently.type.bodySemi, fontSize: 17, lineHeight: 24, color: '#1A1A1A', letterSpacing: -0.2 },
  placeArea: { fontFamily: Studently.type.body, color: '#625E59' },
  placeMeta: { fontFamily: Studently.type.body, fontSize: 13, lineHeight: 18, color: '#625E59' },

  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E4E8', borderRadius: 14, overflow: 'hidden', transitionProperty: 'box-shadow, border-color', transitionDuration: '180ms', transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' } as Record<string, unknown>,
  cardHover: { borderColor: '#C3C9D2', boxShadow: '0 8px 24px rgba(26,26,26,0.08)' },

  photo: { aspectRatio: 1.8, backgroundColor: '#E8EAED' },
  photoDim: { filter: 'grayscale(0.8)', opacity: 0.8 } as Record<string, unknown>,
  photoFallback: { backgroundColor: '#F0F1F3', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  skeletonPhoto: { aspectRatio: 1.8, backgroundColor: '#F0F1F3' },
  photoMenuSlot: { position: 'absolute', top: 10, right: 10 },
  chip: { position: 'absolute', top: 12, left: 12, maxWidth: '75%', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.96)', boxShadow: '0 1px 4px rgba(26,26,26,0.22)' },
  chipExpiring: { backgroundColor: '#FFFBEB' },
  chipExpired: { backgroundColor: '#FEF3F2' },
  chipText: { fontFamily: Studently.type.bodySemi, fontSize: 13, lineHeight: 18, color: '#242321', flexShrink: 1 },
  expiringText: { color: '#92400E' },
  expiredText: { color: '#B42318' },
  dot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },

  body: { flex: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, gap: 2 },
  title: { fontFamily: Studently.type.bodySemi, fontSize: 16, lineHeight: 22, color: '#1A1A1A', minHeight: 22 },
  meta: { fontFamily: Studently.type.body, fontSize: 13, lineHeight: 19, color: '#625E59' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  price: { fontFamily: Studently.type.bodyBold, fontSize: 20, lineHeight: 26, color: '#1A1A1A', letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  priceUnit: { fontFamily: Studently.type.body, fontSize: 13, color: '#625E59', letterSpacing: 0 },
  availability: { flexShrink: 1, fontFamily: Studently.type.bodyMedium, fontSize: 13, lineHeight: 18, color: '#37332F' },
  stats: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 2 },
  statsText: { fontFamily: Studently.type.body, fontSize: 13, lineHeight: 18, color: '#625E59', fontVariant: ['tabular-nums'] },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#EDEEF0' },
  autoCopy: { flex: 1, minWidth: 0 },
  autoLabel: { fontFamily: Studently.type.bodySemi, fontSize: 13, lineHeight: 18, color: '#242321' },
  autoCaption: { fontFamily: Studently.type.body, fontSize: 12, lineHeight: 17, color: '#625E59' },
  warnText: { color: '#92400E' },
  bone: { backgroundColor: '#E8EAED', borderRadius: 4 },
});

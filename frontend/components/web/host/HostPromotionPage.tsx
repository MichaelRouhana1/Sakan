import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { api } from '@/lib/api';
import { eventId } from '@/features/promotions/activity';
import { useListingPromotions, usePromotionCatalog, usePromotionMutation, usePromotionOptions } from '@/features/promotions/usePromotions';
import { canUndoPromotion, formatPromotionCredits as credits, OPEN_PROMOTION_STATUSES, promotionDate, promotionExpiresDuringRun, promotionMode, promotionPriceSaving, promotionRemainingLabel, PROMOTION_STATUS_LABELS } from '@/features/promotions/promotionPresentation';
import type { PromotionCampaign } from '@/types/promotions';

type Analytics = {
  period: { activeSeconds: number }; previousPeriod: { available: boolean; hadPromotion: boolean };
  during: { views: number; whatsappTaps: number }; before: { views: number; whatsappTaps: number } | null;
  impressions: { total: number; webViewable: number; expoViewport: number }; attributedTaps: number;
  costPerWhatsappTap: number | null; provisional: boolean;
};
function Button({ label, onPress, disabled, secondary = false }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, (disabled || pressed) && { opacity: disabled ? 0.45 : 0.7 }]}><Text style={[s.buttonText, secondary && { color: '#18324F' }]}>{label}</Text></Pressable>;
}
function CampaignReport({ campaign }: { campaign: PromotionCampaign }) {
  const report = useQuery({ queryKey: ['promotions', 'analytics', campaign.id], queryFn: async () => (await api.get<{ data: Analytics }>(`/api/promotions/${campaign.id}/analytics`)).data.data, refetchInterval: campaign.status === 'active' ? 60_000 : false });
  if (report.isLoading) return <ActivityIndicator accessibilityLabel="Loading promotion results" />;
  if (!report.data) return <Text style={s.muted}>Results could not load. Please try again.</Text>;
  const a = report.data;
  return <View style={s.report}>
    <Text style={s.eyebrow}>YOUR RESULTS{a.provisional ? ' · SO FAR' : ''}</Text>
    <Text style={s.muted}>{(a.period.activeSeconds / 86400).toFixed(1)} active days compared with the same time before this run. Paused time is excluded.</Text>
    <View style={s.metricRow}>{[['Listing views', a.during.views, a.before?.views], ['WhatsApp taps', a.during.whatsappTaps, a.before?.whatsappTaps]].map(([label, during, before]) => <View key={String(label)} style={s.metric}><Text style={s.muted}>{label}</Text><Text style={s.metricValue}>{during}</Text><Text style={s.muted}>{before == null ? 'Before: not enough recorded history' : `${before} before`}</Text></View>)}</View>
    {a.previousPeriod.hadPromotion && <Text style={s.muted}>The comparison period also included paid placement.</Text>}
    {campaign.type === 'featured' && <Text style={s.body}>Featured impressions (one per search session): {a.impressions.total} · {a.impressions.webViewable} web (half the card visible for 1 second), {a.impressions.expoViewport} app (rendered in viewport).</Text>}
    <Text style={s.body}>{a.costPerWhatsappTap == null ? 'Cost per WhatsApp tap: — (no attributed taps yet)' : `${credits(a.costPerWhatsappTap)} credits per WhatsApp tap`} · {a.attributedTaps} taps attributed to this boost.</Text>
    <Text style={s.muted}>Cost uses credits spent minus refunds, divided by attributed taps. A tap is a contact attempt, not a confirmed renter.</Text>
  </View>;
}
export function HostPromotionPage({ listingId, published, initialProduct }: { listingId: string; published?: boolean; initialProduct?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const wide = useWindowDimensions().width >= 900;
  const catalog = usePromotionCatalog();
  const options = usePromotionOptions(listingId);
  const campaigns = useListingPromotions(listingId);
  const notices = useQuery({ queryKey: ['promotions', 'notifications'], queryFn: async () => (await api.get<{ data: { id: string; campaignId: string; message: string; createdAt: string }[] }>('/api/promotions/notifications')).data.data, refetchInterval: 60_000 });
  const mutate = usePromotionMutation();
  const [productId, setProductId] = useState(initialProduct || 'featured_7');
  const [marketKey, setMarketKey] = useState('');
  const [autoRenew, setAutoRenew] = useState(false);
  const [message, setMessage] = useState('');
  const purchaseKey = useRef(eventId());
  const cat = catalog.data, data = options.data;
  const product = cat?.products.find(p => p.id === productId) ?? cat?.products[0];
  const market = data?.markets.find(m => m.key === marketKey) ?? data?.markets[0];
  const mode = product ? promotionMode(product, market) : 'start';
  async function run(input: Parameters<typeof mutate.mutateAsync>[0]) {
    setMessage('');
    try { const result = await mutate.mutateAsync(input); setMessage(`${PROMOTION_STATUS_LABELS[result.status]}. ${result.refundedCredits ? `${credits(result.refundedCredits)} credits returned.` : ''}`); if (input.kind === 'create') purchaseKey.current = eventId(); }
    catch (error) { setMessage(axios.isAxiosError(error) ? error.response?.data?.error?.message ?? 'Could not save. Try again.' : 'Could not save. Try again.'); }
  }
  const current = data?.currentCampaign;
  return <ScrollView style={s.page} contentContainerStyle={[s.container, { paddingTop: Platform.OS === 'web' ? 24 : insets.top + 16, paddingBottom: insets.bottom + 100 }]}>
    <Button secondary label="Back to listings" onPress={() => router.push('/hosting/listing' as never)} />
    <View style={s.heading}><Text style={s.eyebrow}>{published ? 'YOUR LISTING IS LIVE' : 'LISTING PROMOTION'}</Text><Text accessibilityRole="header" style={[s.title, !wide && { fontSize: 30, lineHeight: 36 }]}>{published ? 'Give your new listing a head start.' : 'A little more visibility.'}</Text><Text style={s.lede}>Choose shared top slots or a daily lift in normal results. Renters still contact you on WhatsApp.</Text></View>
    {message ? <Text accessibilityRole="alert" style={s.notice}>{message}</Text> : null}
    {(catalog.isLoading || options.isLoading) && <ActivityIndicator color="#2F6FED" />}
    {(catalog.isError || options.isError) && <View style={s.panel}><Text style={s.body}>We couldn’t load promotion options.</Text><Button label="Try again" onPress={() => { void catalog.refetch(); void options.refetch(); }} /></View>}
    {cat && data && product && <View style={[s.columns, wide && { flexDirection: 'row' }]}>
      <View style={[s.panel, { flex: 2 }]}>
        <Text style={s.eyebrow}>{data.listingTitle}</Text>
        <Text style={s.sectionTitle}>{current ? 'Manage your promotion' : 'Choose your placement'}</Text>
        {current ? <><Text style={s.body}>{current.listingTitle}</Text><Text style={s.status}>{current.type === 'featured' ? 'Featured' : 'Bump'} · {PROMOTION_STATUS_LABELS[current.status]}</Text><Text style={s.body}>{promotionRemainingLabel(current.remainingSeconds)}</Text><Text style={s.muted}>{current.status === 'queued' ? `Queue position ${current.queuePosition ?? '—'}. Credits are deducted only when it starts.` : current.status === 'paused' ? 'Your time is saved. Resuming may put you in the queue.' : `Ends ${promotionDate(current.endsAt)} · Beirut time`}</Text>{current.stopReason && <Text style={s.muted}>{current.stopReason.replaceAll('_', ' ')}</Text>}
          <View style={s.actions}>{current.status === 'active' && current.pausable && <Button secondary disabled={mutate.isPending} label="Pause run" onPress={() => void run({ kind: 'pause', id: current.id })} />}{['paused', 'action_needed'].includes(current.status) && <Button disabled={mutate.isPending} label="Resume / queue next available" onPress={() => void run({ kind: 'resume', id: current.id })} />}<Button secondary disabled={mutate.isPending} label={current.status === 'queued' ? 'Leave queue' : 'Stop & return unused credits'} onPress={() => void run({ kind: 'stop', id: current.id })} />{canUndoPromotion(current) && <Button secondary disabled={mutate.isPending} label={`Undo purchase · full refund until ${promotionDate(current.undoUntil)}`} onPress={() => void run({ kind: 'undo', id: current.id })} />}</View>
          <View style={s.switchRow}><Text style={s.body}>Auto-renew from wallet</Text><Switch accessibilityLabel="Auto-renew this promotion from wallet credits" value={current.autoRenew} disabled={mutate.isPending} onValueChange={enabled => void run({ kind: 'auto-renew', id: current.id, enabled })} /></View><Text style={s.muted}>Renews this promotion at its accepted price if eligible and space is available. No automatic Whish charge or listing renewal.</Text>
        </> : <>
          <View style={s.productRow}>{(['featured', 'bump'] as const).map(type => <Pressable key={type} accessibilityRole="radio" accessibilityState={{ checked: product.type === type }} onPress={() => { setProductId(type === 'featured' ? 'featured_7' : 'bump_3'); purchaseKey.current = eventId(); }} style={[s.choice, product.type === type && s.selected]}><Text style={s.sectionTitle}>{type === 'featured' ? 'Featured' : 'Bump'}</Text><Text style={s.body}>{type === 'featured' ? 'Shared top slots in your area or campus. A small Featured label.' : 'A daily lift in normal results. No label. A lighter spend.'}</Text></Pressable>)}</View>
          <Text style={s.label}>HOW LONG?</Text><View style={s.productRow}>{cat.products.filter(p => p.type === product.type).map(p => <Pressable key={p.id} accessibilityRole="radio" accessibilityState={{ checked: product.id === p.id }} onPress={() => { setProductId(p.id); purchaseKey.current = eventId(); }} style={[s.duration, product.id === p.id && s.selected]}><Text style={s.sectionTitle}>{p.durationDays} days</Text><Text style={s.body}>{credits(p.credits)} credits{p.priceStatus === 'tbd' ? ' · TBD' : ''}</Text><Text style={s.muted}>{credits(p.credits / p.durationDays)}/day{promotionPriceSaving(p, cat.products) ? ` · ${promotionPriceSaving(p, cat.products)}% less/day` : ''}</Text>{p.pausable && <Text style={s.link}>Pause when you need to</Text>}</Pressable>)}</View>
          {product.type === 'featured' && <><Text style={s.label}>WHERE?</Text>{data.markets.map(m => <Pressable key={m.key} accessibilityRole="radio" accessibilityState={{ checked: market?.key === m.key }} onPress={() => { setMarketKey(m.key); purchaseKey.current = eventId(); }} style={[s.market, market?.key === m.key && s.selected]}><Text style={s.body}>{m.label}</Text><Text style={s.link}>{m.availableSlots} of {m.capacity} slots left{m.queueLength ? ` · ${m.queueLength} waiting` : ''}</Text>{m.availableSlots === 0 && <Text style={s.muted}>{m.nextOpeningAt ? `Next expected opening ${promotionDate(m.nextOpeningAt)}` : 'Join the queue for the next opening.'}</Text>}</Pressable>)}</>}
          <View style={s.switchRow}><View style={{ flex: 1 }}><Text style={s.body}>Auto-renew from wallet</Text><Text style={s.muted}>Optional. Off by default.</Text></View><Switch accessibilityLabel="Auto-renew promotion from wallet" value={autoRenew} onValueChange={value => { setAutoRenew(value); purchaseKey.current = eventId(); }} /></View>
          <Text style={s.muted}>If enabled, another run uses wallet credits at this price when space is available. You can switch it off any time. Whish top-ups and listing renewal stay manual.</Text>
        </>}
      </View>
      <View style={[s.panel, s.summary, wide && { width: 310 }]}><Text style={s.eyebrow}>CLEAR EXPECTATIONS</Text><Text style={s.sectionTitle}>{credits(data.balanceCredits)} credits in your wallet</Text><Text style={s.body}>Filters always win. Featured rotates fairly in shared top slots; it never guarantees first place. Bump lifts once a day in newest results, on Beirut time.</Text><Text style={s.body}>We promise placement, not renters. Under-offer, rented and expired listings cannot be promoted.</Text><Text style={s.body}>Stop at any time to return unused time as credits. Undo a mistaken purchase within {cat.undoMinutes} minutes for a full credit refund.</Text>
        {!data.eligible && <Text style={s.notice}>{data.reasons.join('\n')}</Text>}
        {!current && promotionExpiresDuringRun(data.expiresAt, product.durationDays) && <Text style={s.notice}>Your listing expires before this run ends. The promotion stops at expiry and unused time is returned as credits.</Text>}
        {!cat.salesEnabled && <Text style={s.notice}>Prices are TBD. Purchases will open once final prices are published.</Text>}
        {!current && mode === 'start' && data.balanceUnits < product.creditUnits && <Text style={s.notice}>Add {credits(product.credits - data.balanceCredits)} credits to start this run.</Text>}
        {!current && <><Text style={s.metricValue}>{credits(product.credits)} <Text style={s.body}>credits{product.priceStatus === 'tbd' ? ' · TBD' : ''}</Text></Text><Button label={mutate.isPending ? 'Saving…' : mode === 'queue' ? 'Queue next available' : 'Start now'} disabled={mutate.isPending || !cat.salesEnabled || !data.eligible || (mode === 'start' && data.balanceUnits < product.creditUnits)} onPress={() => void run({ kind: 'create', body: { listingId, productId: product.id, marketKey: market?.key, mode, autoRenew, catalogVersion: cat.version, idempotencyKey: purchaseKey.current } })} /><Text style={s.muted}>{mode === 'queue' ? 'Nothing deducted now. Keep enough credits for your turn. Queue timing can change.' : 'Credits are deducted when your promotion starts.'}</Text></>}
        <Button secondary label="Buy credits with Whish" onPress={() => router.push({ pathname: '/hosting/credits', params: { returnTo: `/hosting/listing/${listingId}/promote` } } as never)} />
        <Button secondary label={published ? 'Not now · view listing' : 'View listing'} onPress={() => router.push(`/(poster)/listing/${listingId}` as never)} />
      </View>
    </View>}
    {(notices.data ?? []).filter(n => campaigns.data?.some(c => c.id === n.campaignId)).slice(0, 3).map(n => <Text key={n.id} style={s.notice}>{promotionDate(n.createdAt)} · {n.message}</Text>)}
    {campaigns.isError && <Text style={s.notice}>Promotion history could not load.</Text>}
    {(campaigns.data ?? []).map(c => <View key={c.id} style={s.panel}><View style={s.switchRow}><Text style={s.sectionTitle}>{c.type === 'featured' ? 'Featured' : 'Bump'} · {c.durationDays} days</Text><Text style={s.status}>{PROMOTION_STATUS_LABELS[c.status]}</Text></View><Text style={s.muted}>{c.marketLabel} · {promotionDate(c.startedAt ?? c.createdAt)} · {credits(c.spentCredits)} credits spent · {credits(c.refundedCredits)} returned</Text>{!OPEN_PROMOTION_STATUSES.includes(c.status) && canUndoPromotion(c) && <Button secondary label="Undo purchase · full refund" disabled={mutate.isPending} onPress={() => void run({ kind: 'undo', id: c.id })} />}<CampaignReport campaign={c} /></View>)}
  </ScrollView>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F4F6FA' }, container: { width: '100%', maxWidth: 1180, alignSelf: 'center', padding: 24, gap: 24, paddingBottom: 100 },
  heading: { gap: 12, maxWidth: 760, paddingVertical: 16 }, eyebrow: { fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 1.6, color: '#2F6FED' }, title: { fontFamily: 'DMSans_700Bold', fontSize: 38, lineHeight: 44, color: '#18324F' }, lede: { fontFamily: 'DMSans_400Regular', fontSize: 18, lineHeight: 28, color: '#526174' },
  columns: { gap: 24, alignItems: 'stretch' }, panel: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDE3EC', borderRadius: 20, padding: 24, gap: 18 }, summary: { backgroundColor: '#EDF3FF' }, sectionTitle: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: '#18324F' }, body: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 22, color: '#34455A' }, muted: { fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 19, color: '#526174' }, link: { fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: '#245AC0' }, label: { fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 1.2, color: '#526174', marginTop: 10 },
  productRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, choice: { flex: 1, minWidth: 180, borderWidth: 1, borderColor: '#DDE3EC', padding: 18, borderRadius: 14, gap: 8 }, duration: { flexGrow: 1, minWidth: 135, borderWidth: 1, borderColor: '#DDE3EC', padding: 14, borderRadius: 12, gap: 6 }, market: { padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#DDE3EC', gap: 6 }, selected: { borderColor: '#2F6FED', backgroundColor: '#EDF3FF' }, switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 },
  button: { backgroundColor: '#2F6FED', borderRadius: 12, minHeight: 48, paddingHorizontal: 18, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' }, secondary: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CFD8E5' }, buttonText: { color: '#FFF', fontFamily: 'DMSans_600SemiBold', fontSize: 14, textAlign: 'center' }, notice: { backgroundColor: '#FFF3D9', color: '#654814', padding: 14, borderRadius: 12, fontSize: 14, lineHeight: 22 }, status: { color: '#245AC0', fontFamily: 'DMSans_600SemiBold', fontSize: 14 }, actions: { gap: 10 }, report: { gap: 14, borderTopWidth: 1, borderTopColor: '#E4E9F0', paddingTop: 20 }, metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }, metric: { minWidth: 180, flex: 1, padding: 18, borderRadius: 12, backgroundColor: '#F4F6FA', gap: 5 }, metricValue: { fontFamily: 'DMSans_700Bold', fontSize: 30, color: '#18324F' },
});

import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { api } from '@/lib/api';
import { Studently } from '@/constants/theme';
import { useAuthSession } from '@/features/auth/AuthSessionProvider';
import { useExpiryDecision, useRenewListing } from '@/features/listings/useExpiryDecision';
import { HostInventoryControl } from '@/components/listings/HostInventoryControl';
import { isPastExpiry, offersRenewal } from './hostListingStatus';
import type { Listing } from '@/types/listing';

const date = (value: string | number) => new Date(value).toLocaleString(undefined, {
  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
});
const shortDate = (value: string) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const explanation = 'Renews for 30 days with 1 credit in the final hour before it expires. Uses your post-credit balance. Shared beds need a confirmed available-bed count.';

export function useListingClock() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = setInterval(update, 15000);
    if (typeof window !== 'undefined') window.addEventListener('focus', update);
    return () => { clearInterval(timer); if (typeof window !== 'undefined') window.removeEventListener('focus', update); };
  }, []);
  return now;
}

export function UnitRenewalControls({ listing }: { listing: Listing }) {
  const router = useRouter();
  const client = useQueryClient();
  const auth = useAuthSession();
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState(false);
  const [error, setError] = useState('');
  const state = useQuery({
    queryKey: ['unit-auto-renew', listing.id],
    queryFn: async () => (await api.get<{ data: { enabled: boolean; expiresAt: string; blocked: string | null } }>(`/api/listings/${listing.id}/auto-renew`)).data.data,
    enabled: auth.isSignedIn && offersRenewal(listing),
    refetchInterval: 60000,
  });
  const toggle = useMutation({
    mutationFn: async (enabled: boolean) => (await api.patch(`/api/listings/${listing.id}/auto-renew`, { enabled })).data.data,
    onSuccess: () => { setError(''); void client.invalidateQueries({ queryKey: ['unit-auto-renew'] }); void client.invalidateQueries({ queryKey: ['listings'] }); },
    onError: (failure) => setError(axios.isAxiosError(failure) ? failure.response?.data?.error?.message ?? 'Could not save auto-renew.' : 'Could not save auto-renew.'),
  });
  if (!offersRenewal(listing)) return null;
  const expiry = state.data?.expiresAt ?? listing.expiresAt;
  const expired = isPastExpiry(expiry);
  const enabled = state.data?.enabled ?? listing.autoRenew ?? false;
  const blocked = state.data?.blocked;
  const line = expired ? `Expired ${shortDate(expiry!)} · Auto-renew off` :
    enabled && blocked ? `Auto-renew blocked · ${blocked === 'credits' ? 'Add credits' : blocked === 'beds' ? 'Confirm beds' : 'Check availability'}` :
    enabled ? `Auto-renew on · By ${shortDate(expiry!)}` : `Auto-renew off · Expires ${shortDate(expiry!)}`;
  return <View style={s.controls} onStartShouldSetResponder={() => true}>
    <View style={s.row}>
      <Pressable accessibilityRole="button" accessibilityLabel="Renew listing" onPress={(e) => { e.stopPropagation(); setOpen(true); }} style={s.smallButton}><Text style={s.link}>Renew</Text></Pressable>
      {expired && <Pressable accessibilityRole="button" onPress={(e) => { e.stopPropagation(); router.push(`/hosting/listing/${listing.id}/outcome` as never); }}><Text style={s.link}>Was it rented?</Text></Pressable>}
      <View style={{ flex: 1 }} />
      <Pressable accessibilityRole="button" accessibilityLabel="How auto-renew works" onPress={(e) => { e.stopPropagation(); setInfo(!info); }}><Text style={s.info}>ⓘ</Text></Pressable>
      <Switch accessibilityLabel={`Auto-renew ${listing.title || 'unit'}`} value={enabled} disabled={toggle.isPending || !state.data || expired} onValueChange={value => toggle.mutate(value)} trackColor={{ true: Studently.color.primary }} />
    </View>
    <Text numberOfLines={1} style={[s.caption, enabled && blocked ? s.warning : null]}>{line}</Text>
    {error ? <Text accessibilityRole="alert" style={s.warning}>{error}</Text> : null}
    <Modal visible={info} transparent animationType="fade" onRequestClose={() => setInfo(false)}>
      <View style={s.overlay}><View style={s.panel}><Text style={s.heading}>Auto-renew</Text><Text style={s.body}>{explanation}</Text><Text style={s.body}>{line}</Text>{enabled && !expired ? <Text style={s.caption}>Next renewal window: {date(new Date(expiry!).getTime() - 3600000)} to {date(expiry!)}.</Text> : null}<Button label="Got it" onPress={() => setInfo(false)} /></View></View>
    </Modal>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={s.overlay}><RenewUnitConfirmation listingId={listing.id} onClose={() => setOpen(false)} /></View>
    </Modal>
  </View>;
}

export function RenewUnitConfirmation({ listingId, onClose }: { listingId: string; onClose: () => void }) {
  const auth = useAuthSession();
  const router = useRouter();
  const query = useExpiryDecision(listingId, auth.isSignedIn);
  const renew = useRenewListing(listingId);
  const [notice, setNotice] = useState('');
  const [status, setStatus] = useState<number>();
  const [done, setDone] = useState(false);
  const now = useListingClock();
  const data = query.data;
  const nextExpiry = data ? Math.max(new Date(data.cycleExpiresAt).getTime(), now) + 30 * 86400000 : null;
  async function submit() {
    if (!data || done) return;
    setNotice(''); setStatus(undefined);
    try {
      const result = await renew.mutateAsync(data.cycleExpiresAt);
      setDone(true); setNotice(`Renewed until ${date(result.cycleExpiresAt)}.`);
    } catch (failure) {
      if (axios.isAxiosError(failure)) {
        setStatus(failure.response?.status);
        setNotice(failure.response?.status === 402 ? 'You need 1 post credit to renew this unit.' : failure.response?.data?.error?.message ?? 'Could not renew. Please try again.');
      } else setNotice('Could not renew. Please try again.');
    }
  }
  return <View style={s.panel} testID="renew-confirmation">
    <Text style={s.eyebrow}>LISTING TIME</Text>
    <Text style={s.heading}>{done ? 'Renewed for 30 more days' : 'Renew this unit?'}</Text>
    {query.isLoading || auth.isLoading ? <ActivityIndicator /> : query.isError ? <><Text style={s.body}>Could not load this unit.</Text><Button label="Try again" onPress={() => void query.refetch()} /></> : !auth.isSignedIn ? <Text style={s.body}>Sign in to renew your unit.</Text> : data ? <>
      <Text style={s.body}>{data.listing.title}</Text>
      {!done && <><Text style={s.body}>Uses 1 post credit for 30 days.</Text><View style={s.dates}><Text style={s.caption}>CURRENT EXPIRY</Text><Text style={s.date}>{date(data.cycleExpiresAt)}</Text><Text style={s.caption}>NEW EXPIRY</Text><Text style={s.next}>{date(nextExpiry!)}</Text></View><Text style={s.caption}>Your balance: {data.postCredits} post credits</Text></>}
      {notice ? <Text accessibilityRole="alert" style={status ? s.warning : s.body}>{notice}</Text> : null}
      {status === 409 && /bed/i.test(notice) ? <HostInventoryControl listingId={listingId} /> : null}
      {status === 402 ? <Button label="Buy credits" onPress={() => router.push({ pathname: '/hosting/credits', params: { returnTo: `/hosting/listing/${listingId}/renew` } } as never)} /> : null}
      {!done && <Button label={renew.isPending ? 'Renewing…' : 'Renew · 1 credit'} disabled={renew.isPending || !data.canRenew} onPress={() => void submit()} />}
    </> : null}
    <Pressable accessibilityRole="button" onPress={onClose} style={s.cancel}><Text style={s.link}>{done ? 'Done' : 'Cancel'}</Text></Pressable>
  </View>;
}

function Button({label,onPress,disabled=false}:{label:string;onPress:()=>void;disabled?:boolean}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[s.button,disabled && {opacity:0.5}]}><Text style={s.buttonText}>{label}</Text></Pressable>;
}
const s = StyleSheet.create({
  controls:{gap:5,paddingVertical:10},row:{flexDirection:'row',alignItems:'center',gap:12},
  smallButton:{borderWidth:1,borderColor:Studently.color.border,borderRadius:8,paddingHorizontal:14,paddingVertical:7},
  link:{fontFamily:Studently.type.bodySemi,fontSize:13,color:Studently.color.primary},info:{fontSize:19,color:Studently.color.inkMuted},
  caption:{fontFamily:Studently.type.body,fontSize:11,lineHeight:17,color:Studently.color.inkMuted},warning:{fontFamily:Studently.type.body,fontSize:12,lineHeight:18,color:'#9C4E10'},
  overlay:{flex:1,backgroundColor:'rgba(15,23,42,0.45)',alignItems:'center',justifyContent:'center',padding:20},
  panel:{width:'100%',maxWidth:440,backgroundColor:'#FFFFFF',borderRadius:20,padding:28,gap:16},
  heading:{fontFamily:Studently.type.displaySerif,fontSize:29,lineHeight:35,color:Studently.color.ink},eyebrow:{fontFamily:Studently.type.bodySemi,fontSize:10,letterSpacing:2,color:Studently.color.primary},
  body:{fontFamily:Studently.type.body,fontSize:14,lineHeight:21,color:Studently.color.ink},dates:{gap:5,borderTopWidth:1,borderBottomWidth:1,borderColor:Studently.color.border,paddingVertical:18},
  date:{fontFamily:Studently.type.body,fontSize:15,color:Studently.color.ink,marginBottom:8},next:{fontFamily:Studently.type.bodySemi,fontSize:17,color:Studently.color.primary},
  button:{backgroundColor:Studently.color.primary,borderRadius:10,padding:14,alignItems:'center'},buttonText:{fontFamily:Studently.type.bodySemi,fontSize:14,color:'#fff'},cancel:{alignItems:'center',padding:8},
});

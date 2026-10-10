import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@/lib/api";
import { useWhishCheckout } from "@/features/credits/useWhishCheckout";
import { useCredits } from "@/features/credits/useCredits";
import { formatUsdFromCents } from "@/lib/format";

type Pack = { id: string; title: string; description: string; kind: 'post' | 'promotion'; postCredits: number; boostCredits: number; amountUsdCents: number | null; enabled: boolean; savingsPercent: number };
type Catalog = { version: string; packs: Pack[] };
const first = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;
export function HostCreditsPage() {
  const params = useLocalSearchParams<{ ref?: string; returnTo?: string }>();
  const router = useRouter();
  const requested = first(params.returnTo);
  const returnTo = requested && /^\/hosting\/listing\/[0-9a-f-]{36}\/(outcome|promote)$/i.test(requested) ? requested : undefined;
  const checkout = useWhishCheckout(first(params.ref), returnTo);
  const balance = useCredits();
  const catalog = useQuery({ queryKey: ['credits', 'catalog'], queryFn: async () => (await api.get<{ data: Catalog }>('/api/credits/catalog')).data.data });
  return <View style={s.page}>
    <Text style={s.eyebrow}>YOUR HOST WALLET</Text><Text style={s.title}>Credits, on your terms.</Text>
    <Text style={s.body}>Choose post credits or promotion credits. Pay securely with Whish; credits arrive after payment is verified.</Text>
    <View style={s.balance}><Text style={s.heading}>{balance.data?.postCredits ?? '—'} post credits</Text><Text style={s.heading}>{balance.data?.boostCredits ?? '—'} promotion credits</Text></View>
    <Text style={s.body}>Top-ups are manual. Promotion auto-renew is optional and off by default; it uses your existing wallet only.</Text>
    {checkout.tx && <View style={s.receipt}><Text style={s.heading}>{checkout.tx.status === 'approved' ? 'Credits added' : checkout.tx.status === 'pending' ? 'Finish payment in Whish' : 'Payment not completed'}</Text><Text style={s.body}>Reference: {checkout.tx.referenceId}</Text>{checkout.tx.status === 'approved' && returnTo && <Pressable accessibilityRole="button" style={s.button} onPress={() => router.push(returnTo as never)}><Text style={s.buttonText}>Return to your listing</Text></Pressable>}</View>}
    {checkout.error && <Text accessibilityRole="alert" style={s.error}>{checkout.error}</Text>}
    {catalog.isLoading && <ActivityIndicator color="#2F6FED" />}
    {catalog.isError && <Pressable accessibilityRole="button" onPress={() => void catalog.refetch()}><Text style={s.error}>Could not load prices. Tap to retry.</Text></Pressable>}
    {(['post', 'promotion'] as const).map(kind => <View key={kind} style={s.group}><Text style={s.heading}>{kind === 'post' ? 'Keep your listings live' : 'Featured & Bump credits'}</Text><View style={s.grid}>{catalog.data?.packs.filter(p => p.kind === kind).map(pack => <View key={pack.id} style={s.card}>
      <Text style={s.heading}>{pack.title}</Text><Text style={s.body}>{pack.description}</Text><Text style={s.amount}>{kind === 'post' ? pack.postCredits : pack.boostCredits}<Text style={s.body}> {kind === 'post' ? 'post credits' : 'credits'}</Text></Text>
      <Text style={s.price}>{pack.amountUsdCents == null ? 'Price TBD' : formatUsdFromCents(pack.amountUsdCents)}</Text>{pack.savingsPercent > 0 && <Text style={s.saving}>Save {pack.savingsPercent}% per {kind === 'post' ? 'post' : 'credit'}</Text>}
      <Pressable accessibilityRole="button" disabled={!pack.enabled || checkout.isStarting} onPress={() => void checkout.buy(pack.id, catalog.data!.version)} style={({ pressed }) => [s.button, (!pack.enabled || pressed || checkout.isStarting) && { opacity: 0.45 }]}><Text style={s.buttonText}>{!pack.enabled ? 'Coming soon · prices TBD' : checkout.pendingBundle === pack.id ? 'Opening Whish…' : 'Buy with Whish'}</Text></Pressable>
    </View>)}</View></View>)}
    <Text style={s.body}>Featured means shared top slots, subject to availability and renter filters. Bump lifts an eligible listing in normal results once a day. Neither guarantees enquiries.</Text>
  </View>;
}
const s = StyleSheet.create({ page: { padding: 28, paddingBottom: 100, gap: 22, width: '100%', maxWidth: 1180, alignSelf: 'center' }, eyebrow: { fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 1.5, color: '#2F6FED' }, title: { fontFamily: 'DMSans_700Bold', fontSize: 38, color: '#18324F' }, body: { fontFamily: 'DMSans_400Regular', color: '#526174', fontSize: 14, lineHeight: 22 }, heading: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: '#18324F' }, balance: { flexDirection: 'row', flexWrap: 'wrap', gap: 30, padding: 22, backgroundColor: '#EDF3FF', borderRadius: 16 }, group: { gap: 16 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 }, card: { flex: 1, minWidth: 230, padding: 24, gap: 18, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDE3EC', borderRadius: 18 }, amount: { fontFamily: 'DMSans_700Bold', fontSize: 34, color: '#18324F' }, price: { fontSize: 22, fontFamily: 'DMSans_600SemiBold', color: '#18324F' }, saving: { color: '#245AC0', fontFamily: 'DMSans_600SemiBold', fontSize: 13 }, button: { backgroundColor: '#2F6FED', padding: 15, minHeight: 48, borderRadius: 12, alignItems: 'center' }, buttonText: { fontFamily: 'DMSans_600SemiBold', color: '#FFF', fontSize: 14 }, receipt: { backgroundColor: '#EDF3FF', borderRadius: 16, padding: 22, gap: 12 }, error: { color: '#9D2525', fontSize: 14, padding: 12 } });

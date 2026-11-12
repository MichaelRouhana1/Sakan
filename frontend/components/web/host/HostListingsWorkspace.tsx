import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Studently } from '@/constants/theme';
import type { Listing } from '@/types/listing';
import { useCredits } from '@/features/credits/useCredits';
import { useArchiveListing } from '@/features/listings/useArchiveListing';
import { useDeleteListing } from '@/features/listings/useDeleteListing';
import { fetchInventory, inventoryKey, setPlaceVisibility, type UnitInventory } from '@/features/listings/hostInventory';
import { openNewCreateListing } from '@/features/auth/useEnsureSession';
import { hostListingAnalyticsPath, posterListingAnalyticsPath } from '@/constants/hostRoutes';
import { HostInventoryControl } from '@/components/listings/HostInventoryControl';
import { PlaceEditor } from '@/components/listings/edit/PlaceEditor';
import { HostNotificationPreferences } from './HostNotificationPreferences';
import { RenewUnitConfirmation, useListingClock } from './UnitRenewalControls';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import { api } from '@/lib/api';
import { appleTabScrollInset } from '@/components/ui/Glass';
import { expiryTime } from './hostListingStatus';
import { listingFilters, placeName, portfolioCounts, unitTitle, unitTypeName, unitCampusName, workspaceFacts, workspaceGroups, type ListingsFilter, type WorkspaceAction } from './listingsWorkspaceModel';

export type WorkspaceDraft = { key: string; title: string; subtitle: string; onPress: () => void };
type Props = { listings: Listing[]; drafts: WorkspaceDraft[]; loading: boolean; failed: boolean; refreshing: boolean; signedIn: boolean; createDisabled: boolean; onRefresh: () => void; onEdit: (unit: Listing) => void };
type Anchor = { x: number; y: number };
type Sheet = { kind: 'menu' | 'place'; unit: Listing; anchor?: Anchor } |
  { kind: 'renew' | 'availability' | 'auto' | 'shared' | 'archive' | 'remove'; unit: Listing } |
  { kind: 'reminders' | 'add' } | null;
const date = (value: string | number | null | undefined, full = false) => value == null ? 'Date unavailable' : new Date(value).toLocaleString(undefined, {
  month: 'short', day: 'numeric', ...(full ? { year: 'numeric', hour: 'numeric', minute: '2-digit' } as const : {}),
});
const message = (error: unknown) => (error as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ?? 'Could not save. Please try again.';
const primaryLabels: Record<WorkspaceAction, string> = { renew: 'Renew', edit: 'Edit', analytics: 'View analytics', availability: 'Update availability' };

export function HostListingsWorkspace({ listings, drafts, loading, failed, refreshing, signedIn, createDisabled, onRefresh, onEdit }: Props) {
  const router = useRouter();
  const focused = useIsFocused();
  const params = useLocalSearchParams<{ filter?: string; q?: string; sort?: string }>();
  const [filter, setFilter] = useState<ListingsFilter>(() => listingFilters.find(value => value === params.filter) ?? 'All');
  const [search, setSearch] = useState(() => typeof params.q === 'string' ? params.q : '');
  const [sort, setSort] = useState<'urgency' | 'name'>(params.sort === 'name' ? 'name' : 'urgency');
  const [width, setWidth] = useState(0);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showDrafts, setShowDrafts] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const client = useQueryClient();
  const credits = useCredits(signedIn);
  const archive = useArchiveListing();
  const remove = useDeleteListing();
  const now = useListingClock();
  const units = useMemo(() => listings.filter(unit => unit.status !== 'draft'), [listings]);
  const counts = useMemo(() => portfolioCounts(units, now), [units, now]);
  const groups = useMemo(() => workspaceGroups(units, filter, search, sort, now), [units, filter, search, sort, now]);
  const wide = Platform.OS === 'web' && width >= 1080 && units.length !== 1;
  const narrow = width < 600;
  const known = !loading && (!failed || units.length > 0);
  const blockedCredits = units.some(unit => unit.autoRenewState?.enabled && unit.autoRenewState.blocked === 'credits');
  const shortage = units.length > 0 && (blockedCredits || credits.data?.postCredits === 0);
  const close = () => { setSheet(null); setError(''); };
  const open = (next: Sheet) => { setError(''); setSheet(next); };
  const refetch = () => { onRefresh(); void credits.refetch(); };
  const auto = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => (await api.patch<{data: NonNullable<Listing['autoRenewState']>}>(`/api/listings/${id}/auto-renew`, { enabled })).data.data,
    onSuccess: (state, input) => {
      client.setQueryData<Listing[]>(['listings', 'mine'], current => current?.map(unit => unit.id === input.id ? { ...unit, autoRenew: state.enabled, autoRenewState: state } : unit));
      void client.invalidateQueries({ queryKey: ['listings', 'mine'] });
      void client.invalidateQueries({ queryKey: ['unit-auto-renew'] });
      setNotice(`Auto-renew ${state.enabled ? 'on' : 'off'}.`);
    },
    onError: error => setNotice(message(error)),
  });

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !focused) return;
    // Do not rewrite the route on mount or on ordinary data/clock refreshes.
    // Besides unnecessary navigation, that can race auth and an initial reload.
    const saved = new URL(window.location.href).searchParams;
    if ((saved.get('filter') || 'All') === filter && (saved.get('q') || '') === search && (saved.get('sort') || 'urgency') === sort) return;
    const timer = setTimeout(() => router.setParams({ filter, q: search || '', sort }), 250);
    return () => clearTimeout(timer);
  }, [filter, search, sort, router, focused]);

  function analytics(unit: Listing) {
    close(); router.push((Platform.OS === 'web' ? hostListingAnalyticsPath(unit.id) : posterListingAnalyticsPath(unit.id)) as never);
  }
  function action(unit: Listing, kind: WorkspaceAction) {
    if (kind === 'edit') { close(); onEdit(unit); }
    else if (kind === 'analytics') analytics(unit);
    else open({ kind, unit });
  }
  function addUnit(unit?: Listing) {
    close();
    if (unit?.placeId) router.push({ pathname: '/(poster)/create', params: { new: '1', placeId: unit.placeId } } as never);
    else openNewCreateListing(router);
  }
  async function destroy(unit: Listing, kind: 'archive' | 'remove') {
    setError('');
    try {
      if (kind === 'archive') await archive.mutateAsync(unit.id); else await remove.mutateAsync(unit.id);
      setNotice(`${unitTitle(unit)} ${kind === 'archive' ? 'archived' : 'removed'}.`); close();
    } catch (e) { setError(message(e)); }
  }

  const draftStrip = drafts.length > 0 ? <View style={s.drafts}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: showDrafts }} onPress={() => setShowDrafts(!showDrafts)} style={s.draftHeading}>
      <Ionicons name="document-text-outline" size={17} color={Studently.color.inkMuted} />
      <Text style={s.smallBold}>In progress · {drafts.length} {drafts.length === 1 ? 'draft' : 'drafts'}</Text>
      <Text style={s.textLink}>{showDrafts ? 'Hide' : 'Show'}</Text>
    </Pressable>
    {showDrafts ? drafts.map(draft => <View key={draft.key} style={s.draftRow}><View style={s.flex}><Text style={s.smallBold}>{draft.title}</Text><Text style={s.muted}>{draft.subtitle}</Text></View><Button label="Continue" onPress={draft.onPress} /></View>) : null}
  </View> : null;

  return <View style={s.root} onLayout={event => setWidth(event.nativeEvent.layout.width)} testID="listings-workspace">
    <ScrollView keyboardShouldPersistTaps="handled" stickyHeaderIndices={[1]} refreshControl={<RefreshControl refreshing={refreshing && !loading} onRefresh={refetch} tintColor={Studently.color.primary} />} contentContainerStyle={s.scroll}>
      <View style={[s.summary, narrow && s.summaryNarrow]}>
        <View style={s.headingRow}><View style={s.flex}>{!narrow ? <Text style={s.eyebrow}>HOST WORKSPACE</Text> : null}<Text style={s.title}>Your listings</Text></View><Button label="Add listing" icon="add" primary onPress={() => open({ kind: 'add' })} disabled={createDisabled} /></View>
        <View style={s.summaryBottom}>
          <View style={s.metrics}>
            <Metric value={known ? counts.Live : null} label="Live" onPress={() => setFilter('Live')} />
            <Metric value={known ? counts.expiring : null} label="Expiring" tone="warning" onPress={() => setFilter('Needs attention')} />
            <Metric value={known ? counts.Expired : null} label="Expired" tone="danger" onPress={() => setFilter('Expired')} />
          </View>
          <View style={[s.wallet,narrow&&{gap:8}]}><View style={s.walletLabel}><Ionicons name="wallet-outline" size={17} color={Studently.color.inkMuted} /><Text style={s.smallBold}>{credits.data ? `${credits.data.postCredits} post credits` : credits.isError ? 'Balance unavailable' : 'Checking credits…'}</Text></View><Pressable accessibilityRole="button" onPress={() => router.push('/hosting/credits' as never)} style={s.touch}><Text style={s.textLink}>Buy credits</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Reminder settings" onPress={() => open({ kind: 'reminders' })} style={s.touch}><Text style={s.captionLink}>Reminders</Text></Pressable></View>
        </View>
        {!narrow ? <View style={s.summaryFoot}><Text style={s.caption}>{known ? `${units.length} ${units.length === 1 ? 'unit' : 'units'} · ${new Set(units.map(unit => unit.placeId ?? unit.id)).size} ${new Set(units.map(unit => unit.placeId ?? unit.id)).size === 1 ? 'place' : 'places'}` : 'Your places and units'} · Expiring is included in Live</Text></View> : null}
      </View>

      <View style={s.toolbar}>
        <View style={s.filters}>{listingFilters.map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Filter ${value}`} accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={[s.filter, filter === value && s.filterSelected]}><Text style={[s.filterLabel, filter === value && s.filterLabelSelected]}>{value}</Text><Text style={[s.count, filter === value && s.filterLabelSelected]}>{known ? counts[value] : '—'}</Text></Pressable>)}</View>
        <View style={s.searchRow}><View style={s.search}><Ionicons name="search-outline" size={18} color={Studently.color.inkMuted} /><TextInput accessibilityLabel="Search units, places or areas" placeholder="Search units or places" placeholderTextColor="#6B7280" value={search} onChangeText={setSearch} style={s.searchInput} />{search ? <IconButton label="Clear search" icon="close" onPress={() => setSearch('')} /> : null}</View><Button label={sort === 'urgency' ? 'Urgency' : 'Name'} icon="swap-vertical-outline" onPress={() => setSort(sort === 'urgency' ? 'name' : 'urgency')} /></View>
      </View>

      <View style={[s.body, narrow && s.bodyNarrow]}>
        {createDisabled ? <Notice text="You have two listings in progress. Finish or remove a draft before adding another." /> : null}
        {shortage ? <Notice warning text={blockedCredits ? 'Auto-renew needs more post credits.' : 'No post credits. Each unit renewal needs 1 credit.'} action="Buy credits" onPress={() => router.push('/hosting/credits' as never)} /> : null}
        {failed ? <Notice text={units.length ? 'Couldn’t refresh. Showing your last saved listings.' : 'Couldn’t load your listings.'} action="Retry" onPress={refetch} /> : refreshing && !loading ? <Text style={s.caption}>Refreshing…</Text> : null}
        {draftStrip}
        {loading && units.length === 0 ? <WorkspaceSkeleton wide={wide} /> : units.length === 0 && !failed ? <Empty title={drafts.length ? 'Finish your first listing' : 'Add your first listing'} detail={drafts.length ? 'Your saved drafts are above. Continue one when you’re ready.' : 'Start with a place, then add a whole apartment, private room or shared beds.'} action={drafts.length ? 'Continue draft' : 'Add listing'} onPress={() => drafts.length ? drafts[0].onPress() : open({ kind: 'add' })} /> : !groups.length && !failed ? <Empty title={filter === 'Needs attention' && !search ? 'Nothing needs attention right now.' : 'No units match these filters.'} detail={filter === 'Needs attention' && !search ? 'Your listing times and auto-renew settings are looking good.' : 'Try another unit, place name or area.'} action={filter === 'Needs attention' && !search ? 'Show all' : 'Clear search and filters'} onPress={() => { setFilter('All'); setSearch(''); }} /> : null}
        {groups.length ? <View style={[s.list, units.length === 1 && s.singleList]} testID="unit-list">
          {wide ? <View style={s.columnHeader}><Text style={[s.columnLabel,s.unitColumn]}>UNIT</Text><Text style={[s.columnLabel,s.timeColumn]}>LISTING TIME</Text><Text style={[s.columnLabel,s.availabilityColumn]}>AVAILABILITY</Text><Text style={[s.columnLabel,s.autoColumn]}>AUTO-RENEW</Text><Text style={[s.columnLabel,s.actionColumn]}>ACTION</Text></View> : null}
          {groups.map(group => {
            const folded = collapsed.has(group.id) && filter === 'All' && !search;
            return <View key={group.id} testID={`place-${group.id}`} style={s.group}>
              {group.total > 1 ? <View style={s.groupHeading}>
                <Pressable accessibilityRole="button" accessibilityLabel={`${folded ? 'Expand' : 'Collapse'} ${group.name}`} accessibilityState={{expanded:!folded}} onPress={() => setCollapsed(previous => { const next=new Set(previous); if(next.has(group.id))next.delete(group.id);else next.add(group.id);return next; })} style={s.groupTitleButton}>
                  <Ionicons name={folded?'chevron-forward':'chevron-down'} size={16} color={Studently.color.inkMuted} /><View style={s.flex}><Text style={s.groupTitle}>{group.name}<Text style={s.muted}> · {group.unit.area}</Text></Text><Text style={s.caption}>{group.units.length === group.total ? `${group.total} units` : `${group.units.length} of ${group.total} units`}{group.attention ? ` · ${group.attention} need attention` : ''}</Text></View>
                </Pressable>
                {!narrow ? <Button label="Add unit" icon="add" disabled={createDisabled} onPress={() => addUnit(group.unit)} /> : null}
                <MenuTrigger label={`Place options for ${group.name}`} onPress={anchor => open({kind:'place',unit:group.unit,anchor})} />
              </View> : null}
              {!folded ? group.units.map(unit => <UnitRow key={unit.id} unit={unit} now={now} wide={wide} singlePlace={group.total===1} onAction={kind=>action(unit,kind)} onMenu={anchor=>open({kind:'menu',unit,anchor})} onPlace={anchor=>open({kind:'place',unit,anchor})} onAutoDetails={()=>open({kind:'auto',unit})} onToggle={enabled=>auto.mutate({id:unit.id,enabled})} autoBusy={auto.isPending} onAnalytics={()=>analytics(unit)} />) : null}
            </View>;
          })}
        </View> : null}
      </View>
    </ScrollView>

    {notice ? <View accessibilityLiveRegion="polite" style={s.toast} testID="listings-toast"><Text style={[s.small,s.flex]}>{notice}</Text><IconButton label="Dismiss message" icon="close" onPress={() => setNotice('')} /></View> : null}
    <WorkspaceSheet sheet={sheet} onClose={close}>
      {sheet?.kind === 'menu' ? <>
        <Text style={s.sheetTitle}>{unitTitle(sheet.unit)}</Text>
        <MenuItem label="Update availability" icon="bed-outline" onPress={()=>open({kind:'availability',unit:sheet.unit})} />
        <MenuItem label="Renew" icon="refresh-outline" disabled={!workspaceFacts(sheet.unit,now).canRenew} onPress={()=>open({kind:'renew',unit:sheet.unit})} />
        <MenuItem label="Analytics" icon="stats-chart-outline" onPress={()=>analytics(sheet.unit)} />
        <MenuItem label="Edit" icon="create-outline" disabled={!workspaceFacts(sheet.unit,now).canEdit} onPress={()=>action(sheet.unit,'edit')} />
        <MenuItem label="Promote" icon="trending-up-outline" disabled={sheet.unit.status==='removed'} onPress={()=>{close();router.push(`/hosting/listing/${sheet.unit.id}/promote` as never);}} />
        <MenuItem label="Was it rented?" icon="checkmark-circle-outline" disabled={sheet.unit.status==='removed'} onPress={()=>{close();router.push(`/hosting/listing/${sheet.unit.id}/outcome` as never);}} />
        <View style={s.separator} />
        <MenuItem label="Archive" icon="archive-outline" danger disabled={sheet.unit.status!=='active'} onPress={()=>open({kind:'archive',unit:sheet.unit})} />
        <MenuItem label="Remove" icon="trash-outline" danger disabled={sheet.unit.status!=='active'} onPress={()=>open({kind:'remove',unit:sheet.unit})} />
      </> : sheet?.kind === 'place' ? <PlaceMenu unit={sheet.unit} createDisabled={createDisabled} onAdd={()=>addUnit(sheet.unit)} onShared={()=>open({kind:'shared',unit:sheet.unit})} onSaved={()=>{void client.invalidateQueries({queryKey:['listings']});void client.invalidateQueries({queryKey:['host-inventory']});void client.invalidateQueries({queryKey:['promotions']});close();}} /> :
      sheet?.kind === 'renew' ? <RenewUnitConfirmation listingId={sheet.unit.id} onClose={close} /> :
      sheet?.kind === 'availability' ? <><Text style={s.sheetTitle}>Update availability</Text><Text style={s.muted}>{unitTitle(sheet.unit)}</Text><HostInventoryControl listingId={sheet.unit.id} /></> :
      sheet?.kind === 'shared' ? <PlaceEditor listing={sheet.unit} onClose={close} /> :
      sheet?.kind === 'reminders' ? <HostNotificationPreferences compact /> :
      sheet?.kind === 'auto' ? <><Text style={s.sheetTitle}>Auto-renew</Text><Text style={s.paragraph}>Renews for 30 days with 1 post credit in the final hour before it expires. Uses credits already in your wallet. Each unit renews separately.</Text><Text style={s.paragraph}>{unitTitle(sheet.unit)}</Text><AutoRenewSummary unit={listings.find(unit=>unit.id===sheet.unit.id)??sheet.unit} now={now} onPress={()=>{}} onToggle={enabled=>auto.mutate({id:sheet.unit.id,enabled})} busy={auto.isPending} details />{sheet.unit.expiresAt ? <Text style={s.paragraph}>Renewal window: {date((expiryTime(sheet.unit.expiresAt)??0)-3600000,true)} – {date(sheet.unit.expiresAt,true)}.</Text> : null}<Text style={s.muted}>Without enough credits or a confirmed available-bed count, the unit expires normally. Renewing after expiry requires your confirmation.</Text><Button label="Refresh eligibility" onPress={refetch} /></> :
      sheet?.kind === 'add' ? <><Text style={s.sheetTitle}>Add a listing</Text><Text style={s.muted}>Start a new place, or add a unit to one you own.</Text><Button label="New place" icon="home-outline" primary disabled={createDisabled} onPress={()=>addUnit()} /><View style={s.separator} /><Text style={s.smallBold}>UNIT IN AN EXISTING PLACE</Text>{[...new Map(units.filter(unit=>unit.placeId).map(unit=>[unit.placeId,unit])).values()].map(unit=><MenuItem key={unit.placeId} label={`${placeName(unit)} · ${unit.area}`} icon="add" disabled={createDisabled} onPress={()=>addUnit(unit)} />)}{!units.length?<Text style={s.muted}>No saved places yet.</Text>:null}</> :
      sheet?.kind === 'archive' || sheet?.kind === 'remove' ? <><Text style={s.sheetTitle}>{sheet.kind==='archive'?'Archive':'Remove'} this unit?</Text><Text style={s.paragraph}>{unitTitle(sheet.unit)}</Text><Text style={s.muted}>{sheet.kind==='archive'?'Takes this unit off search and turns auto-renew off. Occupancy stays saved.':'Permanently removes this listing. Confirm vacancy first; occupied units must be archived instead.'}</Text>{error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}<Button label={archive.isPending||remove.isPending?'Saving…':sheet.kind==='archive'?'Confirm archive':'Confirm remove'} primary disabled={archive.isPending||remove.isPending} onPress={()=>void destroy(sheet.unit,sheet.kind==='archive'?'archive':'remove')} /></> : null}
    </WorkspaceSheet>
  </View>;
}

function UnitRow({unit,now,wide,singlePlace,onAction,onMenu,onPlace,onAutoDetails,onToggle,autoBusy,onAnalytics}:{unit:Listing;now:number;wide:boolean;singlePlace:boolean;onAction:(kind:WorkspaceAction)=>void;onMenu:(anchor:Anchor)=>void;onPlace:(anchor:Anchor)=>void;onAutoDetails:()=>void;onToggle:(value:boolean)=>void;autoBusy:boolean;onAnalytics:()=>void}) {
  const f=workspaceFacts(unit,now);
  const photo=resolveMediaUrl(unit.coverUrl??unit.photos?.[0]?.url??null);
  const {width:viewportWidth}=useWindowDimensions();
  const thumbnailSize=viewportWidth>=1024?72:viewportWidth>=768?64:56;
  const thumbnailStyle={width:thumbnailSize,height:thumbnailSize};
  const title=<Text style={s.unitTitle} numberOfLines={viewportWidth>=1440?undefined:2}>{unitTitle(unit)}</Text>;
  const status=<View style={[s.status,f.expiring&&s.statusWarning,f.expired&&s.statusExpired]}><View style={[s.statusDot,{backgroundColor:f.expired?'#B42318':f.expiring?'#B45309':f.live?'#25814C':'#6B7280'}]} /><Text style={[s.statusText,f.expiring&&s.warningText,f.expired&&{color:'#B42318'}]}>{f.status.label}</Text></View>;
  const identity=<View style={s.identity}>
    {photo?<Image source={{uri:photo}} testID="listing-thumbnail" style={[s.thumbnail,thumbnailStyle]} contentFit="cover" />:<View style={[s.thumbnailFallback,thumbnailStyle]} testID="listing-thumbnail"><Ionicons name="home-outline" size={24} color="#8A847C" /></View>}
    <View style={s.identityCopy}>{singlePlace?<Pressable accessibilityRole="button" accessibilityLabel={`Place options for ${placeName(unit)}`} onPress={()=>onPlace({x:0,y:0})}>{title}</Pressable>:title}<Text style={s.typePrice}>{unitTypeName(unit)} · ${unit.monthlyRentUsd.toLocaleString()}/{unit.priceBasis==='per_bed_month'?'bed/mo':'mo'}{unitCampusName(unit)?` · ${unitCampusName(unit)}`:''}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Analytics for ${unitTitle(unit)}`} onPress={onAnalytics} style={s.performance}><Text style={s.caption}>{unit.viewCount??0} views · {unit.contactTapCount??0} taps</Text></Pressable>

    </View>
  </View>;
  const availability=<View><Text style={[s.small,f.needsBeds&&s.warningText]}>{f.availability}</Text>{f.hidden?<Text style={s.caption}>{unit.hidden?'Hidden by you':unit.hiddenReason?.replaceAll('_',' ')||'Hidden from search'}</Text>:null}</View>;
  return <View style={[s.unitRow,!wide&&s.compactRow]} testID={`unit-${unit.id}`}>
    {wide?<>
      <View style={s.unitColumn}>{identity}</View>
      <View style={s.timeColumn}>{status}{f.expired?<Text style={s.caption}>{date(unit.expiresAt)}</Text>:null}</View>
      <View style={s.availabilityColumn}>{availability}</View>
      <View style={s.autoColumn}><AutoRenewSummary unit={unit} now={now} onPress={onAutoDetails} onToggle={onToggle} busy={autoBusy}/></View>
      <View style={[s.actionColumn,s.rowActions]}><Button label={primaryLabels[f.primary]} accessibilityLabel={`${primaryLabels[f.primary]} ${unitTitle(unit)}`} primary={f.primary==='renew'} onPress={()=>onAction(f.primary)} /><MenuTrigger label={`Actions for ${unitTitle(unit)}`} onPress={onMenu}/></View>
    </>:<>
      <View style={s.compactTop}>{identity}<MenuTrigger label={`Actions for ${unitTitle(unit)}`} onPress={onMenu}/></View>
      <View style={s.compactStatus}>{status}{availability}</View>
      <View style={s.compactBottom}><View style={s.flex}><AutoRenewSummary unit={unit} now={now} onPress={onAutoDetails} onToggle={onToggle} busy={autoBusy}/></View><Button label={primaryLabels[f.primary]} accessibilityLabel={`${primaryLabels[f.primary]} ${unitTitle(unit)}`} primary={f.primary==='renew'} onPress={()=>onAction(f.primary)}/></View>
    </>}
  </View>;
}

function AutoRenewSummary({unit,now,onPress,onToggle,busy,details=false}:{unit:Listing;now:number;onPress:()=>void;onToggle:(enabled:boolean)=>void;busy:boolean;details?:boolean}) {
  const f=workspaceFacts(unit,now);
  const ready=unit.autoRenewState!=null;
  const disabled=unit.status==='removed'||f.rented||(!f.enabled&&(f.expired||unit.status!=='active'));
  const reason=f.blocked==='credits'?'Blocked: add credits':f.blocked==='beds'?'Blocked: confirm beds':f.blocked==='account'?'Blocked: account restricted':f.blocked?'Blocked: check availability':null;
  const copy=f.expired?(f.enabled?'Expired · renew manually':'Renew first to enable'):disabled?(f.rented?'Unavailable while rented':'Unavailable'):!ready?'Eligibility unavailable':f.enabled?(reason??`Next renewal by ${date(unit.expiresAt)}`):'';
  return <View style={s.autoWrap}><View style={s.autoLine}><Pressable accessibilityRole="button" accessibilityLabel={`Auto-renew details for ${unitTitle(unit)}`} onPress={onPress} disabled={details} style={s.autoLabelTouch}><Text style={s.autoLabel}>Auto-renew</Text></Pressable><Switch accessibilityLabel={`Auto-renew for ${unitTitle(unit)}`} value={f.enabled} disabled={disabled||!ready||busy} onValueChange={onToggle} trackColor={{false:'#9AA0A8',true:'#EA3F4A'}} thumbColor='#FFFFFF' {...(Platform.OS==='web'?{activeThumbColor:'#FFFFFF'}:{})} /></View>{copy?<Text style={[s.caption,reason&&s.warningText]}>{copy}</Text>:null}{f.enabled&&reason&&unit.expiresAt?<Text style={s.caption}>Due {date(unit.expiresAt)}</Text>:null}</View>;
}

function Metric({value,label,tone,onPress}:{value:number|null;label:string;tone?:'warning'|'danger';onPress:()=>void}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value??'loading'}`} onPress={onPress} style={s.metric}><Text style={[s.metricValue,tone==='warning'&&{color:'#92400E'},tone==='danger'&&{color:'#B42318'}]}>{value??'—'}</Text><Text style={s.metricLabel}>{label}</Text></Pressable>;
}
function Notice({text,warning=false,action,onPress}:{text:string;warning?:boolean;action?:string;onPress?:()=>void}) { return <View style={[s.notice,warning&&s.noticeWarning]}><Ionicons name={warning?'alert-circle-outline':'information-circle-outline'} size={18} color={warning?'#92400E':'#5E5A55'}/><Text style={[s.small,s.flex,warning&&s.warningText]}>{text}</Text>{action&&onPress?<Button label={action} onPress={onPress}/>:null}</View>; }
function Empty({title,detail,action,onPress}:{title:string;detail:string;action:string;onPress:()=>void}) { return <View style={s.empty} testID="listings-empty"><View style={s.emptyIcon}><Ionicons name="home-outline" size={28} color="#C0343D"/></View><Text style={s.emptyTitle}>{title}</Text><Text style={s.emptyDetail}>{detail}</Text><Button label={action} primary onPress={onPress}/></View>; }
function WorkspaceSkeleton({wide}:{wide:boolean}) { const {width}=useWindowDimensions(); const size=width>=1024?72:width>=768?64:56; return <View testID="listings-loading" accessibilityLabel="Loading listings">{[0,1,2,3].map(i=><View key={i} style={[s.unitRow,!wide&&s.compactRow,{minHeight:wide?96:180,gap:14}]}><View style={[s.thumbnailFallback,{width:size,height:size}]}/><View style={{flex:1,gap:10}}><View style={{height:15,width:'60%',backgroundColor:'#E8EAED',borderRadius:4}}/><View style={{height:10,width:'40%',backgroundColor:'#E8EAED',borderRadius:4}}/><View style={{height:10,width:'50%',backgroundColor:'#E8EAED',borderRadius:4}}/></View></View>)}</View>; }

function Button({label,onPress,primary=false,disabled=false,icon,accessibilityLabel}:{label:string;onPress:()=>void;primary?:boolean;disabled?:boolean;icon?:keyof typeof Ionicons.glyphMap;accessibilityLabel?:string}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel??label} disabled={disabled} accessibilityState={{disabled}} onPress={onPress} style={({pressed})=>[s.button,primary&&s.primaryButton,pressed&&{opacity:.8},disabled&&{opacity:.45}]}>{icon?<Ionicons name={icon} size={16} color={primary?'#FFFFFF':'#52525B'}/>:null}<Text style={[s.buttonText,primary&&s.primaryButtonText]}>{label}</Text></Pressable>;
}
function IconButton({label,icon,onPress}:{label:string;icon:keyof typeof Ionicons.glyphMap;onPress:()=>void}) { return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.iconButton}><Ionicons name={icon} size={20} color="#5E5A55"/></Pressable>; }
function MenuTrigger({label,onPress}:{label:string;onPress:(anchor:Anchor)=>void}) {
  const ref=useRef<View>(null);
  return <Pressable ref={ref} accessibilityRole="button" accessibilityLabel={label} onPress={()=>ref.current?.measureInWindow((x,y,w,h)=>onPress({x:x+w,y:y+h}))} style={s.iconButton}><Ionicons name="ellipsis-horizontal" size={20} color="#5E5A55"/></Pressable>;
}
function MenuItem({label,icon,onPress,disabled=false,danger=false}:{label:string;icon:keyof typeof Ionicons.glyphMap;onPress:()=>void;disabled?:boolean;danger?:boolean}) { return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} accessibilityState={{disabled}} onPress={onPress} style={({pressed})=>[s.menuItem,pressed&&{backgroundColor:'#F3F4F6'},disabled&&{opacity:.4}]}><Ionicons name={icon} size={18} color={danger?'#B42318':'#5E5A55'}/><Text style={[s.menuText,danger&&s.error]}>{label}</Text></Pressable>; }

function PlaceMenu({unit,onAdd,onShared,onSaved,createDisabled}:{unit:Listing;onAdd:()=>void;onShared:()=>void;onSaved:()=>void;createDisabled:boolean}) {
  const query=useQuery({queryKey:inventoryKey(unit.id),queryFn:()=>fetchInventory(unit.id)});
  const [confirm,setConfirm]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function visibility() {if(!query.data)return;setBusy(true);setError('');try{await setPlaceVisibility(query.data.placeId,!query.data.placeHidden);onSaved();}catch(e){setError(message(e));}finally{setBusy(false);}}
  return <><Text style={s.sheetTitle}>{placeName(unit)}</Text><Text style={s.muted}>{unit.area} · Shared place details</Text><MenuItem label="Add unit" icon="add" disabled={createDisabled} onPress={onAdd}/><MenuItem label="Edit shared details" icon="create-outline" onPress={onShared}/>{query.data?<MenuItem label={query.data.placeHidden?'Show place':'Hide place'} icon={query.data.placeHidden?'eye-outline':'eye-off-outline'} onPress={()=>setConfirm(true)}/>:<Text style={s.muted}>{query.isError?'Couldn’t check place visibility.':'Checking place visibility…'}</Text>}{query.isError?<Button label="Retry visibility" onPress={()=>void query.refetch()}/>:null}{confirm?<><Text style={s.paragraph}>This changes visibility for all units in this place. Bed counts and listing dates stay the same.</Text><Button label={busy?'Saving…':query.data?.placeHidden?'Confirm show place':'Confirm hide place'} onPress={()=>void visibility()} disabled={busy}/></>:null}{error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}</>;
}

function WorkspaceSheet({sheet,onClose,children}:{sheet:Sheet;onClose:()=>void;children:ReactNode}) {
  const {width,height}=useWindowDimensions();
  const menu=sheet?.kind==='menu'||sheet?.kind==='place';
  const desktop=Platform.OS==='web'&&width>=768;
  const anchor=sheet&&'anchor'in sheet?sheet.anchor:null;
  const closeRef=useRef(onClose);closeRef.current=onClose;
  useEffect(()=>{
    if(!sheet||Platform.OS!=='web')return;
    const previous=document.activeElement as HTMLElement|null;
    const focusables=()=>Array.from(document.querySelector('[data-testid="workspace-dialog"]')?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex="0"],[role="button"]:not([aria-disabled="true"]),[role="switch"]:not([aria-disabled="true"])')??[]).filter(el=>el.getClientRects().length>0);
    const timer=setTimeout(()=>focusables()[0]?.focus(),40);
    const key=(event:KeyboardEvent)=>{const dialogs=Array.from(document.querySelectorAll('[role="dialog"]'));if(dialogs.at(-1)?.getAttribute('data-testid')!=='workspace-dialog')return;if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeRef.current();}if(event.key==='Tab'){const list=focusables();if(!list.length)return;const first=list[0],last=list[list.length-1];if(event.shiftKey&&(document.activeElement===first||!list.includes(document.activeElement as HTMLElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||!list.includes(document.activeElement as HTMLElement))){event.preventDefault();first.focus();}}};
    document.addEventListener('keydown',key);
    return()=>{clearTimeout(timer);document.removeEventListener('keydown',key);previous?.focus();};
  },[sheet?.kind]);
  const positioned=menu&&desktop&&anchor&&anchor.x>0;
  return <Modal visible={sheet!=null} transparent animationType="fade" onRequestClose={onClose}>
    <View style={[s.scrim,!desktop&&s.mobileScrim,menu&&desktop&&{backgroundColor:'rgba(26,26,26,0.08)'}]}>
      <Pressable accessibilityLabel="Dismiss dialog" accessible={false} onPress={onClose} style={StyleSheet.absoluteFill}/>
      <View role="dialog" accessibilityLabel={sheet?.kind==='menu'?'Unit actions':sheet?.kind==='place'?'Place actions':'Listing action'} accessibilityViewIsModal testID="workspace-dialog" style={[s.sheet,!desktop&&s.mobileSheet,menu&&desktop&&{maxWidth:300},positioned?{position:'absolute',left:Math.max(12,Math.min(anchor!.x-300,width-312)),top:Math.max(12,Math.min(anchor!.y+4,height-570)),maxHeight:Math.min(560,height-24)}:null,sheet?.kind==='renew'&&{maxWidth:440}]}>
        <View style={s.sheetClose}><IconButton label="Close dialog" icon="close" onPress={onClose}/></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={sheet?.kind==='renew'?undefined:s.sheetContent}>{children}</ScrollView>
      </View>
    </View>
  </Modal>;
}

const s=StyleSheet.create({
  root:{flex:1,minHeight:0,width:'100%'},scroll:{paddingBottom:Platform.OS==='web'?40:appleTabScrollInset+24},flex:{flex:1,minWidth:0},
  summary:{paddingHorizontal:28,paddingTop:24,paddingBottom:8,gap:12},summaryNarrow:{paddingHorizontal:16,paddingTop:16,gap:10},headingRow:{flexDirection:'row',alignItems:'center',gap:12},
  eyebrow:{fontFamily:Studently.type.bodySemi,fontSize:13,letterSpacing:1.6,color:'#6B6460',marginBottom:5},title:{fontFamily:Studently.type.bodyBold,fontSize:28,lineHeight:34,color:'#1A1A1A',letterSpacing:-.7},
  summaryBottom:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12},metrics:{flexDirection:'row',gap:28},metric:{minHeight:48,justifyContent:'center',gap:1},metricValue:{fontFamily:Studently.type.bodyBold,fontSize:28,lineHeight:34,color:'#1A1A1A'},metricLabel:{fontFamily:Studently.type.body,fontSize:13,color:'#5E5A55'},
  wallet:{flexDirection:'row',alignItems:'center',gap:14},walletLabel:{flexDirection:'row',alignItems:'center',gap:7},summaryFoot:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:4},
  touch:{minHeight:44,justifyContent:'center'},small:{fontFamily:Studently.type.body,fontSize:14,lineHeight:20,color:'#37332F'},smallBold:{fontFamily:Studently.type.bodySemi,fontSize:14,lineHeight:20,color:'#242321'},typePrice:{fontFamily:Studently.type.body,fontSize:14,lineHeight:20,color:'#625E59'},muted:{fontFamily:Studently.type.body,fontSize:13,lineHeight:19,color:'#625E59'},caption:{fontFamily:Studently.type.body,fontSize:13,lineHeight:18,color:'#6B6460'},textLink:{fontFamily:Studently.type.bodySemi,fontSize:13,color:'#AD2D37'},captionLink:{fontFamily:Studently.type.bodyMedium,fontSize:13,lineHeight:18,color:'#6B6460',textDecorationLine:'underline'},
  toolbar:{backgroundColor:'#F9FAFB',paddingHorizontal:16,paddingTop:8,paddingBottom:12,gap:10,borderBottomWidth:1,borderBottomColor:'#E4E5E7',zIndex:2},filters:{flexDirection:'row',flexWrap:'wrap',gap:4},filter:{flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:12,minHeight:44,borderRadius:8},filterSelected:{backgroundColor:'#FDECEE'},filterLabel:{fontFamily:Studently.type.bodyMedium,fontSize:14,color:'#5E5A55'},filterLabelSelected:{color:'#A82D36',fontFamily:Studently.type.bodySemi},count:{fontFamily:Studently.type.body,fontSize:13,color:'#6B6460'},searchRow:{flexDirection:'row',alignItems:'center',gap:10},search:{flex:1,flexDirection:'row',alignItems:'center',paddingLeft:12,minHeight:44,borderWidth:1,borderColor:'#D9DDE3',borderRadius:8,backgroundColor:'#FFFFFF',gap:8},searchInput:{flex:1,minWidth:0,minHeight:44,paddingVertical:9,paddingRight:8,fontFamily:Studently.type.body,fontSize:15,color:'#1A1A1A'},
  body:{paddingHorizontal:16,paddingTop:16,gap:14},bodyNarrow:{paddingHorizontal:12},notice:{padding:12,borderWidth:1,borderColor:'#D9DDE3',borderRadius:10,backgroundColor:'#FFFFFF',flexDirection:'row',alignItems:'center',gap:9,flexWrap:'wrap'},noticeWarning:{backgroundColor:'#FFFBEB',borderColor:'#F0D59D'},warningText:{color:'#92400E'},error:{color:'#B42318',fontFamily:Studently.type.body,fontSize:13,lineHeight:19},toast:{position:'absolute',bottom:24,left:16,right:16,maxWidth:460,alignSelf:'center',zIndex:100,flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#D9DDE3',paddingLeft:16,borderRadius:12,boxShadow:'0 4px 20px rgba(26,26,26,0.16)'},
  list:{borderWidth:1,borderColor:'#DFE2E6',borderRadius:12,overflow:'hidden',backgroundColor:'#FFFFFF'},singleList:{maxWidth:720,width:'100%'},columnHeader:{flexDirection:'row',gap:12,paddingHorizontal:16,paddingVertical:12,backgroundColor:'#FAFAFA',borderBottomWidth:1,borderColor:'#E4E5E7'},columnLabel:{fontFamily:Studently.type.bodySemi,fontSize:12,letterSpacing:.7,color:'#6B6460'},unitColumn:{flex:1,minWidth:220},timeColumn:{width:162,justifyContent:'center',gap:4},availabilityColumn:{width:110,justifyContent:'center'},autoColumn:{width:175,justifyContent:'center'},actionColumn:{width:210},
  group:{borderBottomWidth:1,borderColor:'#E4E5E7'},groupHeading:{paddingHorizontal:12,paddingVertical:6,backgroundColor:'#F3F4F6',flexDirection:'row',alignItems:'center',gap:8},groupTitleButton:{flex:1,flexDirection:'row',alignItems:'center',gap:8,minHeight:44,minWidth:0},groupTitle:{fontFamily:Studently.type.bodySemi,fontSize:13,color:'#37332F',lineHeight:19},
  unitRow:{paddingHorizontal:16,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:12,borderTopWidth:1,borderTopColor:'#ECEDEF',minHeight:96},compactRow:{flexDirection:'column',alignItems:'stretch',gap:10,padding:14},identity:{flexDirection:'row',gap:12,flex:1,minWidth:0,alignItems:'center'},identityCopy:{flex:1,minWidth:0},thumbnail:{width:72,height:72,borderRadius:10,backgroundColor:'#E8EAED'},thumbnailFallback:{width:72,height:72,borderRadius:10,backgroundColor:'#F0F1F3',alignItems:'center',justifyContent:'center'},unitTitle:{fontFamily:Studently.type.bodySemi,fontSize:16,lineHeight:22,color:'#242321'},performance:{minHeight:26,justifyContent:'center',alignSelf:'flex-start'},rowActions:{flexDirection:'row',alignItems:'center',gap:2,justifyContent:'flex-end'},compactTop:{flexDirection:'row',alignItems:'flex-start',gap:8},compactStatus:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8},compactBottom:{flexDirection:'row',alignItems:'center',gap:12},
  status:{flexDirection:'row',alignItems:'center',gap:6,alignSelf:'flex-start',maxWidth:'100%',paddingVertical:4},statusWarning:{backgroundColor:'#FFFBEB',paddingHorizontal:7,borderRadius:6},statusExpired:{backgroundColor:'#FEF3F2',paddingHorizontal:7,borderRadius:6},statusDot:{width:5,height:5,borderRadius:3,flexShrink:0},statusText:{fontFamily:Studently.type.bodyMedium,fontSize:14,lineHeight:20,color:'#37332F',flexShrink:1},
  autoWrap:{gap:1},autoLine:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:7},autoLabelTouch:{minHeight:44,flexDirection:'row',alignItems:'center',gap:6},autoLabel:{fontFamily:Studently.type.bodyMedium,fontSize:14,color:'#5E5A55',textDecorationLine:'underline'},
  button:{minHeight:44,borderWidth:1,borderColor:'#D9DDE3',borderRadius:8,paddingHorizontal:12,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,backgroundColor:'#FFFFFF'},buttonText:{fontFamily:Studently.type.bodySemi,fontSize:14,color:'#37332F'},primaryButton:{backgroundColor:'#C0343D',borderColor:'#C0343D'},primaryButtonText:{color:'#FFFFFF'},iconButton:{width:44,height:44,alignItems:'center',justifyContent:'center',borderRadius:8},
  drafts:{borderWidth:1,borderColor:'#DFE2E6',borderRadius:10,overflow:'hidden',backgroundColor:'#FFFFFF'},draftHeading:{flexDirection:'row',alignItems:'center',gap:10,minHeight:48,paddingHorizontal:14},draftRow:{borderTopWidth:1,borderColor:'#ECEDEF',padding:12,flexDirection:'row',alignItems:'center',gap:10},
  empty:{paddingHorizontal:24,paddingVertical:48,alignItems:'center',gap:14},emptyIcon:{width:60,height:60,borderRadius:18,backgroundColor:'#FDECEE',alignItems:'center',justifyContent:'center'},emptyTitle:{fontFamily:Studently.type.bodySemi,fontSize:21,color:'#242321',textAlign:'center'},emptyDetail:{fontFamily:Studently.type.body,fontSize:14,lineHeight:21,color:'#625E59',textAlign:'center',maxWidth:360},
  scrim:{flex:1,backgroundColor:'rgba(26,26,26,0.35)',justifyContent:'center',alignItems:'center',padding:24},mobileScrim:{justifyContent:'flex-end',paddingHorizontal:10,paddingBottom:16},sheet:{width:'100%',maxWidth:560,maxHeight:'90%',borderRadius:16,backgroundColor:'#FFFFFF',overflow:'hidden',boxShadow:'0 12px 48px rgba(26,26,26,0.12)'},mobileSheet:{maxWidth:600,maxHeight:'88%'},sheetClose:{height:44,alignItems:'flex-end',paddingRight:4},sheetContent:{padding:20,paddingTop:0,gap:10},sheetTitle:{fontFamily:Studently.type.bodySemi,fontSize:20,lineHeight:27,color:'#242321',marginBottom:5},paragraph:{fontFamily:Studently.type.body,fontSize:14,lineHeight:21,color:'#37332F'},menuItem:{minHeight:44,flexDirection:'row',alignItems:'center',gap:12,borderRadius:7,paddingHorizontal:8},menuText:{fontFamily:Studently.type.bodyMedium,fontSize:14,color:'#37332F',flexShrink:1},separator:{height:1,backgroundColor:'#E4E5E7',marginVertical:6},
});

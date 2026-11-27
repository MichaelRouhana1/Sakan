import { useDesktopDesign, useLayoutWidth } from "@/components/ui/DesktopDesign";
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { publishListingFeedback } from '@/features/saved/savedToast';
import { CollapsingHeaderBar, useCollapsingHeader } from '@/components/ui/CollapsingHeader';
import { SquishSwitch } from '@/components/ui/SquishSwitch';
import { RubberSegment } from '@/components/ui/RubberSegment';
import { Studently } from '@/constants/theme';
import type { Listing } from '@/types/listing';
import { useCredits } from '@/features/credits/useCredits';
import { useArchiveListing } from '@/features/listings/useArchiveListing';
import { useDeleteListing } from '@/features/listings/useDeleteListing';
import { fetchInventory, inventoryKey, setPlaceVisibility, type UnitInventory } from '@/features/listings/hostInventory';
import { openNewCreateListing } from '@/features/auth/useEnsureSession';
import { hostListingAnalyticsPath, posterListingAnalyticsPath } from '@/constants/hostRoutes';
import { HostBedsControl } from '@/components/listings/HostBedsControl';
import { HostInventoryControl } from '@/components/listings/HostInventoryControl';
import { PlaceEditor } from '@/components/listings/edit/PlaceEditor';
import { HostNotificationPreferences } from './HostNotificationPreferences';
import { RenewUnitConfirmation, useListingClock } from './UnitRenewalControls';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import { api } from '@/lib/api';
import { appleTabScrollInset } from '@/components/ui/Glass';
import { expiryTime } from './hostListingStatus';
import { HostListingsLayoutButton, type HostListingsLayout } from './HostListingsToolbar';
import { autoRenewInfo, date, listingFilters, placeName, portfolioCounts, unitTitle, unitTypeName, unitCampusName, workspaceFacts, workspaceGroups, type WorkspaceAction } from './listingsWorkspaceModel';
import { Button, IconButton, MenuTrigger, type Anchor } from './hostWorkspacePrimitives';
import { CardGrid, DraftCard, GridSkeleton, PlaceHeading, UnitCard } from './HostListingCards';

export type WorkspaceDraft = { key: string; title: string; subtitle: string; coverUrl?: string | null; onPress: () => void };
const workspaceFilters = [...listingFilters, 'Drafts'] as const;
type WorkspaceFilter = typeof workspaceFilters[number];
type Props = { listings: Listing[]; drafts: WorkspaceDraft[]; loading: boolean; failed: boolean; refreshing: boolean; signedIn: boolean; createDisabled: boolean; onRefresh: () => Promise<unknown>; onEdit: (unit: Listing) => void };
type Sheet = { kind: 'menu' | 'place'; unit: Listing; anchor?: Anchor; singlePlace?: boolean } |
  { kind: 'renew' | 'availability' | 'auto' | 'shared' | 'archive' | 'remove'; unit: Listing } |
  { kind: 'reminders' | 'add' } | null;
const message = (error: unknown) => (error as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ?? 'Could not save. Please try again.';
const primaryLabels: Record<WorkspaceAction, string> = { renew: 'Renew', edit: 'Edit', analytics: 'View analytics', availability: 'Update availability' };

export function HostListingsWorkspace({ listings, drafts, loading, failed, refreshing, signedIn, createDisabled, onRefresh, onEdit }: Props) {
  const { size: designSize, scale, styles: resolveStyles } = useDesktopDesign();
  const s = resolveStyles(base_s);
  
  const router = useRouter();
  const focused = useIsFocused();
  const params = useLocalSearchParams<{ filter?: string; q?: string; sort?: string }>();
  const [filter, setFilter] = useState<WorkspaceFilter>(() => workspaceFilters.find(value => value === params.filter) ?? 'All');
  const [search, setSearch] = useState(() => typeof params.q === 'string' ? params.q : '');
  const [sort, setSort] = useState<'urgency' | 'name'>(params.sort === 'name' ? 'name' : 'urgency');
  const [layoutChoice, setLayoutChoice] = useState<HostListingsLayout | null>(null);
  const [width, setWidth] = useState(0);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<Sheet>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [pendingAutoIds, setPendingAutoIds] = useState<Set<string>>(new Set());
  const [manualRefresh, setManualRefresh] = useState(false);
  const client = useQueryClient();
  const credits = useCredits(signedIn);
  const archive = useArchiveListing();
  const remove = useDeleteListing();
  const now = useListingClock();
  const units = useMemo(() => listings.filter(unit => unit.status !== 'draft'), [listings]);
  const counts = useMemo(() => portfolioCounts(units, now), [units, now]);
  const groups = useMemo(() => filter === 'Drafts' ? [] : workspaceGroups(units, filter, search, sort, now), [units, filter, search, sort, now]);
  const visibleDrafts = useMemo(() => {
    if (filter !== 'All' && filter !== 'Drafts') return [];
    const tokens = search.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    const result = drafts.filter(draft => tokens.every(token => `${draft.title} ${draft.subtitle}`.toLocaleLowerCase().includes(token)));
    return sort === 'name' ? [...result].sort((a,b) => a.title.localeCompare(b.title, undefined, {numeric:true})) : result;
  }, [drafts, filter, search, sort]);
  const filterCounts = {...counts, All: units.length + drafts.length, Drafts: drafts.length};
  const count = units.length + drafts.length;
  const layoutWidth = width / (scale || 1);
  const autoList = Platform.OS === 'web' && layoutWidth >= 1080 && count !== 1;
  const layout: HostListingsLayout = layoutChoice ?? (autoList ? 'list' : 'grid');
  const wide = layout === 'list' && Platform.OS === 'web' && layoutWidth >= 1080;
  const cards = layout === 'grid';
  const sections = useMemo(() => {
    const out: ({ kind: 'place'; group: typeof groups[number] } | { kind: 'loose'; groups: typeof groups })[] = [];
    let loose: typeof groups = [];
    for (const group of groups) {
      if (group.total === 1) { loose.push(group); continue; }
      if (loose.length) { out.push({ kind: 'loose', groups: loose }); loose = []; }
      out.push({ kind: 'place', group });
    }
    if (loose.length) out.push({ kind: 'loose', groups: loose });
    return out;
  }, [groups]);
  const narrow = layoutWidth < 600;
  const mobileHeaderEnabled = Platform.OS !== 'web';
  const mobileHeader = useCollapsingHeader({
    defaultThreshold: 50,
    extraTopOffset: 16,
    enabled: mobileHeaderEnabled,
  });
  const known = !loading && (!failed || units.length > 0);
  const placeCount = useMemo(() => new Set(units.map(unit => unit.placeId ?? unit.id)).size, [units]);
  const shortage = units.length > 0 && credits.data?.postCredits === 0;
  const close = () => { setSheet(null); setError(''); };
  const open = (next: Sheet) => { setError(''); setSheet(next); };
  const refetch = async () => {
    setManualRefresh(true);
    try { await Promise.all([onRefresh(), credits.refetch()]); }
    finally { setManualRefresh(false); }
  };
  const auto = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => (await api.patch<{data: NonNullable<Listing['autoRenewState']>}>(`/api/listings/${id}/auto-renew`, { enabled })).data.data,
    onMutate: async input => {
      setPendingAutoIds(current => new Set(current).add(input.id));
      await client.cancelQueries({queryKey: ['listings', 'mine']});
      const previous = client.getQueryData<Listing[]>(['listings', 'mine'])?.find(unit => unit.id === input.id);
      client.setQueryData<Listing[]>(['listings', 'mine'], current => current?.map(unit => unit.id === input.id ? {
        ...unit, autoRenew: input.enabled,
        autoRenewState: unit.autoRenewState ? {...unit.autoRenewState, enabled: input.enabled} : undefined,
      } : unit));
      return {previous};
    },
    onSuccess: (state, input) => {
      client.setQueryData<Listing[]>(['listings', 'mine'], current => current?.map(unit => unit.id === input.id ? { ...unit, autoRenew: state.enabled, autoRenewState: state } : unit));
      publishListingFeedback(`auto-renew:${input.id}`, `Auto-renew ${state.enabled ? 'on' : 'off'}.`);
    },
    onError: (error, input, context) => {
      if (context?.previous) client.setQueryData<Listing[]>(['listings', 'mine'], current => current?.map(unit => unit.id === input.id ? {
        ...unit, autoRenew: context.previous!.autoRenew, autoRenewState: context.previous!.autoRenewState,
      } : unit));
      publishListingFeedback(`auto-renew:${input.id}`, message(error));
    },
    onSettled: (_data, _error, input) => {
      void client.invalidateQueries({ queryKey: ['listings', 'mine'] });
      void client.invalidateQueries({ queryKey: ['unit-auto-renew'] });
      setPendingAutoIds(current => { const next = new Set(current); next.delete(input.id); return next; });
    },
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

  const walletCluster = <View style={[s.wallet, narrow && { gap: 8 }]}><View style={s.walletLabel}><Ionicons name="wallet-outline" size={designSize(17)} color={Studently.color.inkMuted} /><Text style={s.smallBold}>{credits.data ? `${credits.data.postCredits} post credits` : credits.isError ? 'Balance unavailable' : 'Checking credits…'}</Text></View><Pressable accessibilityRole="button" onPress={() => router.push('/hosting/credits' as never)} style={s.touch}><Text style={s.textLink}>Buy credits</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Reminder settings" onPress={() => open({ kind: 'reminders' })} style={s.touch}><Text style={s.captionLink}>Reminders</Text></Pressable></View>;

  return <View style={s.root} onLayout={event => setWidth(event.nativeEvent.layout.width)} testID="listings-workspace" aria-busy={loading || refreshing}>
    <Animated.ScrollView onScroll={mobileHeaderEnabled ? mobileHeader.onScroll : undefined} scrollEventThrottle={mobileHeaderEnabled ? mobileHeader.scrollEventThrottle : undefined} keyboardShouldPersistTaps="handled" stickyHeaderIndices={narrow ? undefined : [1]} refreshControl={<RefreshControl refreshing={manualRefresh && !loading} onRefresh={refetch} tintColor={Studently.color.primary} />} contentContainerStyle={s.scroll}>
      <View style={[s.summary, narrow && s.summaryNarrow]}>
        <View style={s.headingRow}><View style={s.flex}>{!narrow ? <Text style={s.eyebrow}>HOST WORKSPACE</Text> : null}<Animated.Text style={[s.title, mobileHeaderEnabled && mobileHeader.largeTitleStyle]} onLayout={mobileHeaderEnabled ? mobileHeader.onLargeTitleLayout : undefined}>Your listings</Animated.Text></View><Button label="Add listing" icon="add" primary onPress={() => open({ kind: 'add' })} disabled={createDisabled} /></View>
        <View style={s.summaryBottom}>
          <View style={s.metrics}>
            <Metric value={known ? counts.Live : null} label="Live" onPress={() => setFilter('Live')} />
            <Metric value={known ? counts.expiring : null} label="Expiring" tone="warning" onPress={() => setFilter('Needs attention')} />
            <Metric value={known ? counts.Expired : null} label="Expired" tone="danger" onPress={() => setFilter('Expired')} />
          </View>
          {walletCluster}
        </View>
        {!narrow ? <View style={s.summaryFoot}><Text style={s.caption}>{known ? `${units.length} ${units.length === 1 ? 'unit' : 'units'} · ${placeCount} ${placeCount === 1 ? 'place' : 'places'}` : 'Your places and units'} · Expiring is included in Live</Text></View> : null}
      </View>

      <View style={[s.toolbar, !narrow && s.toolbarRow]}>
        <RubberSegment value={filter} onChange={setFilter} items={workspaceFilters.map(value => ({value, label: value === 'Drafts' ? 'In progress' : value, count: known || value === 'Drafts' ? filterCounts[value] : '—'}))} />
        <View style={[s.searchRow, !narrow && s.searchRowFill]}><View style={s.search}><Ionicons name="search-outline" size={designSize(18)} color={Studently.color.inkMuted} /><TextInput accessibilityLabel="Search units, places or areas" placeholder={narrow ? 'Search units' : 'Search units or places'} placeholderTextColor="#6B7280" value={search} onChangeText={setSearch} style={s.searchInput} />{search ? <IconButton label="Clear search" icon="close" onPress={() => setSearch('')} /> : null}</View><Button minWidth={narrow ? undefined : 108} iconOnly={narrow} tinted={narrow && sort === 'name'} label={sort === 'urgency' ? 'Urgency' : 'Name'} accessibilityLabel={narrow ? `Sorted by ${sort}. Sort by ${sort === 'urgency' ? 'name' : 'urgency'}` : undefined} icon="swap-vertical-outline" onPress={() => setSort(sort === 'urgency' ? 'name' : 'urgency')} /><HostListingsLayoutButton layout={layout} onLayoutChange={setLayoutChoice} /></View>
      </View>

      <View style={[s.body, narrow && s.bodyNarrow]}>
        {shortage ? <Notice warning text="No post credits. Each unit renewal needs 1 credit." action="Buy credits" onPress={() => router.push('/hosting/credits' as never)} /> : null}
        {failed ? <Notice text={units.length ? 'Couldn’t refresh. Showing your last saved listings.' : 'Couldn’t load your listings.'} action="Retry" onPress={refetch} /> : null}
        {loading && units.length === 0 && drafts.length === 0 ? (cards ? <GridSkeleton /> : <WorkspaceSkeleton wide={wide} />) : units.length === 0 && drafts.length === 0 && !failed && filter !== 'Drafts' ? <Empty title="Add your first listing" detail="Start with a place, then add a whole apartment, private room or shared beds." action="Add listing" onPress={() => open({ kind: 'add' })} /> : !groups.length && !visibleDrafts.length && !failed ? <Empty title={filter === 'Drafts' && !search ? 'No drafts in progress.' : filter === 'Needs attention' && !search ? 'Nothing needs attention right now.' : 'No listings match these filters.'} detail={filter === 'Drafts' && !search ? 'New listings you save before publishing will appear here.' : filter === 'Needs attention' && !search ? 'Your listing times and auto-renew settings are looking good.' : 'Try another unit, place name or area.'} action={filter === 'Needs attention' && !search ? 'Show all' : 'Clear search and filters'} onPress={() => { setFilter('All'); setSearch(''); }} /> : null}
        {cards && (groups.length || visibleDrafts.length) ? <View style={s.cardStack} testID="unit-list">
          {visibleDrafts.length ? <View style={s.cardSection}>
            {groups.length ? <Text style={s.sectionTitle}>In progress</Text> : null}
            <CardGrid>{visibleDrafts.map(draft => <DraftCard key={draft.key} testID={`draft-${draft.key}`} title={draft.title} subtitle={draft.subtitle} coverUrl={draft.coverUrl} onPress={draft.onPress} />)}</CardGrid>
          </View> : null}
          {sections.map(section => {
            const renderCard = (unit: Listing, singlePlace: boolean) => <UnitCard key={unit.id} unit={unit} now={now} singlePlace={singlePlace} autoBusy={pendingAutoIds.has(unit.id)}
              onAction={kind => action(unit, kind)} onMenu={anchor => open({ kind: 'menu', unit, anchor, singlePlace })} onToggle={enabled => auto.mutate({ id: unit.id, enabled })} onAnalytics={() => analytics(unit)} />;
            if (section.kind === 'loose') return <View key={`loose-${section.groups[0].id}`} style={s.cardSection}>
              {sections.some(other => other.kind === 'place') ? <Text style={s.sectionTitle}>Single-unit places</Text> : null}
              <CardGrid>{section.groups.flatMap(group => group.units.map(unit => renderCard(unit, true)))}</CardGrid>
            </View>;
            const { group } = section;
            const folded = collapsed.has(group.id) && filter === 'All' && !search;
            return <View key={group.id} testID={`place-${group.id}`} style={s.cardSection}>
              <PlaceHeading name={group.name} area={group.unit.area} shown={group.units.length} total={group.total} attention={group.attention} folded={folded} createDisabled={createDisabled} compact={narrow}
                onToggle={() => setCollapsed(previous => { const next = new Set(previous); if (next.has(group.id)) next.delete(group.id); else next.add(group.id); return next; })}
                onAdd={() => addUnit(group.unit)} onMenu={anchor => open({ kind: 'place', unit: group.unit, anchor })} />
              {!folded ? <CardGrid>{group.units.map(unit => renderCard(unit, false))}</CardGrid> : null}
            </View>;
          })}
        </View> : null}
        {!cards && (groups.length || visibleDrafts.length) ? <View style={[s.list, narrow && s.compactList, !wide && count === 1 && s.singleList]} testID="unit-list">
          {wide ? <View style={s.columnHeader}><View style={s.unitColumn}><Text style={s.columnLabel}>UNIT</Text></View><View style={s.timeColumn}><Text style={s.columnLabel}>LISTING TIME</Text></View><View style={s.availabilityColumn}><Text style={s.columnLabel}>AVAILABILITY</Text></View><View style={s.autoColumn} testID="auto-renew-column-header"><Text style={s.columnLabel}>AUTO-RENEW</Text></View><View style={s.actionColumn} testID="action-column-header"><Text style={s.columnLabel}>ACTION</Text></View></View> : null}
          {visibleDrafts.map(draft => <DraftRow key={draft.key} draft={draft} wide={wide} />)}
          {groups.map(group => {
            const folded = collapsed.has(group.id) && filter === 'All' && !search;
            return <View key={group.id} testID={`place-${group.id}`} style={[s.group, narrow && s.compactGroup]}>
              {group.total > 1 ? <View style={[s.groupHeading, narrow && s.compactHeading]}>
                <Pressable accessibilityRole="button" accessibilityLabel={`${folded ? 'Expand' : 'Collapse'} ${group.name}`} accessibilityState={{expanded:!folded}} onPress={() => setCollapsed(previous => { const next=new Set(previous); if(next.has(group.id))next.delete(group.id);else next.add(group.id);return next; })} style={s.groupTitleButton}>
                  <Ionicons name={folded?'chevron-forward':'chevron-down'} size={designSize(16)} color={Studently.color.inkMuted} /><View style={s.flex}><Text style={[s.groupTitle, narrow && s.compactGroupTitle]} numberOfLines={2}>{group.name}<Text style={s.muted}> · {group.unit.area}</Text></Text><Text style={s.caption}>{group.units.length === group.total ? `${group.total} units` : `${group.units.length} of ${group.total} units`}{group.attention ? <Text style={narrow ? s.warningText : undefined}>{` · ${group.attention} need attention`}</Text> : null}</Text></View>
                </Pressable>
                {!narrow ? <Button label="Add unit" icon="add" disabled={createDisabled} onPress={() => addUnit(group.unit)} /> : null}
                <MenuTrigger label={`Place options for ${group.name}`} onPress={anchor => open({kind:'place',unit:group.unit,anchor})} />
              </View> : null}
              {!folded ? group.units.map(unit => <UnitRow key={unit.id} unit={unit} now={now} wide={wide} singlePlace={group.total===1} onAction={kind=>action(unit,kind)} onMenu={anchor=>open({kind:'menu',unit,anchor})} onPlace={anchor=>open({kind:'place',unit,anchor})} onToggle={enabled=>auto.mutate({id:unit.id,enabled})} autoBusy={pendingAutoIds.has(unit.id)} onAnalytics={()=>analytics(unit)} />) : null}
            </View>;
          })}
        </View> : null}
      </View>
    </Animated.ScrollView>
    {mobileHeaderEnabled ? <CollapsingHeaderBar controller={mobileHeader} title="Your listings" variant="overlay" backgroundColor="#FFFFFF" borderColor="#ECEAE6" titleColor="#1A1A1A" testID="host-listings-collapsing-header" /> : null}

    {notice ? <View accessibilityLiveRegion="polite" style={s.toast} testID="listings-toast"><Text style={[s.small,s.flex]}>{notice}</Text><IconButton label="Dismiss message" icon="close" onPress={() => setNotice('')} /></View> : null}
    <WorkspaceSheet sheet={sheet} onClose={close}>
      {({ isPopover }) => sheet?.kind === 'menu' ? <>
        <View style={[s.menuHeader, !isPopover && s.menuHeaderSheet]}>
          <Text style={isPopover ? s.popoverTitle : s.sheetTitle} numberOfLines={isPopover ? 1 : 2}>{unitTitle(sheet.unit)}</Text>
        </View>
        <View style={isPopover ? s.popoverList : s.mobileMenuList}>
          <MenuItem compact={isPopover} label="Update availability" icon="bed-outline" onPress={()=>open({kind:'availability',unit:sheet.unit})} />
          <MenuItem compact={isPopover} label="Renew" icon="refresh-outline" disabled={!workspaceFacts(sheet.unit,now).canRenew} onPress={()=>open({kind:'renew',unit:sheet.unit})} />
          <MenuItem compact={isPopover} label="Auto-renew settings" icon="sync-outline" onPress={()=>open({kind:'auto',unit:sheet.unit})} />
          <View style={[s.separator, isPopover && s.popoverDivider]} />
          <MenuItem compact={isPopover} label="Analytics" icon="stats-chart-outline" onPress={()=>analytics(sheet.unit)} />
          <MenuItem compact={isPopover} label="Edit" icon="create-outline" disabled={!workspaceFacts(sheet.unit,now).canEdit} onPress={()=>action(sheet.unit,'edit')} />
          <MenuItem compact={isPopover} label="Promote" icon="trending-up-outline" disabled={sheet.unit.status==='removed'} onPress={()=>{close();router.push(`/hosting/listing/${sheet.unit.id}/promote` as never);}} />
          <MenuItem compact={isPopover} label="Was it rented?" icon="checkmark-circle-outline" disabled={sheet.unit.status==='removed'} onPress={()=>{close();router.push(`/hosting/listing/${sheet.unit.id}/outcome` as never);}} />
          {sheet.singlePlace ? <MenuItem compact={isPopover} label="Place & shared details" icon="business-outline" onPress={()=>open({kind:'place',unit:sheet.unit,anchor:sheet.anchor})} /> : null}
          <View style={[s.separator, isPopover && s.popoverDivider]} />
          <MenuItem compact={isPopover} label="Archive" icon="archive-outline" danger disabled={sheet.unit.status!=='active'} onPress={()=>open({kind:'archive',unit:sheet.unit})} />
          <MenuItem compact={isPopover} label="Remove" icon="trash-outline" danger disabled={sheet.unit.status!=='active'} onPress={()=>open({kind:'remove',unit:sheet.unit})} />
        </View>
      </> : sheet?.kind === 'place' ? <PlaceMenu compact={isPopover} unit={sheet.unit} createDisabled={createDisabled} onAdd={()=>addUnit(sheet.unit)} onShared={()=>open({kind:'shared',unit:sheet.unit})} onSaved={()=>{void client.invalidateQueries({queryKey:['listings']});void client.invalidateQueries({queryKey:['host-inventory']});void client.invalidateQueries({queryKey:['promotions']});close();}} /> :
      sheet?.kind === 'renew' ? <RenewUnitConfirmation listingId={sheet.unit.id} onClose={close} /> :
      sheet?.kind === 'availability' ? <><Text style={s.sheetTitle}>Update availability</Text><Text style={s.muted}>{unitTitle(sheet.unit)}</Text><HostInventoryControl listingId={sheet.unit.id} /></> :
      sheet?.kind === 'shared' ? <PlaceEditor listing={sheet.unit} onClose={close} /> :
      sheet?.kind === 'reminders' ? <HostNotificationPreferences compact /> :
      sheet?.kind === 'auto' ? <><Text style={s.sheetTitle}>Auto-renew</Text><Text style={s.paragraph}>Renews for 30 days with 1 post credit in the final hour before it expires. Uses credits already in your wallet. Each unit renews separately.</Text><Text style={s.paragraph}>{unitTitle(sheet.unit)}</Text><AutoRenewSummary unit={listings.find(unit=>unit.id===sheet.unit.id)??sheet.unit} now={now} onToggle={enabled=>auto.mutate({id:sheet.unit.id,enabled})} busy={pendingAutoIds.has(sheet.unit.id)} compact />{sheet.unit.expiresAt ? <Text style={s.paragraph}>Renewal window: {date((expiryTime(sheet.unit.expiresAt)??0)-3600000,true)} – {date(sheet.unit.expiresAt,true)}.</Text> : null}<Text style={s.muted}>Without enough credits or a confirmed available-bed count, the unit expires normally. Renewing after expiry requires your confirmation.</Text><Button label="Refresh eligibility" onPress={refetch} /></> :
      sheet?.kind === 'add' ? <><Text style={s.sheetTitle}>Add a listing</Text><Text style={s.muted}>Start a new place, or add a unit to one you own.</Text><Button label="New place" icon="home-outline" primary disabled={createDisabled} onPress={()=>addUnit()} /><View style={s.separator} /><Text style={s.smallBold}>UNIT IN AN EXISTING PLACE</Text>{[...new Map(units.filter(unit=>unit.placeId).map(unit=>[unit.placeId,unit])).values()].map(unit=><MenuItem key={unit.placeId} label={`${placeName(unit)} · ${unit.area}`} icon="add" disabled={createDisabled} onPress={()=>addUnit(unit)} />)}{!units.length?<Text style={s.muted}>No saved places yet.</Text>:null}</> :
      sheet?.kind === 'archive' || sheet?.kind === 'remove' ? <><Text style={s.sheetTitle}>{sheet.kind==='archive'?'Archive':'Remove'} this unit?</Text><Text style={s.paragraph}>{unitTitle(sheet.unit)}</Text><Text style={s.muted}>{sheet.kind==='archive'?'Takes this unit off search and turns auto-renew off. Occupancy stays saved.':'Permanently removes this listing. Confirm vacancy first; occupied units must be archived instead.'}</Text>{error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}<Button label={archive.isPending||remove.isPending?'Saving…':sheet.kind==='archive'?'Confirm archive':'Confirm remove'} primary disabled={archive.isPending||remove.isPending} onPress={()=>void destroy(sheet.unit,sheet.kind==='archive'?'archive':'remove')} /></> : null}
    </WorkspaceSheet>
  </View>;
}

function DraftRow({draft,wide}:{draft:WorkspaceDraft;wide:boolean}) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const s = resolveStyles(base_s);
  
  const layoutWidth = useLayoutWidth();
  const size = designSize(layoutWidth >= 1024 ? 72 : 64);
  const photo=resolveMediaUrl(draft.coverUrl??null);
  const identity=<View style={s.identity}>
    {photo?<Image source={{uri:photo}} style={[s.thumbnail,{width:size,height:size}]} contentFit="cover"/>:<View style={[s.thumbnailFallback,{width:size,height:size}]}><Ionicons name="document-text-outline" size={designSize(24)} color="#8A847C"/></View>}
    <View style={s.identityCopy}><Text style={s.unitTitle} numberOfLines={layoutWidth>=1440?undefined:2}>{draft.title}</Text><Text style={s.typePrice} numberOfLines={2}>{draft.subtitle}</Text></View>
  </View>;
  const badge=<View style={[s.status,s.draftBadge]}><Text style={s.statusText}>In progress</Text></View>;
  const actions=<><Button label="Continue" accessibilityLabel={`Continue draft ${draft.title}`} onPress={draft.onPress}/><MenuTrigger label={`Draft options for ${draft.title}`} onPress={draft.onPress}/></>;
  const phone=!wide&&layoutWidth<600;
  return <View style={[s.unitRow,phone&&s.compactRow]} testID={`draft-${draft.key}`}>
    {wide?<><View style={s.unitColumn}>{identity}</View><View style={s.timeColumn}>{badge}<Text style={s.caption}>Not published</Text></View><View style={s.availabilityColumn}><Text style={s.caption}>—</Text></View><View style={s.autoColumn}><Text style={s.caption}>—</Text></View><View style={[s.actionColumn,s.rowActions]}>{actions}</View></>:phone?<><View style={s.compactTop}>{identity}{badge}</View><View style={s.compactFooter}><Text style={[s.caption,s.flex]}>Not published</Text><View style={s.draftCompactActions}>{actions}</View></View></>:<><View style={s.flex}>{identity}</View>{badge}<View style={s.rowActions}>{actions}</View></>}
  </View>;
}

function UnitRow({unit,now,wide,singlePlace,onAction,onMenu,onPlace,onToggle,autoBusy,onAnalytics}:{unit:Listing;now:number;wide:boolean;singlePlace:boolean;onAction:(kind:WorkspaceAction)=>void;onMenu:(anchor:Anchor)=>void;onPlace:(anchor:Anchor)=>void;onToggle:(value:boolean)=>void;autoBusy:boolean;onAnalytics:()=>void}) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const s = resolveStyles(base_s);
  
  const f=workspaceFacts(unit,now);
  const autoInfo=autoRenewInfo(unit,now);
  const photo=resolveMediaUrl(unit.coverUrl??unit.photos?.[0]?.url??null);
  const layoutWidth = useLayoutWidth();
  const thumbnailSize = designSize(layoutWidth >= 1024 ? 72 : 64);
  const thumbnailStyle={width:thumbnailSize,height:thumbnailSize};
  const title=<Text style={s.unitTitle} numberOfLines={layoutWidth>=1440?undefined:2}>{unitTitle(unit)}</Text>;
  const status=<View style={[s.status,f.expiring&&s.statusWarning,f.expired&&s.statusExpired]}><View style={[s.statusDot,{backgroundColor:f.expired?'#B42318':f.expiring?'#B45309':f.live?'#25814C':'#6B7280'}]} /><Text style={[s.statusText,f.expiring&&s.warningText,f.expired&&{color:'#B42318'}]}>{f.status.label}</Text></View>;
  const identity=<View style={s.identity}>
    {photo?<Image source={{uri:photo}} testID="listing-thumbnail" style={[s.thumbnail,thumbnailStyle]} contentFit="cover" />:<View style={[s.thumbnailFallback,thumbnailStyle]} testID="listing-thumbnail"><Ionicons name="home-outline" size={designSize(24)} color="#8A847C" /></View>}
    <View style={s.identityCopy}>{singlePlace?<Pressable accessibilityRole="button" accessibilityLabel={`Place options for ${placeName(unit)}`} onPress={()=>onPlace({x:0,y:0})}>{title}</Pressable>:title}<Text style={s.typePrice}>{unitTypeName(unit)} · ${unit.monthlyRentUsd.toLocaleString()}/{unit.priceBasis==='per_bed_month'?'bed/mo':unit.priceBasis==='per_room_month'?'room/mo':'mo'}{unitCampusName(unit)?` · ${unitCampusName(unit)}`:''}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Analytics for ${unitTitle(unit)}`} onPress={onAnalytics} style={s.performance}><Text style={s.caption}>{unit.viewCount??0} views · {unit.contactTapCount??0} taps</Text></Pressable>
      <HostBedsControl listing={unit} compact />
    </View>
  </View>;
  const availability=<View><Text style={[s.small,f.needsBeds&&s.warningText]}>{f.availability}</Text>{f.hidden?<Text style={s.caption}>{unit.hidden?'Hidden by you':unit.hiddenReason?.replaceAll('_',' ')||'Hidden from search'}</Text>:null}</View>;
  const phone=!wide&&layoutWidth<600;
  return <View style={[s.unitRow,phone&&s.compactRow]} testID={`unit-${unit.id}`}>
    {wide?<>
      <View style={s.unitColumn}>{identity}</View>
      <View style={[s.timeColumn,{minHeight:f.hidden||f.expiring?92:72}]}>{status}{f.expired?<Text style={s.caption}>{date(unit.expiresAt)}</Text>:null}{autoInfo.copy?<Text style={[s.caption,autoInfo.reason&&s.warningText]}>{autoInfo.copy}</Text>:null}{f.enabled&&autoInfo.reason&&unit.expiresAt?<Text style={s.caption}>Due {date(unit.expiresAt)}</Text>:null}</View>
      <View style={s.availabilityColumn}>{availability}</View>
      <View style={s.autoColumn}><AutoRenewSummary unit={unit} now={now} onToggle={onToggle} busy={autoBusy} anchored/></View>
      <View style={[s.actionColumn,s.rowActions]}><Button label={primaryLabels[f.primary]} accessibilityLabel={`${primaryLabels[f.primary]} ${unitTitle(unit)}`} primary={f.primary==='renew'} onPress={()=>onAction(f.primary)} /><MenuTrigger label={`Actions for ${unitTitle(unit)}`} onPress={onMenu}/></View>
    </>:phone?<>
      <View style={s.compactTop}>
        <View style={s.compactIdentity}>
          {photo?<Image source={{uri:photo}} testID="listing-thumbnail" style={[s.thumbnail,{width:thumbnailSize,height:thumbnailSize}]} contentFit="cover" />:<View style={[s.thumbnailFallback,{width:thumbnailSize,height:thumbnailSize}]} testID="listing-thumbnail"><Ionicons name="home-outline" size={designSize(24)} color="#8A847C" /></View>}
          <View style={s.identityCopy}>{singlePlace?<Pressable accessibilityRole="button" accessibilityLabel={`Place options for ${placeName(unit)}`} hitSlop={12} onPress={()=>onPlace({x:0,y:0})}>{title}</Pressable>:title}<Text style={s.typePrice} numberOfLines={1}>{unitTypeName(unit)}{unitCampusName(unit)?` · ${unitCampusName(unit)}`:''}</Text></View>
        </View>
        <MenuTrigger label={`Actions for ${unitTitle(unit)}`} onPress={onMenu}/>
      </View>
      <View style={s.compactFacts}><Text style={s.compactPrice} numberOfLines={1}>${unit.monthlyRentUsd.toLocaleString()}<Text style={s.compactPriceUnit}>{`\u2060/${unit.priceBasis==='per_bed_month'?'bed/mo':'mo'}`}</Text></Text><Pressable accessibilityRole="button" accessibilityLabel={`Analytics for ${unitTitle(unit)}`} hitSlop={8} onPress={onAnalytics} style={s.performance}><Text style={s.caption}>{unit.viewCount??0} views · {unit.contactTapCount??0} taps</Text></Pressable></View>
      <View style={s.compactStatus}>{status}<View style={s.compactAvailability}>{availability}</View></View>
      <View style={s.compactFooter}><View style={s.compactAutoSlot}><AutoRenewSummary unit={unit} now={now} onToggle={onToggle} busy={autoBusy} compact/></View><Button label={primaryLabels[f.primary]} accessibilityLabel={`${primaryLabels[f.primary]} ${unitTitle(unit)}`} primary={f.primary==='renew'} onPress={()=>onAction(f.primary)}/></View>
    </>:<><View style={s.mediumIdentity}>{identity}</View><View style={s.mediumMeta}>{status}{availability}</View><View style={s.mediumAuto}><AutoRenewSummary unit={unit} now={now} onToggle={onToggle} busy={autoBusy} compact/></View><Button label={primaryLabels[f.primary]} accessibilityLabel={`${primaryLabels[f.primary]} ${unitTitle(unit)}`} primary={f.primary==='renew'} onPress={()=>onAction(f.primary)}/><MenuTrigger label={`Actions for ${unitTitle(unit)}`} onPress={onMenu}/></>}
  </View>;
}

function AutoRenewSummary({unit,now,onToggle,busy,compact=false,anchored=false}:{unit:Listing;now:number;onToggle:(enabled:boolean)=>void;busy:boolean;compact?:boolean;anchored?:boolean}) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const s = resolveStyles(base_s);
  
  const {f,ready,disabled,reason,copy}=autoRenewInfo(unit,now);
  const deadline=unit.expiresAt?date(unit.expiresAt):'Date unavailable';
  const briefReason=f.blocked==='credits'?'Add credits':f.blocked==='beds'?'Confirm beds':f.blocked==='account'?'Check account':'Check availability';
  const compactCopy=!ready?copy:f.rented?'Unavailable':f.enabled&&!f.expired?(reason?`${briefReason} · ${deadline}`:`Next: ${deadline}`):copy;
  const fullCopy=`${copy}${f.enabled&&reason&&unit.expiresAt?` · Due ${deadline}`:''}`;
  const stateLabel=ready?(f.enabled?'On':'Off'):'—';
  if(compact)return <View style={s.compactAuto}><SquishSwitch accessibilityLabel={`Auto-renew for ${unitTitle(unit)}`} value={f.enabled} disabled={disabled||!ready||busy} onValueChange={onToggle} /><View style={s.flex}><Text style={s.compactAutoLabel} numberOfLines={1}>{`Auto-renew · ${stateLabel}`}</Text>{compactCopy?<Text numberOfLines={2} accessibilityLabel={fullCopy} style={[s.compactAutoHelp,reason&&s.warningText]}>{compactCopy}</Text>:null}</View></View>;
  return <View style={anchored?s.autoAnchor:s.autoWrap}><SquishSwitch accessibilityLabel={`Auto-renew for ${unitTitle(unit)}`} value={f.enabled} disabled={disabled||!ready||busy} onValueChange={onToggle} /><Text style={[s.autoState,anchored&&s.autoStateBelow]}>{stateLabel}</Text>{!anchored?<View style={{minHeight:designSize(18),maxWidth:'100%'}}>{compactCopy?<Text numberOfLines={1} accessibilityLabel={fullCopy} style={[s.autoHelper,reason&&s.warningText]}>{compactCopy}</Text>:null}</View>:null}</View>;
}

function Metric({value,label,tone,onPress}:{value:number|null;label:string;tone?:'warning'|'danger';onPress:()=>void}) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const s = resolveStyles(base_s);
  
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value??'loading'}`} onPress={onPress} style={s.metric}><Text style={[s.metricValue,tone==='warning'&&{color:'#BC3D34'},tone==='danger'&&{color:'#EA3F4A'}]}>{value??'—'}</Text><Text style={s.metricLabel}>{label}</Text></Pressable>;
}
function Notice({text,warning=false,action,onPress}:{text:string;warning?:boolean;action?:string;onPress?:()=>void}) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const s = resolveStyles(base_s);
   return <View style={[s.notice,warning&&s.noticeWarning]}><Ionicons name={warning?'alert-circle-outline':'information-circle-outline'} size={designSize(18)} color={warning?'#92400E':'#5E5A55'}/><Text style={[s.small,s.flex,warning&&s.warningText]}>{text}</Text>{action&&onPress?<Button label={action} onPress={onPress}/>:null}</View>; }
function Empty({title,detail,action,onPress}:{title:string;detail:string;action:string;onPress:()=>void}) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const s = resolveStyles(base_s);
   return <View style={s.empty} testID="listings-empty"><View style={s.emptyIcon}><Ionicons name="home-outline" size={designSize(28)} color="#C0343D"/></View><Text style={s.emptyTitle}>{title}</Text><Text style={s.emptyDetail}>{detail}</Text><Button label={action} primary onPress={onPress}/></View>; }
function WorkspaceSkeleton({wide}:{wide:boolean}) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const s = resolveStyles(base_s);
   const layoutWidth=useLayoutWidth(); const size=designSize(layoutWidth>=1024?72:layoutWidth>=768?64:56); return <View testID="listings-loading" accessibilityLabel="Loading listings">{[0,1,2,3].map(i=><View key={i} style={[s.unitRow,!wide&&s.compactRow,{minHeight:designSize(wide?96:180),gap:designSize(14)}]}><View style={[s.thumbnailFallback,{width:size,height:size}]}/><View style={{flex:1,gap:designSize(10)}}><View style={{height:designSize(15),width:'60%',backgroundColor:'#E8EAED',borderRadius:designSize(4)}}/><View style={{height:designSize(10),width:'40%',backgroundColor:'#E8EAED',borderRadius:designSize(4)}}/><View style={{height:designSize(10),width:'50%',backgroundColor:'#E8EAED',borderRadius:designSize(4)}}/></View></View>)}</View>; }

const HOST_POPOVER_CSS = `
@keyframes skHostPopoverIn {
  from { opacity: 0; transform: translateY(var(--sk-pop-dy, -4px)) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes skHostSheetIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
[data-host-popover="desktop"] {
  animation: skHostPopoverIn 140ms cubic-bezier(0.16, 1, 0.3, 1) both;
  will-change: transform, opacity;
}
[data-host-popover="mobile"] {
  animation: skHostSheetIn 200ms cubic-bezier(0.16, 1, 0.3, 1) both;
  will-change: transform, opacity;
}
[data-host-popover] {
  scrollbar-width: thin;
  scrollbar-color: rgba(107, 100, 96, 0.28) transparent;
}
[data-host-popover]:focus:not(:focus-visible),
[data-host-popover] *:focus:not(:focus-visible) {
  outline: none !important;
}
[data-host-popover] [role="button"]:focus-visible,
[data-host-popover] button:focus-visible {
  outline: 2px solid #EA3F4A !important;
  outline-offset: -2px !important;
}
@media (prefers-reduced-motion: reduce) {
  [data-host-popover="desktop"],
  [data-host-popover="mobile"] {
    animation: none !important;
  }
}
`;

function MenuItem({label,icon,onPress,disabled=false,danger=false,compact=false}:{label:string;icon:keyof typeof Ionicons.glyphMap;onPress:()=>void;disabled?:boolean;danger?:boolean;compact?:boolean}) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const s = resolveStyles(base_s);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} accessibilityState={{disabled}} onPress={onPress} style={(state)=>{
    const hovered = !disabled && Boolean((state as { hovered?: boolean }).hovered);
    const pressed = !disabled && state.pressed;
    return [
      s.menuItem,
      compact && s.menuItemCompact,
      hovered && (danger ? s.menuItemDangerHover : s.menuItemHover),
      pressed && (danger ? s.menuItemDangerPressed : s.menuItemPressed),
      disabled && s.menuItemDisabled,
      Platform.OS === 'web' && ({ cursor: disabled ? 'not-allowed' : 'pointer', transitionProperty: 'background-color, color', transitionDuration: '110ms' } as object),
    ];
  }}>{(state)=>{
    const hovered = !disabled && Boolean((state as { hovered?: boolean }).hovered);
    const iconColor = danger ? (hovered ? '#991B1B' : '#C0343D') : (hovered ? '#1A1A1A' : '#5E5A55');
    return <>
      <Ionicons name={icon} size={designSize(compact ? 16 : 19)} color={iconColor} style={s.menuIcon}/>
      <Text style={[s.menuText, compact && s.menuTextCompact, danger && s.menuTextDanger, hovered && !danger && s.menuTextHover]} numberOfLines={1}>{label}</Text>
    </>;
  }}</Pressable>;
}

function PlaceMenu({unit,onAdd,onShared,onSaved,createDisabled,compact=false}:{unit:Listing;onAdd:()=>void;onShared:()=>void;onSaved:()=>void;createDisabled:boolean;compact?:boolean}) {
  const { styles: resolveStyles } = useDesktopDesign();
  const s = resolveStyles(base_s);

  const query=useQuery({queryKey:inventoryKey(unit.id),queryFn:()=>fetchInventory(unit.id)});
  const [confirm,setConfirm]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function visibility() {if(!query.data)return;setBusy(true);setError('');try{await setPlaceVisibility(query.data.placeId,!query.data.placeHidden);onSaved();}catch(e){setError(message(e));}finally{setBusy(false);}}
  return <>
    <View style={[s.menuHeader, !compact && s.menuHeaderSheet]}>
      <Text style={compact ? s.popoverTitle : s.sheetTitle} numberOfLines={compact ? 1 : 2}>{placeName(unit)}</Text>
      <Text style={compact ? s.popoverSubtitle : s.muted} numberOfLines={1}>{unit.area} · Shared details</Text>
    </View>
    <View style={compact ? s.popoverList : s.mobileMenuList}>
      <MenuItem compact={compact} label="Add unit" icon="add" disabled={createDisabled} onPress={onAdd}/>
      <MenuItem compact={compact} label="Edit shared details" icon="create-outline" onPress={onShared}/>
      {query.data?<MenuItem compact={compact} label={query.data.placeHidden?'Show place':'Hide place'} icon={query.data.placeHidden?'eye-outline':'eye-off-outline'} onPress={()=>setConfirm(true)}/>:<Text style={[s.muted, compact && s.popoverNote]}>{query.isError?'Couldn’t check place visibility.':'Checking place visibility…'}</Text>}
    </View>
    {query.isError?<View style={compact ? s.popoverExtra : undefined}><Button label="Retry visibility" onPress={()=>void query.refetch()}/></View>:null}
    {confirm?<View style={compact ? s.popoverExtra : s.placeConfirm}><Text style={s.paragraph}>This changes visibility for all units in this place. Bed counts and listing dates stay the same.</Text><Button label={busy?'Saving…':query.data?.placeHidden?'Confirm show place':'Confirm hide place'} onPress={()=>void visibility()} disabled={busy}/></View>:null}
    {error?<Text accessibilityRole="alert" style={[s.error, compact && s.popoverNote]}>{error}</Text>:null}
  </>;
}

function WorkspaceSheet({sheet,onClose,children}:{sheet:Sheet;onClose:()=>void;children:(ctx:{isPopover:boolean})=>ReactNode}) {
  const { size: designSize, styles: resolveStyles } = useDesktopDesign();
  const s = resolveStyles(base_s);

  const {width,height}=useWindowDimensions();
  const layoutWidth=useLayoutWidth();
  const menu=sheet?.kind==='menu'||sheet?.kind==='place';
  const desktop=Platform.OS==='web'&&layoutWidth>=768;
  const anchor=sheet&&'anchor'in sheet?sheet.anchor:null;
  const isPopover=Boolean(menu&&desktop&&anchor&&anchor.x>0);
  const closeRef=useRef(onClose);closeRef.current=onClose;
  const [measuredHeight,setMeasuredHeight]=useState(0);

  useEffect(()=>{
    if(Platform.OS!=='web'||typeof document==='undefined')return;
    if(document.getElementById('sk-host-popover-css'))return;
    const tag=document.createElement('style');
    tag.id='sk-host-popover-css';
    tag.textContent=HOST_POPOVER_CSS;
    document.head.appendChild(tag);
  },[]);

  useEffect(()=>{ setMeasuredHeight(0); },[sheet?.kind, anchor?.x, anchor?.y]);

  useEffect(()=>{
    if(!sheet||Platform.OS!=='web')return;
    const previous=document.activeElement as HTMLElement|null;
    const dialog=()=>document.querySelector<HTMLElement>('[data-testid="workspace-dialog"]');
    const focusables=()=>Array.from(dialog()?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex="0"],[role="button"]:not([aria-disabled="true"]),[role="switch"]:not([aria-disabled="true"])')??[]).filter(el=>el.getClientRects().length>0);
    const timer=setTimeout(()=>{
      if(isPopover){
        const el=dialog();
        if(el){ el.tabIndex=-1; el.focus({preventScroll:true}); }
      } else {
        focusables()[0]?.focus();
      }
    },30);
    const key=(event:KeyboardEvent)=>{
      const dialogs=Array.from(document.querySelectorAll('[role="dialog"]'));
      if(dialogs.at(-1)?.getAttribute('data-testid')!=='workspace-dialog')return;
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeRef.current();return;}
      if(isPopover&&(event.key==='ArrowDown'||event.key==='ArrowUp'||event.key==='Home'||event.key==='End')){
        const list=focusables();
        if(!list.length)return;
        event.preventDefault();
        const idx=list.indexOf(document.activeElement as HTMLElement);
        if(event.key==='Home'){list[0].focus();return;}
        if(event.key==='End'){list[list.length-1].focus();return;}
        const next=event.key==='ArrowDown'?(idx<0||idx===list.length-1?0:idx+1):(idx<=0?list.length-1:idx-1);
        list[next].focus();
        return;
      }
      if(event.key==='Tab'){
        const list=focusables();
        if(!list.length)return;
        const first=list[0],last=list[list.length-1];
        if(event.shiftKey&&(document.activeElement===first||!list.includes(document.activeElement as HTMLElement))){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&(document.activeElement===last||!list.includes(document.activeElement as HTMLElement))){event.preventDefault();first.focus();}
      }
    };
    const onResize=()=>{ if(isPopover) closeRef.current(); };
    document.addEventListener('keydown',key);
    window.addEventListener('resize',onResize);
    return()=>{clearTimeout(timer);document.removeEventListener('keydown',key);window.removeEventListener('resize',onResize);previous?.focus();};
  },[sheet?.kind,isPopover]);

  const popoverW = designSize(244);
  const estimatedH = designSize(sheet?.kind === 'place' ? 196 : 416);
  const popH = measuredHeight > 0 ? measuredHeight : estimatedH;
  const edge = 12;
  const gap = 6;
  let popoverStyle: Record<string, unknown> | null = null;
  if (isPopover && anchor) {
    const triggerTop = anchor.top ?? Math.max(edge, anchor.y - designSize(44));
    const triggerLeft = anchor.left ?? Math.max(edge, anchor.x - designSize(44));
    const rightAlignedLeft = anchor.x - popoverW;
    const alignRight = rightAlignedLeft >= edge;
    const left = Math.max(edge, Math.min(alignRight ? rightAlignedLeft : triggerLeft, width - popoverW - edge));
    const spaceBelow = height - anchor.y - gap - edge;
    const spaceAbove = triggerTop - gap - edge;
    const openAbove = spaceBelow < popH && spaceAbove > spaceBelow;
    const maxH = Math.max(200, Math.min(height - edge * 2, openAbove ? spaceAbove : spaceBelow));
    const top = openAbove
      ? Math.max(edge, triggerTop - Math.min(popH, maxH) - gap)
      : Math.max(edge, Math.min(anchor.y + gap, height - Math.min(popH, maxH) - edge));
    popoverStyle = {
      position: 'absolute',
      left: Math.round(left),
      top: Math.round(top),
      width: popoverW,
      maxHeight: Math.round(maxH),
      transformOrigin: `${openAbove ? 'bottom' : 'top'} ${alignRight ? 'right' : 'left'}`,
      ['--sk-pop-dy' as string]: openAbove ? '4px' : '-4px',
    };
  }

  const webAnimAttr = Platform.OS === 'web'
    ? ({ dataSet: { hostPopover: isPopover ? 'desktop' : !desktop ? 'mobile' : 'dialog' } } as object)
    : {};

  return <Modal visible={sheet!=null} transparent animationType={Platform.OS === 'web' ? 'none' : 'fade'} onRequestClose={onClose}>
    <View style={[s.scrim, !desktop && s.mobileScrim, isPopover && s.popoverScrim]}>
      <Pressable accessibilityLabel="Dismiss dialog" accessible={false} onPress={onClose} style={StyleSheet.absoluteFill}/>
      <View
        {...webAnimAttr}
        role="dialog"
        accessibilityLabel={sheet?.kind==='menu'?'Unit actions':sheet?.kind==='place'?'Place actions':'Listing action'}
        accessibilityViewIsModal
        testID="workspace-dialog"
        onLayout={isPopover ? (event) => {
          const h = Math.round(event.nativeEvent.layout.height);
          if (h > 0 && Math.abs(h - measuredHeight) > 2) setMeasuredHeight(h);
        } : undefined}
        style={[
          s.sheet,
          !desktop && s.mobileSheet,
          isPopover && s.popoverSheet,
          popoverStyle as object,
          sheet?.kind==='renew' && {maxWidth: designSize(440)},
        ]}
      >
        {!desktop ? <View style={s.sheetGrabberWrap}><View style={s.sheetGrabber}/></View> : null}
        {!isPopover ? <View style={[s.sheetClose, !desktop && s.sheetCloseMobile]}><IconButton label="Close dialog" icon="close" onPress={onClose}/></View> : null}
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={sheet?.kind==='renew' ? undefined : isPopover ? s.popoverScrollContent : [s.sheetContent, !desktop && s.mobileSheetContent]}>{children({isPopover})}</ScrollView>
      </View>
    </View>
  </Modal>;
}

const base_s = StyleSheet.create({
  root:{flex:1,minHeight:0,width:'100%'},scroll:{paddingBottom:Platform.OS==='web'?40:appleTabScrollInset+24},flex:{flex:1,minWidth:0},
  summary:{paddingHorizontal:28,paddingTop:16,paddingBottom:4,gap:6},summaryNarrow:{paddingHorizontal:16,paddingTop:16,gap:10},headingRow:{flexDirection:'row',alignItems:'center',gap:12},
  title:{fontFamily:Studently.type.bodyBold,fontSize:28,lineHeight:34,color:'#1A1A1A',letterSpacing:-.7},
  summaryBottom:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12},metrics:{flexDirection:'row',gap:28},metric:{minHeight:44,justifyContent:'center',gap:0},metricValue:{fontFamily:Studently.type.bodyBold,fontSize:26,lineHeight:30,color:'#1A1A1A'},metricLabel:{fontFamily:Studently.type.body,fontSize:13,color:'#5E5A55'},
  wallet:{flexDirection:'row',alignItems:'center',gap:14},walletLabel:{flexDirection:'row',alignItems:'center',gap:7},summaryFoot:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:4},
  touch:{minHeight:44,justifyContent:'center'},small:{fontFamily:Studently.type.body,fontSize:14,lineHeight:20,color:'#37332F'},smallBold:{fontFamily:Studently.type.bodySemi,fontSize:14,lineHeight:20,color:'#242321'},typePrice:{fontFamily:Studently.type.body,fontSize:14,lineHeight:20,color:'#625E59'},muted:{fontFamily:Studently.type.body,fontSize:13,lineHeight:19,color:'#625E59'},caption:{fontFamily:Studently.type.body,fontSize:13,lineHeight:18,color:'#6B6460'},textLink:{fontFamily:Studently.type.bodySemi,fontSize:13,color:'#AD2D37'},captionLink:{fontFamily:Studently.type.bodyMedium,fontSize:13,lineHeight:18,color:'#6B6460',textDecorationLine:'underline'},
  toolbarRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center'},searchRowFill:{flex:1,minWidth:360},
  eyebrow:{fontFamily:Studently.type.bodySemi,fontSize:13,letterSpacing:1.6,color:'#6B6460',marginBottom:2},cardStack:{gap:36,paddingBottom:8},cardSection:{gap:10},sectionTitle:{fontFamily:Studently.type.bodySemi,fontSize:17,lineHeight:24,color:'#1A1A1A',letterSpacing:-.2},
  toolbar:{backgroundColor:'#F9FAFB',paddingHorizontal:16,paddingTop:8,paddingBottom:12,gap:10,borderBottomWidth:1,borderBottomColor:'#E4E5E7',zIndex:2},searchRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:10},search:{flex:1,minWidth:140,flexDirection:'row',alignItems:'center',paddingLeft:12,minHeight:44,borderWidth:1,borderColor:'#D9DDE3',borderRadius:8,backgroundColor:'#FFFFFF',gap:8},searchInput:{flex:1,minWidth:0,minHeight:44,paddingVertical:9,paddingRight:8,fontFamily:Studently.type.body,fontSize:15,color:'#1A1A1A'},
  body:{paddingHorizontal:16,paddingTop:16,gap:14},bodyNarrow:{paddingHorizontal:12},notice:{padding:12,borderWidth:1,borderColor:'#D9DDE3',borderRadius:10,backgroundColor:'#FFFFFF',flexDirection:'row',alignItems:'center',gap:9,flexWrap:'wrap'},noticeWarning:{backgroundColor:'#FFFBEB',borderColor:'#F0D59D'},warningText:{color:'#92400E'},error:{color:'#B42318',fontFamily:Studently.type.body,fontSize:13,lineHeight:19},toast:{position:'absolute',bottom:24,left:16,right:16,maxWidth:460,alignSelf:'center',zIndex:100,flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#D9DDE3',paddingLeft:16,borderRadius:12,boxShadow:'0 4px 20px rgba(26,26,26,0.16)'},
  list:{borderWidth:1,borderColor:'#DFE2E6',borderRadius:12,overflow:'hidden',backgroundColor:'#FFFFFF'},compactList:{borderWidth:0,backgroundColor:'transparent',overflow:'visible',gap:22},singleList:{maxWidth:720,width:'100%'},columnHeader:{flexDirection:'row',gap:12,paddingHorizontal:16,paddingVertical:12,backgroundColor:'#FAFAFA',borderBottomWidth:1,borderColor:'#E4E5E7'},columnLabel:{fontFamily:Studently.type.bodySemi,fontSize:12,letterSpacing:.7,color:'#6B6460'},unitColumn:{flex:1,minWidth:220},timeColumn:{width:162,justifyContent:'center',gap:4},availabilityColumn:{width:110,justifyContent:'center'},autoColumn:{width:175,justifyContent:'center',alignItems:'center'},actionColumn:{width:210,justifyContent:'center',alignItems:'center'},
  group:{borderBottomWidth:1,borderColor:'#E4E5E7'},compactGroup:{borderBottomWidth:0,gap:10},groupHeading:{paddingHorizontal:12,paddingVertical:6,backgroundColor:'#F3F4F6',flexDirection:'row',alignItems:'center',gap:8},compactHeading:{backgroundColor:'transparent',paddingHorizontal:2,paddingVertical:2},groupTitleButton:{flex:1,flexDirection:'row',alignItems:'center',gap:8,minHeight:44,minWidth:0},groupTitle:{fontFamily:Studently.type.bodySemi,fontSize:13,color:'#37332F',lineHeight:19},compactGroupTitle:{fontSize:16,lineHeight:22,color:'#1A1A1A'},
  unitRow:{paddingHorizontal:16,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:12,borderTopWidth:1,borderTopColor:'#ECEDEF',minHeight:96},compactRow:{flexDirection:'column',alignItems:'stretch',gap:12,padding:14,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#E1E4E8',borderRadius:14,borderTopColor:'#E1E4E8',minHeight:0},compactIdentity:{flexDirection:'row',alignItems:'flex-start',gap:12,flex:1,minWidth:0},compactFacts:{gap:1},compactPrice:{fontFamily:Studently.type.bodyBold,fontSize:16,lineHeight:22,color:'#1A1A1A',fontVariant:['tabular-nums']},compactPriceUnit:{fontFamily:Studently.type.body,fontSize:13,color:'#625E59'},compactAvailability:{flexShrink:1,alignItems:'flex-end'},compactFooter:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'flex-end',gap:12,marginHorizontal:-14,marginBottom:-14,paddingHorizontal:14,paddingVertical:12,borderTopWidth:1,borderTopColor:'#EDEEF0'},compactAutoSlot:{flexGrow:1,flexShrink:1,flexBasis:150,minWidth:140},compactAuto:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',gap:10},compactAutoLabel:{fontFamily:Studently.type.bodySemi,fontSize:13,lineHeight:18,color:'#242321'},compactAutoHelp:{fontFamily:Studently.type.body,fontSize:13,lineHeight:18,color:'#6B6460'},mediumIdentity:{flex:1,minWidth:240},mediumMeta:{width:156,gap:2},mediumAuto:{width:210},identity:{flexDirection:'row',gap:12,flex:1,minWidth:0,alignItems:'center'},identityCopy:{flex:1,minWidth:0},thumbnail:{width:72,height:72,borderRadius:10,backgroundColor:'#E8EAED'},thumbnailFallback:{width:72,height:72,borderRadius:10,backgroundColor:'#F0F1F3',alignItems:'center',justifyContent:'center'},unitTitle:{fontFamily:Studently.type.bodySemi,fontSize:16,lineHeight:22,color:'#242321'},performance:{minHeight:26,justifyContent:'center',alignSelf:'flex-start'},rowActions:{flexDirection:'row',alignItems:'center',gap:2,justifyContent:'center'},compactTop:{flexDirection:'row',alignItems:'flex-start',gap:8},compactStatus:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8},compactBottom:{flexDirection:'row',alignItems:'center',gap:12},
  status:{flexDirection:'row',alignItems:'center',gap:6,alignSelf:'flex-start',maxWidth:'100%',paddingVertical:4},statusWarning:{backgroundColor:'#FFFBEB',paddingHorizontal:7,borderRadius:6},statusExpired:{backgroundColor:'#FEF3F2',paddingHorizontal:7,borderRadius:6},statusDot:{width:5,height:5,borderRadius:3,flexShrink:0},statusText:{fontFamily:Studently.type.bodyMedium,fontSize:14,lineHeight:20,color:'#37332F',flexShrink:1},
  autoAnchor:{height:28,width:'100%',alignItems:'center'},autoStateBelow:{position:'absolute',top:32,left:0,right:0},autoWrap:{gap:4,alignItems:'center'},autoState:{fontFamily:Studently.type.bodyMedium,fontSize:13,lineHeight:18,color:'#5E5A55',textAlign:'center'},autoHelper:{fontFamily:Studently.type.body,fontSize:13,lineHeight:18,color:'#6B6460',textAlign:'center'},
  draftBadge:{backgroundColor:'#F3F4F6',paddingHorizontal:8,borderRadius:6},draftCaption:{fontFamily:Studently.type.body,fontSize:13,lineHeight:18,color:'#6B6460',marginTop:4},draftCompactActions:{flexDirection:'row',justifyContent:'flex-end',alignItems:'center',gap:2},
  empty:{paddingHorizontal:24,paddingVertical:48,alignItems:'center',gap:14},emptyIcon:{width:60,height:60,borderRadius:18,backgroundColor:'#FDECEE',alignItems:'center',justifyContent:'center'},emptyTitle:{fontFamily:Studently.type.bodySemi,fontSize:21,color:'#242321',textAlign:'center'},emptyDetail:{fontFamily:Studently.type.body,fontSize:14,lineHeight:21,color:'#625E59',textAlign:'center',maxWidth:360},
  scrim:{flex:1,backgroundColor:'rgba(15,23,42,0.34)',justifyContent:'center',alignItems:'center',padding:24},mobileScrim:{justifyContent:'flex-end',paddingHorizontal:0,paddingBottom:0},popoverScrim:{backgroundColor:'transparent',padding:0},
  sheet:{width:'100%',maxWidth:560,maxHeight:'90%',borderRadius:16,backgroundColor:'#FFFFFF',overflow:'hidden',...(Platform.OS==='web'?{boxShadow:'0 0 0 1px rgba(15,23,42,0.06), 0 16px 48px -8px rgba(15,23,42,0.18), 0 4px 12px -2px rgba(15,23,42,0.06)'}:{borderWidth:1,borderColor:'#E1E4E8'})},
  mobileSheet:{maxWidth:'100%',maxHeight:'86%',borderRadius:0,borderTopLeftRadius:20,borderTopRightRadius:20,borderBottomWidth:0},
  popoverSheet:{borderRadius:12,...(Platform.OS==='web'?{boxShadow:'0 0 0 1px rgba(15,23,42,0.08), 0 12px 32px -4px rgba(15,23,42,0.14), 0 4px 10px -2px rgba(15,23,42,0.06)'}:{borderWidth:1,borderColor:'#E1E4E8'})},
  sheetGrabberWrap:{alignItems:'center',paddingTop:10,paddingBottom:2},sheetGrabber:{width:36,height:4,borderRadius:2,backgroundColor:'#D4D6DC'},
  sheetClose:{height:44,alignItems:'flex-end',paddingRight:6,paddingTop:4},sheetCloseMobile:{height:38,paddingRight:8,paddingTop:0},
  sheetContent:{padding:20,paddingTop:0,gap:10},mobileSheetContent:{paddingHorizontal:14,paddingBottom:24,gap:4},popoverScrollContent:{padding:0},
  menuHeader:{paddingHorizontal:12,paddingTop:10,paddingBottom:8,borderBottomWidth:1,borderBottomColor:'#F1F2F4',gap:1},menuHeaderSheet:{paddingHorizontal:4,paddingTop:0,paddingBottom:10,marginBottom:4},
  popoverTitle:{fontFamily:Studently.type.bodySemi,fontSize:12,lineHeight:16,color:'#5E5A55',letterSpacing:0.1},popoverSubtitle:{fontFamily:Studently.type.body,fontSize:12,lineHeight:16,color:'#625E59'},
  popoverList:{padding:5,gap:1},mobileMenuList:{gap:2},popoverDivider:{marginVertical:4,marginHorizontal:6,backgroundColor:'#EFEFEF'},popoverNote:{paddingHorizontal:10,paddingVertical:6},popoverExtra:{paddingHorizontal:10,paddingBottom:10,gap:8},placeConfirm:{gap:10,marginTop:4},
  sheetTitle:{fontFamily:Studently.type.bodySemi,fontSize:19,lineHeight:25,color:'#1A1A1A',letterSpacing:-0.2},paragraph:{fontFamily:Studently.type.body,fontSize:14,lineHeight:21,color:'#37332F'},
  menuItem:{minHeight:46,flexDirection:'row',alignItems:'center',gap:12,borderRadius:10,paddingHorizontal:12,paddingVertical:10},
  menuItemCompact:{minHeight:34,gap:10,borderRadius:8,paddingHorizontal:10,paddingVertical:6},
  menuItemHover:{backgroundColor:'#F3F4F6'},menuItemPressed:{backgroundColor:'#E8EAED'},
  menuItemDangerHover:{backgroundColor:'#FEF2F2'},menuItemDangerPressed:{backgroundColor:'#FEE2E2'},
  menuItemDisabled:{opacity:0.42},menuIcon:{flexShrink:0},
  menuText:{fontFamily:Studently.type.bodyMedium,fontSize:15,lineHeight:20,color:'#242321',flexShrink:1},
  menuTextCompact:{fontSize:13.5,lineHeight:18},menuTextHover:{color:'#111827'},menuTextDanger:{color:'#B42318'},
  separator:{height:1,backgroundColor:'#E8EAED',marginVertical:6},
});

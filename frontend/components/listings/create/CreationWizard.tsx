import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useFonts } from 'expo-font';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { router } from 'expo-router';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, findNodeHandle, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StudentlyAuthModal } from '@/components/auth/StudentlyAuthModal';
import { LButton } from '@/components/lister/Button';
import { PhotoPickerGrid } from '@/components/listings/PhotoPickerGrid';
import { SelectableCard } from './SelectableCard';
import { SegmentedPills } from './SegmentedPills';
import { CreateStepLocation } from './CreateStepLocation';
import { CreateStepAmenities } from './CreateStepAmenities';
import { CreateStepRules } from './CreateStepRules';
import { BuildingAccessFields, CreateStepSpecs } from './CreateStepSpecs';
import { CreateStepPricing } from './CreateStepPricing';
import { CreateStepCopy } from './CreateStepCopy';
import { CreateStepContact } from './CreateStepContact';
import { EnterAnimationContext } from '@/components/lister/Enter';
import { CreateFooter } from './CreateFooter';
import { CreationWizardStage } from './CreationWizardStage';
import { Lister } from '@/constants/listerTheme';
import { Studently } from '@/constants/theme';
import { PROPERTY_TYPE_OPTIONS, PRICE_BASIS_OPTIONS, SPACE_TYPE_OPTIONS } from '@/constants/listingWizard';
import { HOST_CREDITS_PATH, HOST_LISTINGS_PATH } from '@/constants/hostRoutes';
import { useAuthSession } from '@/features/auth/AuthSessionProvider';
import { ListingFormContext, type ListingFormApi } from '@/features/listings/forms/ListingFormContext';
import { fieldErrorMessage } from '@/features/listings/create/validators';
import { formDraft, PLACE_SCREENS, UNIT_SCREENS, screenErrors, unitComplete, type Screen, type Unit } from '@/features/listings/create/v2/model';
import { useCreationWizard, type PublishQuote } from '@/features/listings/create/v2/useCreationWizard';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import { api } from '@/lib/api';
import { eventId } from '@/features/promotions/activity';

const META: Record<Screen, { title: string; subtitle: string; section: number }> = {
  'place-type': { title: 'First, describe the place.', subtitle: 'Add the details every unit shares. You’ll describe each rentable space next.', section: 0 },
  location: { title: 'Where is your place?', subtitle: 'Add the address and campus, then confirm the building’s location.', section: 1 },
  utilities: { title: 'The everyday essentials.', subtitle: 'Power, water and amenities shared by the units in this place.', section: 3 },
  rules: { title: 'Set the house rules.', subtitle: 'Tell students what living here is like. Answer once for the place.', section: 4 },
  'building-photos': { title: 'A first look at the building.', subtitle: 'Optional: add up to 15 photos of the entrance, building or shared spaces. Unit photos come next.', section: 5 },
  layout: { title: 'A space of their own.', subtitle: 'Describe this unit’s layout, size and furnishing.', section: 2 },
  photos: { title: 'Show this unit.', subtitle: 'Add 3–15 photos of this unit. The first photo is its search cover.', section: 5 },
  rent: { title: 'Set the rent and terms.', subtitle: 'What does this unit cost, and when can someone move in?', section: 6 },
  copy: { title: 'Give this unit a story.', subtitle: 'A clear title and a few helpful details make it easier to find the right match.', section: 7 },
  another: { title: 'Add another unit?', subtitle: 'Your place is already described. Add another space or review your units.', section: 9 },
  review: { title: 'One place. Ready to share.', subtitle: 'Check your units, add your contact details once, and publish everything together.', section: 8 },
  success: { title: 'Your listing is published', subtitle: 'Your units are now available for students to find.', section: 9 },
};
const NO_LOCKS = new Set<string>();
function validationMessage(error: string): string {
  if (error === 'contactNumbers' || error.startsWith('contactNumbers.')) return 'Add a valid contact number';
  const unit = /^Unit (\d+): (.*)$/.exec(error);
  return unit ? `Unit ${unit[1]}: ${validationMessage(unit[2])}` : error.includes(' ') ? error : fieldErrorMessage(error);
}
function exit() { router.replace((Platform.OS === 'web' ? HOST_LISTINGS_PATH : '/(poster)/(tabs)') as never); }

export function CreationWizard(props: { draftId?: string; placeId?: string; fresh?: boolean }) {
  const auth = useAuthSession();
  const [authOpen, setAuthOpen] = useState(false);
  const { width } = useWindowDimensions();
  const [fontsLoaded, fontError] = useFonts({ PlayfairDisplay_700Bold });
  useEffect(() => { if (fontError) throw fontError; }, [fontError]);
  if (auth.isLoading || !fontsLoaded) return <View style={s.center}><ActivityIndicator color={Studently.color.primary} accessibilityLabel="Loading your account" /></View>;
  if (!auth.isSignedIn || !auth.session) return <View style={s.root}>
    <View style={[s.header, width < 600 && s.headerStacked]}><Text style={s.brandText}>studently<Text style={s.brandDot}>.</Text></Text></View>
    <CreationWizardStage screen="place-type"><View style={[s.formCard, width < 1024 && s.formStacked, width < 600 && s.formNarrow]}>
      <Text style={s.eyebrow}>Your place, together</Text><Text style={[s.title, width < 1024 && s.titleCompact, width < 600 && s.titleNarrow]}>A place for their next chapter.</Text>
      <Text style={s.intro}>Sign in to save your place and units, then pick up from any device.</Text>
      <LButton label="Sign in to continue" onPress={() => setAuthOpen(true)} style={s.primary} />
      <Link label="Back to Studently" onPress={() => router.replace('/' as never)} />
    </View></CreationWizardStage>
    <StudentlyAuthModal visible={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => setAuthOpen(false)} title="Sign in to list your place" />
  </View>;
  return <Wizard key={auth.session.userId} userId={auth.session.userId} {...props} />;
}

function Wizard(props: { userId: string; draftId?: string; placeId?: string; fresh?: boolean }) {
  const flow = useCreationWizard(props);
  const { state, record, send, persist, saveState } = flow;
  const [showValidation, setShowValidation] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const heading = useRef<Text>(null);
  const content = useRef<ScrollView>(null);
  const progress = useRef<ScrollView>(null);
  const progressPositions = useRef<Record<string, number>>({});
  const fields = useRef<View>(null);
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const narrow = width < 600;
  const split = width >= (Platform.OS === 'web' ? 1024 : 768);
  const insets = useSafeAreaInsets();
  const screen = state?.position.screen ?? 'place-type';
  const activeId = state?.position.unitId ?? '';
  const progressKey = screen === 'review' || screen === 'success' ? 'review' : PLACE_SCREENS.includes(screen as typeof PLACE_SCREENS[number]) ? 'place' : activeId;
  const progressLayout = (key: string, x: number) => {
    progressPositions.current[key] = x;
    if (key === progressKey) progress.current?.scrollTo({ x: Math.max(0, x - 90), animated: !reduced });
  };
  useEffect(() => {
    const x = progressPositions.current[progressKey];
    if (x !== undefined) progress.current?.scrollTo({ x: Math.max(0, x - 90), animated: !reduced });
  }, [progressKey, reduced]);
  const fieldsLocked = flow.publishing || Boolean(state?.pendingAttempt) || record?.status === 'published';
  useEffect(() => { if (Platform.OS === 'web' && fields.current) (fields.current as unknown as HTMLElement).inert = fieldsLocked; }, [fieldsLocked, screen]);
  const quote = useQuery({ queryKey: ['publish-quote', props.userId, state?.units.length],
    enabled: Boolean(state?.units.length && screen === 'review' && record?.status === 'active'), retry: false, staleTime: 0,
    queryFn: async (): Promise<PublishQuote> => (await api.get('/api/listings/publish-quote', { params: { count: state!.units.length } })).data.data });
  useLayoutEffect(() => {
    setShowValidation(false); setRemoveId(null); Keyboard.dismiss(); content.current?.scrollTo({ y: 0, animated: false });
    if (Platform.OS === 'web') {
      const target = heading.current as unknown as HTMLElement | null;
      if (target) { target.style.outline = 'none'; target.focus({ preventScroll: true }); }
    } else {
      const handle = findNodeHandle(heading.current); if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
    }
  }, [screen, activeId, Boolean(state)]);
  useEffect(() => {
    if (!removeId || Platform.OS !== 'web') return;
    const previous = document.activeElement as HTMLElement | null;
    const elements = () => Array.from(document.querySelectorAll<HTMLElement>('[data-testid="remove-unit-dialog"] [role="button"]'));
    const timer = setTimeout(() => elements()[0]?.focus(), 50);
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRemoveId(null);
      if (e.key === 'Tab') { const list = elements(); const first = list[0], last = list.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } }
    };
    document.addEventListener('keydown', handler);
    return () => { clearTimeout(timer); document.removeEventListener('keydown', handler); previous?.focus(); };
  }, [removeId]);
  if (flow.loadError) return <View style={s.center}><Text accessibilityRole="alert" style={s.errorText}>{flow.loadError}</Text><LButton label="Retry loading draft" onPress={flow.retryLoad} /><Link label="Back to your listings" onPress={exit} /></View>;
  if (!state || !record) return <View style={s.center}><ActivityIndicator color={Studently.color.primary} accessibilityLabel="Loading your draft" /></View>;
  const meta = META[screen];
  const index = state.units.findIndex(u => u.id === activeId);
  const isPlace = PLACE_SCREENS.includes(screen as typeof PLACE_SCREENS[number]);
  const isUnit = UNIT_SCREENS.includes(screen as typeof UNIT_SCREENS[number]);
  const locked = flow.publishing || Boolean(state.pendingAttempt) || record.status !== 'active';
  const draft = { ...formDraft(state), step: meta.section };
  const errors = screenErrors(state);
  const patch: ListingFormApi['patch'] = values => send(isPlace ? { type: 'place', patch: values } : screen === 'review' ? { type: 'contact', patch: values } : { type: 'unit', id: activeId, patch: values });
  const setPhotos: ListingFormApi['setPhotos'] = update => send({ type: 'gallery', id: activeId, update });
  const saveExit = async () => { try { await persist(); exit(); } catch { /* Keep the form open with its save error and Retry. */ } };
  const next = () => { setShowValidation(true); if (!errors.length) send({ type: 'next' }); return !errors.length; };
  const form: ListingFormApi = { draft, committedStep: -1, patch, setPhotos, setStep: () => {}, goNext: next, goBack: () => send({ type: 'back' }),
    saveAndExit: saveExit, reset: async () => {}, showValidation, fieldErrors: errors, fieldInvalid: f => showValidation && errors.includes(f), setShowValidation,
    formChrome: 'wizard', lockedFields: NO_LOCKS, isLocked: () => false };
  const quoteReady = quote.data && quote.data.units.length === state.units.length;
  const afford = quoteReady && quote.data!.balance >= quote.data!.total;
  const add = (copyFrom?: string) => send({ type: 'add', id: eventId(), copyFrom });
  const buyCredits = async () => { try { await persist(); router.push({ pathname: (Platform.OS === 'web' ? HOST_CREDITS_PATH : '/(poster)/(tabs)/credits') as never, params: { returnTo: `/create?draftId=${record.id}` } }); } catch {} };
  const rows = (editable = false) => <View accessibilityLabel={editable ? 'Units to review' : 'Units added so far'} style={s.unitList}>
    {state.units.map((u, i) => <UnitRow key={u.id} unit={u} index={i} complete={unitComplete(state, u)} narrow={narrow}
      credits={screen === 'success' ? record.result?.credits[i] : screen === 'review' && quoteReady ? quote.data!.units[i].credits : undefined}
      onEdit={editable && !locked ? () => send({ type: 'editUnit', id: u.id }) : undefined} onRemove={editable && !locked ? () => setRemoveId(u.id) : undefined} />)}
  </View>;
  const goPublish = () => { setShowValidation(true); if (!errors.length && (quote.data || state.pendingAttempt)) void flow.publish(quote.data ?? { units: [], total: 0, balance: 0 }); };
  const progressControl = <View testID="wizard-progress" style={[s.progressWrap, split && s.progressDesktop]}><ScrollView horizontal ref={progress} showsHorizontalScrollIndicator={false} accessibilityLabel="Wizard progress" contentContainerStyle={s.progress}>
        <Phase label={state.place.id ? 'Place · existing' : 'Place'} current={isPlace} complete={state.completedPlace.length === 5} disabled={locked || Boolean(state.place.id) || isPlace || state.completedPlace.length !== 5} onPress={() => send({ type: 'editPlace' })} onLayout={x => progressLayout('place', x)} />
        {state.units.map((u, i) => <Phase key={u.id} label={`Unit ${i + 1}`} current={!isPlace && activeId === u.id && screen !== 'review' && screen !== 'success'} complete={unitComplete(state, u)}
          disabled={locked || state.completedPlace.length !== 5 || (activeId === u.id && isUnit)} onPress={() => send({ type: 'editUnit', id: u.id })}
          onLayout={x => progressLayout(u.id, x)} />)}
        <Phase label="Review" current={screen === 'review' || screen === 'success'} complete={record.status === 'published'} disabled={locked || !state.reviewVisited || screen === 'review'} onPress={() => send({ type: 'review' })} onLayout={x => progressLayout('review', x)} />
      </ScrollView></View>;
  const footerLabel = screen === 'success' ? 'Your listings' : screen === 'review' ? flow.publishing ? 'Publishing…' : state.pendingAttempt ? 'Retry publishing' : state.units.length > 1 ? 'Publish all' : 'Publish' : screen === 'another' ? 'Done — review units' : screen === 'copy' ? state.returnTo ? 'Save unit' : 'Finish unit' : screen === 'building-photos' && !state.place.photos.length ? 'Skip for now' : 'Next';
  const footerAction = () => {
    if (screen === 'success') exit();
    else if (screen === 'review') goPublish();
    else if (screen === 'another') { setShowValidation(true); if (state.units.every(u => unitComplete(state, u))) send({ type: 'review' }); }
    else next();
  };
  return <ListingFormContext.Provider value={form}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.root, { paddingTop: insets.top }]} testID="creation-wizard">
      <View style={[s.header, !split && s.headerStacked]} testID="wizard-header">
        <View style={[s.headerSide, !split && s.headerSideMobile]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Save & exit" onPress={() => void saveExit()} style={[s.saveExit, !split && s.saveExitPill]}><Text style={[s.saveExitText, !split && s.saveExitPillText]}>Save & exit</Text></Pressable>
        </View>
        {split ? <View style={s.headerProgress}>{progressControl}</View> : null}
        <View style={[s.headerSide, s.saveActions, !split && s.headerStatusMobile]}>
          <Text accessibilityLiveRegion="polite" role="status" style={[s.saveLabel, saveState === 'error' && s.errorText]}>{saveState === 'saved' ? 'Saved' : saveState === 'saving' ? 'Saving…' : 'Couldn’t save'}</Text>
          {saveState === 'error' ? <Link label="Retry" onPress={() => { void persist().catch(() => {}); }} /> : null}
        </View>
      </View>
      {flow.changedElsewhere && screen !== 'success' ? <View style={s.notice} accessibilityRole="alert"><Text style={s.noticeText}>Updated on another device. Reload?</Text><Link label="Reload" onPress={() => void flow.reload()} /><Link label="Dismiss" onPress={flow.dismissNotice} /></View> : null}
      <CreationWizardStage screen={screen} unitId={activeId} placeName={state.place.data.buildingName} unitCount={state.units.length} scrollRef={content}>
        <EnterAnimationContext.Provider value={false}><Animated.View key={`${screen}:${activeId}`} entering={reduced ? undefined : FadeIn.duration(160)} style={[s.formCard, screen === 'review' && s.reviewCard, !split && s.formStacked, narrow && s.formNarrow]} testID={`screen-${screen}`}>
          <Text style={s.eyebrow}>{isPlace ? `Place · ${PLACE_SCREENS.indexOf(screen as typeof PLACE_SCREENS[number]) + 1} of 5` : isUnit ? `Unit ${index + 1} · ${UNIT_SCREENS.indexOf(screen as typeof UNIT_SCREENS[number]) + 1} of 4` : screen === 'another' ? `${state.units.length} ${state.units.length === 1 ? 'unit' : 'units'} added` : 'Your place, together'}</Text>
          <Text ref={heading} accessibilityRole="header" tabIndex={-1} style={[s.title, !split && s.titleCompact, narrow && s.titleNarrow]}>{screen === 'success' && state.units.length > 1 ? 'Your listings are published' : meta.title}</Text>
          <Text style={s.intro}>{meta.subtitle}</Text>
          {state.place.id && screen !== 'success' ? <View style={s.placeContext}><Ionicons name="business-outline" size={20} color={Studently.color.inkMuted} /><View style={s.flex}><Text style={s.sectionLabel}>{state.place.data.buildingName || 'Existing place'}</Text><Text style={s.helper}>{state.place.data.area} · Shared place details already saved</Text></View></View> : null}
          <View ref={fields} pointerEvents={locked && screen !== 'success' ? 'none' : 'auto'} accessibilityElementsHidden={locked} importantForAccessibility={locked ? 'no-hide-descendants' : 'auto'} style={locked && screen !== 'success' ? s.locked : undefined}>
            {screen === 'place-type' ? <View style={s.fields}><SelectableCard title="An apartment" body="A whole apartment, or rooms and beds within it." icon="home-outline" selected={state.place.kind === 'apartment'} onPress={() => send({ type: 'kind', kind: 'apartment' })} /><SelectableCard title="A building" body="Whole apartments that share one building." icon="business-outline" selected={state.place.kind === 'building'} onPress={() => send({ type: 'kind', kind: 'building' })} /></View> : null}
            {screen === 'location' ? <CreateStepLocation /> : null}
            {screen === 'utilities' ? <><BuildingAccessFields /><View style={s.spacer} /><CreateStepAmenities /></> : null}
            {screen === 'rules' ? <CreateStepRules sharedOnly /> : null}
            {screen === 'building-photos' ? <PhotoPickerGrid shared photos={state.place.photos} setPhotos={update => send({ type: 'gallery', id: 'place', update })} /> : null}
            {screen === 'layout' ? <View style={s.fields}><Text style={s.sectionLabel}>Rental type</Text>
              {SPACE_TYPE_OPTIONS.filter(o => state.place.kind !== 'building' || o.value === 'entire_place').map(o => <SelectableCard key={o.value} title={o.title} body={o.body} icon={o.icon} selected={draft.spaceType === o.value} onPress={() => patch({ spaceType: o.value, priceBasis: o.value === 'shared_room' ? 'per_bed_month' : o.value === 'private_room' ? 'per_room_month' : 'per_unit_month' })} />)}
              <Text style={s.sectionLabel}>Property type</Text><SegmentedPills options={PROPERTY_TYPE_OPTIONS} value={draft.propertyType} error={form.fieldInvalid('propertyType')} onChange={v => patch({ propertyType: v as typeof draft.propertyType })} /><CreateStepSpecs showSharedDetails={false} /></View> : null}
            {screen === 'photos' ? <PhotoPickerGrid photos={draft.photos} setPhotos={setPhotos} /> : null}
            {screen === 'rent' ? <View style={s.fields}><Text style={s.sectionLabel}>How is rent listed?</Text><SegmentedPills options={PRICE_BASIS_OPTIONS} value={draft.priceBasis} onChange={v => patch({ priceBasis: v as typeof draft.priceBasis })} /><CreateStepPricing /></View> : null}
            {screen === 'copy' ? <CreateStepCopy /> : null}
            {screen === 'another' ? <><Text style={s.sectionTitle}>Your units so far</Text>{rows()}<View style={s.options}>
              <Choice title="Copy this unit" detail="Keep layout, rent and writing. Add new photos." icon="copy-outline" disabled={state.units.length >= 20} onPress={() => add(activeId)} />
              <Choice title="Start blank" detail="Add a different unit with fresh details." icon="add-outline" disabled={state.units.length >= 20} onPress={() => add()} />
            </View>{state.units.length >= 20 ? <Text style={s.helper}>You’ve reached the limit of 20 units in this batch.</Text> : null}</> : null}
            {screen === 'review' ? <>{state.units.length ? rows(true) : <Text style={s.empty}>No units yet. Add a unit to continue.</Text>}<Link label="+ Add another unit" disabled={state.units.length >= 20} onPress={() => add()} /><View style={s.contact}><Text style={s.sectionTitle}>One contact for every unit</Text><CreateStepContact /></View></> : null}
          </View>
          {screen === 'review' ? <View style={s.cost} accessibilityLabel="Credit total"><Text style={s.sectionTitle}>Publishing cost</Text>
            {!state.units.length ? <Text style={s.helper}>Add a unit to see the total.</Text> : quote.isError ? <><Text accessibilityRole="alert" style={s.errorText}>Couldn’t load the credit total.</Text><Link label="Retry credit total" onPress={() => void quote.refetch()} /></> : quoteReady ? <><View style={s.totalRow}><Text style={s.body}>Total for {state.units.length} {state.units.length === 1 ? 'unit' : 'units'}</Text><Text style={s.total}>{quote.data!.total} {quote.data!.total === 1 ? 'credit' : 'credits'}</Text></View><Text style={s.helper}>Your balance: {quote.data!.balance} credits. All units publish together.</Text>{!afford ? <><Text accessibilityRole="alert" style={s.errorText}>You need more credits to publish this batch.</Text><Link label="Buy credits" onPress={() => void buyCredits()} /></> : null}</> : <Text role="status" style={s.helper}>Checking credit total…</Text>}
          </View> : null}
          {screen === 'success' ? <><View style={s.success}><Ionicons name="checkmark-circle-outline" size={44} color={Studently.color.primary} /><Text style={s.sectionTitle}>{record.result?.listingIds.length} {state.units.length === 1 ? 'unit' : 'units'} published</Text><Text style={s.body}>{record.result?.total} {record.result?.total === 1 ? 'credit' : 'credits'} used</Text></View>{rows()}{state.units.length === 1 && record.result ? <Link label="Promote your listing" onPress={() => router.push({ pathname: '/hosting/listing/[id]/promote', params: { id: record.result!.listingIds[0], published: '1' } })} /> : null}</> : null}
          {flow.publishError ? <View style={s.errors} accessibilityRole="alert"><Text style={s.errorText}>{flow.publishError}</Text></View> : null}
          {state.pendingAttempt && !flow.publishing && screen !== 'success' ? <Text style={s.helper}>Publishing hasn’t been confirmed yet. Retry safely to check before making changes.</Text> : null}
          {showValidation && errors.length ? <View style={s.errors} accessibilityRole="alert"><Text style={s.sectionLabel}>Check these details to continue</Text>{[...new Set(errors)].map(e => <Text key={e} style={s.errorText}>• {validationMessage(e)}</Text>)}{screen === 'review' ? state.units.filter(u => !unitComplete(state, u)).map((u,i) => <Link key={u.id} label={`Complete ${u.data.title || `unit ${i + 1}`}`} onPress={() => send({ type: 'editUnit', id: u.id })} />) : null}</View> : null}
        </Animated.View></EnterAnimationContext.Provider>
      </CreationWizardStage>
      <View style={{ paddingBottom: insets.bottom, backgroundColor: Lister.color.surface }}>
        {!split ? <View style={s.footerProgress}>{progressControl}</View> : null}
        <CreateFooter borderless={!split} hideBack={screen === 'place-type' || screen === 'success' || (screen === 'layout' && Boolean(state.place.id) && index === 0 && !state.returnTo)} onBack={form.goBack}
          nextLabel={footerLabel} onNext={footerAction} nextLoading={screen === 'review' && flow.publishing}
          nextDisabled={screen === 'success' ? false : screen === 'review' ? !state.pendingAttempt && (!quoteReady || !afford || quote.isError) : locked} />
      </View>
      <Modal visible={Boolean(removeId)} transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={() => setRemoveId(null)}>
        <View style={s.scrim}><View style={s.dialog} role="dialog" accessibilityViewIsModal accessibilityLabel="Remove unit" testID="remove-unit-dialog"><Text style={s.sectionTitle}>Remove this unit?</Text><Text style={s.body}>“{state.units.find(u => u.id === removeId)?.data.title || 'Untitled unit'}” will be removed from this draft.</Text><View style={s.dialogButtons}><Link label="Keep unit" onPress={() => setRemoveId(null)} /><LButton label="Remove unit" variant="danger" onPress={() => { if (removeId) send({ type: 'remove', id: removeId }); setRemoveId(null); }} style={s.primary} /></View></View></View>
      </Modal>
    </KeyboardAvoidingView>
  </ListingFormContext.Provider>;
}

function Link({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[s.link, disabled && s.locked]}><Text style={s.linkText}>{label}</Text></Pressable>;
}
function Phase({ label, current, complete, disabled, onPress, onLayout }: { label: string; current: boolean; complete: boolean; disabled: boolean; onPress: () => void; onLayout?: (x: number) => void }) {
  const { width } = useWindowDimensions();
  const footer = width < (Platform.OS === 'web' ? 1024 : 768);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: current, disabled }} disabled={disabled} onPress={onPress} onLayout={e => onLayout?.(e.nativeEvent.layout.x)} style={s.phase}><View style={[s.phaseTick, complete && s.phaseTickDone, current && s.phaseTickCurrent, footer && s.footerTick, footer && (complete || current) && s.footerTickDone]} /><Text style={[s.phaseText, current && s.activePhaseText]}>{label}</Text></Pressable>;
}
function Choice({ title, detail, icon, disabled, onPress }: { title: string; detail: string; icon: keyof typeof Ionicons.glyphMap; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.choice, pressed && s.selectedChoice, disabled && s.locked]}><Ionicons name={icon} size={24} color={Studently.color.primary} /><Text style={s.sectionLabel}>{title}</Text><Text style={s.helper}>{detail}</Text></Pressable>;
}
function UnitRow({ unit, index, complete, credits, narrow, onEdit, onRemove }: { unit: Unit; index: number; complete: boolean; credits?: number; narrow: boolean; onEdit?: () => void; onRemove?: () => void }) {
  const photo = unit.data.photos?.[0];
  const basis = unit.data.priceBasis === 'per_bed_month' ? 'bed / month' : unit.data.priceBasis === 'per_room_month' ? 'room / month' : 'month';
  return <View style={s.unitRow} testID="creation-unit-row">{photo ? <Image source={{ uri: resolveMediaUrl(photo.url || photo.uri) ?? photo.uri }} style={[s.thumbnail, narrow && s.thumbnailNarrow]} contentFit="cover" accessibilityLabel={`Unit ${index + 1} cover`} /> : <View style={s.photoEmpty}><Ionicons name="image-outline" size={24} color={Studently.color.inkMuted} /></View>}
    <View style={s.flex}><Text style={s.helper}>Unit {index + 1}{!complete ? ' · needs details' : ''}</Text><Text style={s.unitTitle}>{unit.data.title || 'Untitled unit'}</Text><Text style={s.body}>{unit.data.monthlyRentUsd ? `$${unit.data.monthlyRentUsd}` : 'Add rent'} <Text style={s.helper}>/ {basis}</Text></Text>{credits !== undefined ? <Text style={s.helper}>{credits} {credits === 1 ? 'credit' : 'credits'}</Text> : null}</View>
    {onEdit ? <View><Link label={`Edit unit ${index + 1}`} onPress={onEdit} /><Link label={`Remove unit ${index + 1}`} onPress={onRemove!} /></View> : null}
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF', ...(Platform.OS === 'web' ? { height: '100dvh' as unknown as number, overflow: 'hidden' } : {}) },
  center: { flex: 1, minHeight: 400, padding: 32, gap: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Platform.OS === 'web' ? 32 : 24, paddingTop: Platform.OS === 'web' ? 20 : 0, paddingBottom: 12, gap: 16, backgroundColor: Lister.color.surface }, headerStacked: { paddingTop: 12, paddingBottom: 12 },
  brandText: { fontFamily: Studently.type.bodyBold, fontSize: 29, letterSpacing: -1.3, color: '#242321' }, brandDot: { color: '#EA3F4A' },
  headerSide: { width: 160, minHeight: 44, justifyContent: 'center', alignItems: 'flex-start' }, headerSideMobile: { width: undefined }, headerStatusMobile: { width: undefined, flex: 1, minWidth: 0 }, headerProgress: { flex: 1, minWidth: 0, flexDirection: 'row', justifyContent: 'center' },
  saveActions: { flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'flex-end' }, saveLabel: { fontFamily: Studently.type.body, fontSize: 12, lineHeight: 20, width: 88, textAlign: 'right', color: '#6B6460' },
  saveExit: { paddingVertical: 10, paddingHorizontal: 4, cursor: 'pointer' }, saveExitText: { fontFamily: Lister.type.bodySemi, fontSize: 15, lineHeight: 20, color: Lister.color.ink, textDecorationLine: 'underline' },
  saveExitPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24, borderWidth: 1, borderColor: '#B0B0B0', backgroundColor: Lister.color.surface }, saveExitPillText: { fontSize: 14, textDecorationLine: 'none' },
  progressWrap: { flex: 1, minWidth: 0 }, progressDesktop: { maxWidth: 720 }, progress: { flexGrow: 1, gap: 5 }, footerProgress: { paddingHorizontal: 24, paddingTop: 12 },
  phase: { flex: 1, minWidth: 68, minHeight: 44, justifyContent: 'center' }, phaseTick: { position: 'absolute', top: 2, left: 0, height: 3, borderRadius: 2, backgroundColor: Lister.color.border, width: '100%' }, phaseTickDone: { backgroundColor: Lister.color.primary }, phaseTickCurrent: { backgroundColor: Lister.color.primaryDeep },
  footerTick: { height: 2, borderRadius: 1, backgroundColor: '#DDDDDD' }, footerTickDone: { backgroundColor: '#222222' },
  phaseText: { fontFamily: Studently.type.body, fontSize: 12, lineHeight: 20, color: '#6B6460', textAlign: 'center' }, activePhaseText: { fontFamily: Studently.type.bodySemi, color: Lister.color.ink },
  formCard: { width: '100%', maxWidth: 640, paddingHorizontal: Platform.OS === 'web' ? 48 : 28, paddingTop: 48, paddingBottom: 64, alignSelf: 'flex-start' }, reviewCard: { maxWidth: 900 }, formStacked: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 48 }, formNarrow: { paddingHorizontal: 24, paddingTop: 8 },
  eyebrow: { fontFamily: Studently.type.bodySemi, fontSize: 11, lineHeight: 18, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6B6460', marginBottom: 14 },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 42, lineHeight: 50, letterSpacing: -.8, color: '#242321', maxWidth: 560 }, titleCompact: { fontSize: 36, lineHeight: 43 }, titleNarrow: { fontSize: 32, lineHeight: 39 }, intro: { fontFamily: Studently.type.body, fontSize: 16, lineHeight: 25, color: '#6B6460', marginTop: 16, marginBottom: 32, maxWidth: 530 },
  sectionTitle: { fontFamily: Studently.type.bodySemi, fontSize: 20, lineHeight: 27, color: '#242321', marginBottom: 16 }, sectionLabel: { fontFamily: Studently.type.bodySemi, fontSize: 16, lineHeight: 22, color: '#242321' },
  body: { fontFamily: Studently.type.body, fontSize: 14, lineHeight: 22, color: '#37332F' }, helper: { fontFamily: Studently.type.body, fontSize: 13, lineHeight: 19, color: '#625E59' }, fields: { gap: 18 }, spacer: { height: 20 }, flex: { flex: 1, minWidth: 0 },
  placeContext: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderWidth: 1, borderColor: '#E4E5E7', borderRadius: 8, backgroundColor: '#F9FAFB', marginBottom: 24 },
  unitList: { borderTopWidth: 1, borderTopColor: '#E4E5E7' }, unitRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#E4E5E7' },
  thumbnail: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#F3F4F6' }, thumbnailNarrow: { width: 52, height: 62 }, photoEmpty: { width: 52, height: 62, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }, unitTitle: { fontFamily: Studently.type.bodySemi, fontSize: 16, lineHeight: 22, color: '#242321', marginVertical: 3 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 24 }, choice: { flex: 1, minWidth: 125, gap: 10, padding: 18, borderWidth: 1, borderColor: '#DED7D2', borderRadius: 12, backgroundColor: '#FFFFFF', cursor: 'pointer' }, selectedChoice: { borderColor: '#EA3F4A', backgroundColor: '#FDECEE' },
  contact: { borderTopWidth: 1, borderTopColor: '#E4E5E7', marginTop: 24, paddingTop: 28 }, cost: { marginTop: 28, padding: 20, gap: 10, borderWidth: 1, borderColor: '#E4E5E7', borderRadius: 8, backgroundColor: '#F9FAFB' }, totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, total: { fontFamily: Studently.type.bodyBold, fontSize: 18, color: '#1A1A1A' },
  primary: { minHeight: 52, borderRadius: 8, minWidth: 100, paddingHorizontal: 24 },
  link: { minHeight: 44, justifyContent: 'center', cursor: 'pointer' }, linkText: { fontFamily: Studently.type.bodySemi, fontSize: 14, color: '#242321', textDecorationLine: 'underline' }, locked: { opacity: .55 },
  notice: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingHorizontal: 20, gap: 18, backgroundColor: '#FFFBEB', borderBottomWidth: 1, borderBottomColor: '#F0D59D' }, noticeText: { fontFamily: Studently.type.body, fontSize: 13, color: '#92400E' },
  errors: { marginTop: 24, padding: 16, borderRadius: 8, backgroundColor: '#FEF3F2', borderWidth: 1, borderColor: '#F1C5C0', gap: 6 }, errorText: { fontFamily: Studently.type.body, fontSize: 13, lineHeight: 20, color: '#B42318' },
  empty: { paddingVertical: 24, fontFamily: Studently.type.body, fontSize: 14, color: '#625E59' }, success: { padding: 24, gap: 8, alignItems: 'center', backgroundColor: '#FDECEE', borderRadius: 8, marginBottom: 24 },
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(26,26,26,.4)', padding: 24 }, dialog: { width: '100%', maxWidth: 440, padding: 24, backgroundColor: '#FFFFFF', borderRadius: 12, gap: 16 }, dialogButtons: { flexDirection: 'row', gap: 24, justifyContent: 'space-between', alignItems: 'center' },
});

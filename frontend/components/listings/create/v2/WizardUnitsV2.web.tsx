import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { LButton } from '@/components/lister/Button';
import { LText } from '@/components/lister/Typography';
import { PhotoPickerGrid } from '@/components/listings/PhotoPickerGrid';
import { SelectableCard } from '../SelectableCard';
import { SegmentedPills } from '../SegmentedPills';
import { CreateStepLocation } from '../CreateStepLocation';
import { CreateStepAmenities } from '../CreateStepAmenities';
import { CreateStepRules } from '../CreateStepRules';
import { BuildingAccessFields, CreateStepSpecs } from '../CreateStepSpecs';
import { CreateStepPricing } from '../CreateStepPricing';
import { CreateStepCopy } from '../CreateStepCopy';
import { CreateStepContact } from '../CreateStepContact';
import { WizardLottie } from '../WizardLottie';
import { Lister } from '@/constants/listerTheme';
import { PROPERTY_TYPE_OPTIONS, PRICE_BASIS_OPTIONS, SPACE_TYPE_OPTIONS } from '@/constants/listingWizard';
import { HOST_LISTINGS_PATH } from '@/constants/hostRoutes';
import { useAuthSession } from '@/features/auth/AuthSessionProvider';
import { CreateListingContext, type ListingFormApi } from '@/features/listings/create/CreateListingProvider';
import { fieldErrorMessage } from '@/features/listings/create/validators';
import { examplePhotos, type Example } from '@/features/listings/create/v2/examples';
import { formDraft, PLACE_SCREENS, UNIT_SCREENS, screenErrors, unitComplete, unitErrors,
  type Screen, type Unit } from '@/features/listings/create/v2/model';
import { useWizardV2 } from '@/features/listings/create/v2/useWizardV2';
import type { PublishQuote } from '@/features/listings/create/usePublishListingDraft';
import type { WizardStepId } from '@/lib/wizardLottieFrame';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { api } from '@/lib/api';
import './wizard-v2.css';

const META: Record<Screen, { title: string; sub: string; art: WizardStepId; legacy: number }> = {
  'place-type': { title: 'First, describe the place.', sub: 'Add the details every unit shares. You’ll describe each rentable space next.', art: 'type', legacy: 0 },
  location: { title: 'Where is your place?', sub: 'One location for the building and every unit you add.', art: 'location', legacy: 1 },
  utilities: { title: 'The everyday essentials.', sub: 'Power, water and amenities shared by the units in this place.', art: 'utilities', legacy: 3 },
  rules: { title: 'Set the house rules.', sub: 'Tell students what living here is like. Answer once for the place.', art: 'rules', legacy: 4 },
  'building-photos': { title: 'A first look at the building.', sub: 'Optional: add up to 15 photos of the entrance, building or shared spaces. Unit photos come next.', art: 'photos', legacy: 5 },
  layout: { title: 'A space of their own.', sub: 'Describe this unit’s layout, size and furnishing.', art: 'specs', legacy: 2 },
  photos: { title: 'Show this unit.', sub: 'Add 3–15 photos of this unit. The first photo is its search cover.', art: 'photos', legacy: 5 },
  rent: { title: 'Set the rent and terms.', sub: 'What does this unit cost, and when can someone move in?', art: 'pricing', legacy: 6 },
  copy: { title: 'Give this unit a story.', sub: 'A clear title and a few helpful details make it easier to find the right match.', art: 'copy', legacy: 7 },
  another: { title: 'Add another unit?', sub: 'Your place is already described. Add another space, or review what you have.', art: 'review', legacy: 9 },
  review: { title: 'One place. Ready to share.', sub: 'Check your units, add your contact details once, and publish everything together.', art: 'review', legacy: 8 },
  success: { title: 'Your units are ready.', sub: 'This was a prototype publish. No listings were created and no credits were spent.', art: 'review', legacy: 9 },
};
const NO_LOCKS = new Set<string>();
function validationMessage(error: string): string {
  if (error === 'contactNumbers' || error.startsWith('contactNumbers.')) return 'Add a valid contact number';
  const unit = /^Unit (\d+): (.*)$/.exec(error);
  if (unit) return `Unit ${unit[1]}: ${validationMessage(unit[2])}`;
  return error.includes(' ') ? error : fieldErrorMessage(error);
}

export function WizardUnitsV2(props: { placeId?: string; fresh?: boolean; example?: string }) {
  const auth = useAuthSession();
  if (auth.isLoading) return <div className="v2-loading">Loading your draft…</div>;
  const example = ['one', 'three', 'existing'].includes(props.example ?? '') ? props.example as Example : undefined;
  return <Wizard key={`${auth.session?.userId ?? 'guest'}:${props.placeId ?? ''}:${example ?? ''}`} userId={auth.session?.userId ?? null}
    placeId={props.placeId} fresh={props.fresh ?? false} example={example} />;
}

function Wizard({ userId, placeId, fresh, example }: { userId: string | null; placeId?: string; fresh: boolean; example?: Example }) {
  const { state, send, persist, saveState, loadError, retryLoad } = useWizardV2({ userId, placeId, fresh, example });
  const [showValidation, setShowValidation] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const screen = state?.position.screen ?? 'place-type';
  const activeId = state?.position.unitId ?? '';
  const quote = useQuery({ queryKey: ['wizard-units-v2', 'quote', userId, state?.units.length, example],
    enabled: Boolean(state && state.units.length && screen === 'review'), retry: false,
    queryFn: async (): Promise<PublishQuote> => {
      if (example) {
        const units = state!.units.map((_, index) => ({ index, credits: index === 0 ? 0 : 1 }));
        return { units, total: units.reduce((sum, u) => sum + u.credits, 0), balance: 20 };
      }
      const { data } = await api.get('/api/listings/publish-quote', { params: { count: state!.units.length } });
      return data.data;
    } });

  useEffect(() => {
    setShowValidation(false);
    setRemoveId(null);
    heading.current?.focus({ preventScroll: true });
    scroller.current?.scrollTo({ top: 0 });
    stage.current?.scrollTo({ top: 0 });
  }, [screen, activeId, Boolean(state)]);
  useEffect(() => { if (state && fresh) router.setParams({ new: undefined }); }, [Boolean(state), fresh]);

  if (loadError) return <div className="v2-loading" role="alert"><h1>We couldn’t open this draft.</h1><p>{loadError}</p>
    <LButton label="Retry loading draft" onPress={retryLoad} /><LButton label="Return to dashboard" variant="ghost" onPress={() => router.replace(HOST_LISTINGS_PATH as never)} /></div>;
  if (!state) return <div className="v2-loading">Loading your draft…</div>;

  const meta = META[screen];
  const draft = { ...formDraft(state), step: meta.legacy };
  const index = state.units.findIndex(u => u.id === activeId);
  const isPlace = PLACE_SCREENS.includes(screen as typeof PLACE_SCREENS[number]);
  const isUnit = UNIT_SCREENS.includes(screen as typeof UNIT_SCREENS[number]);
  const errors = screenErrors(state);
  const scope = isPlace ? 'place' : screen === 'review' ? 'contact' : 'unit';
  const patch: ListingFormApi['patch'] = values => send(scope === 'unit' ? { type: 'unit', id: activeId, patch: values } : { type: scope, patch: values });
  const setPhotos: ListingFormApi['setPhotos'] = update => send({ type: 'gallery', id: activeId, update });
  const form: ListingFormApi = {
    draft, committedStep: -1, patch, setPhotos, setStep: () => {},
    goNext: () => { setShowValidation(true); if (errors.length) return false; send({ type: 'next' }); return true; },
    goBack: () => send({ type: 'back' }), saveAndExit: async () => { if (persist()) router.replace(HOST_LISTINGS_PATH as never); },
    reset: async () => {}, showValidation, fieldErrors: errors, fieldInvalid: f => showValidation && errors.includes(f),
    setShowValidation, formChrome: 'wizard', lockedFields: NO_LOCKS, isLocked: () => false,
  };
  const finishUnit = () => {
    setShowValidation(true);
    if (errors.length || (screen === 'copy' && UNIT_SCREENS.some(s => unitErrors(state, activeId, s).length))) return;
    send({ type: 'next' });
  };
  const add = (copyFrom?: string) => { send({ type: 'add', id: crypto.randomUUID(), copyFrom }); };
  const done = () => { setShowValidation(true); if (!state.units.every(u => unitComplete(state, u))) return; send({ type: 'review' }); };
  const costReady = quote.data && quote.data.units.length === state.units.length;
  const canAfford = costReady && quote.data!.balance >= quote.data!.total;
  const currentUnit = state.units[index];

  function summary(editable = false) {
    return <div className="v2-unit-list" aria-label={editable ? 'Units to review' : 'Units added so far'}>
      {state!.units.map((unit, i) => <UnitRow key={unit.id} unit={unit} index={i} complete={unitComplete(state!, unit)}
        credits={screen === 'review' && costReady ? quote.data!.units[i].credits : undefined}
        onEdit={editable ? () => send({ type: 'editUnit', id: unit.id }) : undefined}
        onRemove={editable ? () => setRemoveId(unit.id) : undefined} />)}
    </div>;
  }

  const theme = { '--v2-accent': Lister.color.primary, '--v2-ink': Lister.color.ink,
    '--v2-muted': Lister.color.inkMuted, '--v2-mist': Lister.color.primaryMist } as CSSProperties;
  return <CreateListingContext.Provider value={form}>
    <div className="v2-wizard" style={theme} data-testid="wizard-v2" data-screen={screen}>
      <header className="v2-header">
        <a className="v2-brand" href={HOST_LISTINGS_PATH} onClick={e => { e.preventDefault(); void form.saveAndExit(); }}>studently<span>.</span></a>
        <span className="v2-prototype">{example ? 'Example · prototype' : 'Prototype'}</span>
        <div className="v2-header-actions"><span className="v2-save" role="status">{saveState === 'saved' ? 'Saved on this browser' : saveState === 'saving' ? 'Saving…' : 'Couldn’t save'}</span>
          {saveState === 'error' ? <button className="v2-link" onClick={() => persist()}>Retry saving</button> : null}
          <button className="v2-link" onClick={() => void form.saveAndExit()}>Save & exit</button></div>
      </header>
      <nav className="v2-progress" aria-label="Wizard progress">
        <button className={`v2-phase ${isPlace ? 'v2-active' : ''}`} aria-current={isPlace ? 'step' : undefined}
          disabled={Boolean(state.place.id) || !state.completedPlace.length || isPlace}
          onClick={() => send({ type: 'editPlace' })}><span>{state.completedPlace.length === PLACE_SCREENS.length ? '✓' : '1'}</span>Place{state.place.id ? ' · existing' : ''}</button>
        {state.units.map((unit, i) => <button key={unit.id} className={`v2-phase ${!isPlace && activeId === unit.id && screen !== 'review' && screen !== 'success' ? 'v2-active' : ''}`}
          aria-current={!isPlace && activeId === unit.id && screen !== 'review' && screen !== 'success' ? 'step' : undefined}
          disabled={state.completedPlace.length !== PLACE_SCREENS.length || (activeId === unit.id && isUnit)} onClick={() => send({ type: 'editUnit', id: unit.id })}>
          <span>{unitComplete(state, unit) ? '✓' : i + 1}</span>Unit {i + 1}</button>)}
        <button className={`v2-phase ${screen === 'review' || screen === 'success' ? 'v2-active' : ''}`} aria-current={screen === 'review' ? 'step' : undefined}
          disabled={!state.reviewVisited || screen === 'review' || screen === 'success'} onClick={() => send({ type: 'review' })}><span>✓</span>Review</button>
      </nav>
      <main className="v2-stage" ref={stage}>
        <aside className="v2-art" aria-hidden="true"><div className="v2-art-inner">
          <WizardLottie assetId={meta.art} width={350} height={300} />
          <p className="v2-art-label">{state.place.data.buildingName || 'A place to belong'}</p>
          <p className="v2-art-note">{isPlace ? 'A little about the place. Just once.' : `${state.units.length} ${state.units.length === 1 ? 'unit' : 'units'} · one shared place`}</p>
          <div className="v2-art-dots"><i /><i /><i /></div>
        </div></aside>
        <div className="v2-form" ref={scroller}>
          <div className={`v2-form-inner ${reducedMotion ? '' : 'v2-enter'}`} key={`${screen}:${activeId}`}>
            <p className="v2-eyebrow">{isPlace ? `Place · ${PLACE_SCREENS.indexOf(screen as typeof PLACE_SCREENS[number]) + 1} of 5` : isUnit ? `Unit ${index + 1} · ${UNIT_SCREENS.indexOf(screen as typeof UNIT_SCREENS[number]) + 1} of 4` : screen === 'another' ? `${state.units.length} ${state.units.length === 1 ? 'unit' : 'units'} added` : 'Your place, together'}</p>
            <h1 ref={heading} tabIndex={-1}>{meta.title}</h1><p className="v2-intro">{meta.sub}</p>
            {state.place.id && screen !== 'success' ? <div className="v2-place-context"><Ionicons name="business-outline" size={20} color={Lister.color.inkMuted} /><div><strong>{state.place.data.buildingName || 'Existing place'}</strong><span>{state.place.data.area} · Place details already saved</span></div></div> : null}
            {screen === 'place-type' ? <View style={{ gap: 12 }}>
              <SelectableCard title="An apartment" body="A whole apartment, or rooms and beds within it." icon="home-outline" selected={state.place.kind === 'apartment'} onPress={() => send({ type: 'kind', kind: 'apartment' })} />
              <SelectableCard title="A building" body="Whole apartments that share one building." icon="business-outline" selected={state.place.kind === 'building'} onPress={() => send({ type: 'kind', kind: 'building' })} />
            </View> : null}
            {screen === 'location' ? <CreateStepLocation /> : null}
            {screen === 'utilities' ? <><BuildingAccessFields /><View style={{ height: 20 }} /><CreateStepAmenities /></> : null}
            {screen === 'rules' ? <CreateStepRules sharedOnly /> : null}
            {screen === 'building-photos' ? <PhotoPickerGrid shared photos={state.place.photos} setPhotos={update => send({ type: 'gallery', id: 'place', update })} /> : null}
            {screen === 'layout' ? <View style={{ gap: 22 }}>
              <LText variant="subtitle">Rental type</LText>
              {SPACE_TYPE_OPTIONS.filter(o => state.place.kind !== 'building' || o.value === 'entire_place').map(o => <SelectableCard key={o.value} title={o.title} body={o.body} icon={o.icon} selected={draft.spaceType === o.value}
                onPress={() => patch({ spaceType: o.value, priceBasis: o.value === 'shared_room' ? 'per_bed_month' : o.value === 'private_room' ? 'per_room_month' : 'per_unit_month' })} />)}
              <LText variant="subtitle">Property type</LText><SegmentedPills options={PROPERTY_TYPE_OPTIONS} value={draft.propertyType} error={form.fieldInvalid('propertyType')} onChange={v => patch({ propertyType: v as typeof draft.propertyType })} />
              <CreateStepSpecs showSharedDetails={false} />
            </View> : null}
            {screen === 'photos' ? <><PhotoPickerGrid photos={draft.photos} setPhotos={setPhotos} />{example ? <button className="v2-sample" onClick={() => setPhotos(examplePhotos(window.location.origin, activeId))}>Use 3 example photos</button> : null}</> : null}
            {screen === 'rent' ? <View style={{ gap: 24 }}><LText variant="subtitle">How is rent listed?</LText><SegmentedPills options={PRICE_BASIS_OPTIONS} value={draft.priceBasis} onChange={v => patch({ priceBasis: v as typeof draft.priceBasis })} /><CreateStepPricing /></View> : null}
            {screen === 'copy' ? <CreateStepCopy /> : null}
            {screen === 'another' ? <>
              <h2 className="v2-section-heading">Your units so far</h2>{summary()}
              <div className="v2-add-options">
                <button disabled={state.units.length >= 20} onClick={() => add(activeId)}><Ionicons name="copy-outline" size={24} color={Lister.color.primary} /><strong>Copy this unit</strong><span>Keep layout, rent and description. Add new photos.</span></button>
                <button disabled={state.units.length >= 20} onClick={() => add()}><Ionicons name="add-outline" size={24} color={Lister.color.primary} /><strong>Start blank</strong><span>A different unit, with a fresh set of details.</span></button>
              </div>{state.units.length >= 20 ? <p className="v2-help">You’ve reached the limit of 20 units in this batch.</p> : null}
            </> : null}
            {screen === 'review' ? <>
              {state.units.length ? summary(true) : <div className="v2-empty">No units yet. Add a unit to continue.</div>}
              <button className="v2-link v2-add-link" disabled={state.units.length >= 20} onClick={() => add()}>+ Add another unit</button>
              {removeId ? <div className="v2-confirm" role="alertdialog" aria-label="Remove unit" aria-modal="false"><p>Remove “{state.units.find(u => u.id === removeId)?.data.title || 'this unit'}” from this draft?</p><div><button autoFocus className="v2-link" onClick={() => setRemoveId(null)}>Keep unit</button><button className="v2-danger" onClick={() => { send({ type: 'remove', id: removeId }); setRemoveId(null); }}>Remove unit</button></div></div> : null}
              <section className="v2-contact"><h2>One contact for every unit.</h2><CreateStepContact /></section>
              <section className="v2-cost" aria-label="Credit total"><h2>{example ? 'Example credit costs' : 'Publishing cost'}</h2>
                {!state.units.length ? <p>Add a unit to see the credit total.</p> : quote.isError ? <><p role="alert">Couldn’t load the credit total. Sign in if needed, then retry.</p><button className="v2-link" onClick={() => void quote.refetch()}>Retry credit total</button></> : costReady ? <><div><span>Total for {state.units.length} {state.units.length === 1 ? 'unit' : 'units'}</span><strong>{quote.data!.total} {quote.data!.total === 1 ? 'credit' : 'credits'}</strong></div><p>{example ? 'Sample quote for this example.' : `Your balance: ${quote.data!.balance} credits.`} All units publish together.</p>{!canAfford ? <p role="alert">Not enough credits for this batch.</p> : null}</> : <p role="status">Checking credit total…</p>}
                <p className="v2-help">Prototype only — publishing here won’t create listings or spend credits.</p>
              </section>
            </> : null}
            {screen === 'success' ? <><div className="v2-success"><Ionicons name="checkmark-circle-outline" size={54} color={Lister.color.primary} /><strong>{state.units.length} {state.units.length === 1 ? 'unit' : 'units'} in one batch</strong><span>Your prototype draft is saved on this browser.</span></div>{summary()}<button className="v2-link" onClick={() => send({ type: 'review' })}>Back to review</button></> : null}
            {showValidation && errors.length ? <div className="v2-errors" role="alert"><strong>A few details still need your attention.</strong><ul>{[...new Set(errors)].map(e => <li key={e}>{validationMessage(e)}</li>)}</ul>
              {screen === 'review' ? state.units.filter(u => !unitComplete(state, u)).map(u => <button key={u.id} className="v2-link" onClick={() => send({ type: 'editUnit', id: u.id })}>Complete {u.data.title || 'unit'}</button>) : null}
            </div> : null}
          </div>
        </div>
      </main>
      <footer className="v2-footer"><div className="v2-footer-start">
        {screen !== 'place-type' && screen !== 'success' && !(screen === 'layout' && state.place.id && index === 0 && !state.returnTo) ? <button className="v2-link" onClick={form.goBack}>← Back</button> : <span />}
        <span className="v2-footer-note">{isPlace ? 'Shared by every unit' : isUnit ? `Unit ${index + 1}${currentUnit?.data.title ? ` · ${currentUnit.data.title}` : ''}` : `${state.units.length} units · one place`}</span>
      </div><div className="v2-footer-end">
        {screen === 'review' ? <LButton label="Publish all" disabled={!costReady || !canAfford || quote.isError} onPress={() => { setShowValidation(true); if (!errors.length && persist()) send({ type: 'success' }); }} /> : screen === 'another' ? <LButton label="Done — review units" onPress={done} /> : screen === 'success' ? <LButton label="Save & exit" onPress={() => void form.saveAndExit()} /> : <LButton label={screen === 'copy' ? (state.returnTo ? 'Save unit' : 'Finish unit') : screen === 'building-photos' && !state.place.photos.length ? 'Skip for now' : 'Next'} onPress={finishUnit} />}
      </div></footer>
    </div>
  </CreateListingContext.Provider>;
}

function UnitRow({ unit, index, complete, credits, onEdit, onRemove }: { unit: Unit; index: number; complete: boolean; credits?: number; onEdit?: () => void; onRemove?: () => void }) {
  const photo = unit.data.photos?.[0];
  const basis = unit.data.priceBasis === 'per_bed_month' ? 'bed / month' : unit.data.priceBasis === 'per_room_month' ? 'room / month' : 'month';
  return <article className="v2-unit-row" data-testid="v2-unit-row">
    {photo ? <img src={photo.url || photo.uri} alt={`Unit ${index + 1} cover`} /> : <div className="v2-photo-placeholder" aria-label="No unit photo"><Ionicons name="image-outline" size={24} color={Lister.color.inkMuted} /></div>}
    <div className="v2-unit-copy"><span>Unit {index + 1}{!complete ? ' · needs details' : ''}</span><strong>{unit.data.title || 'Untitled unit'}</strong><p>{unit.data.monthlyRentUsd ? `$${unit.data.monthlyRentUsd}` : 'Add rent'} <small>/ {basis}</small>{credits !== undefined ? <em>{credits} {credits === 1 ? 'credit' : 'credits'}</em> : null}</p></div>
    {onEdit ? <div className="v2-row-actions"><button aria-label={`Edit unit ${index + 1}`} onClick={onEdit}>Edit</button><button aria-label={`Remove unit ${index + 1}`} onClick={onRemove}>Remove</button></div> : null}
  </article>;
}

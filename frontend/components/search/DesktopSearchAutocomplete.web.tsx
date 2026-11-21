import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { DesktopDesignProvider, useDesktopDesign } from '@/components/ui/DesktopDesign';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useSearchSuggestions } from '@/features/search/useSearchSuggestions';
import type { SearchSuggestion } from '@/features/search/types';
import type { SearchAutocompleteProps } from './SearchAutocomplete';
import { SearchDestinationContent } from './SearchDestinationContent';
import { searchChipLabel as chipLabel } from './searchDisplay';
import { DESKTOP_SEARCH_MOTION as M } from '@/constants/desktopSearchMotion';
import { DESKTOP_SEARCH_CSS } from './desktopSearchStyles';

const WORDS = ['City', 'University', 'Property'];
const TYPE_LABEL = { city: 'City', area: 'Area', campus: 'Campus', place: 'Property' };
type IconName = SearchSuggestion['type'] | 'search' | 'close' | 'history' | 'globe';

function Icon({ name, size = 20, animate = false }: { name: IconName; size?: number; animate?: boolean }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'search' ? <><g className={animate ? 'sds-lens-play' : undefined}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></g>{animate && <path className="sds-spark-play" d="m20 2 .6 2.4L23 5l-2.4.6L20 8l-.6-2.4L17 5l2.4-.6Z" strokeWidth="1.2" />}</> :
      name === 'close' ? <path d="m7 7 10 10M7 17 17 7" /> :
      name === 'campus' ? <><path d="m2 9 10-5 10 5-10 5-10-5Zm4 3v5c4 3 8 3 12 0v-5M22 9v7" /></> :
      name === 'place' ? <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7h1m4 0h1M9 11h1m4 0h1M10 21v-5h4v5" /></> :
      name === 'history' ? <><path d="M3 10a9 9 0 1 1 1 7M3 4v6h6M12 7v5l3 2" /></> :
      name === 'globe' ? <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z" /></> :
      <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></>}
  </svg>;
}

/** Amber's character timings; the reduced-motion path never starts a timer. */
function usePlaceholderWord(enabled: boolean, reduced: boolean) {
  const [frame, setFrame] = useState({ word: 0, count: 0, deleting: false });
  useEffect(() => {
    if (!enabled || reduced) return;
    const text = WORDS[frame.word];
    const delay = frame.deleting ? (frame.count ? M.deleteMs : M.wordPauseMs) : (frame.count === text.length ? M.holdMs : M.typeMs);
    const timer = setTimeout(() => setFrame(current => {
      if (current.deleting) return current.count ? { ...current, count: current.count - 1 } : { word: (current.word + 1) % WORDS.length, count: 0, deleting: false };
      return current.count === WORDS[current.word].length ? { ...current, deleting: true } : { ...current, count: current.count + 1 };
    }), delay);
    return () => clearTimeout(timer);
  }, [enabled, reduced, frame]);
  return reduced ? 'City, university or property' : WORDS[frame.word].slice(0, frame.count);
}

type Position = { left: number; top: number; width: number; panelHeight: number; scaleX: number; scaleY: number };
const keyFor = (item: SearchSuggestion) => `${item.type}:${item.id}`;

const unique = (items: SearchSuggestion[]) => [...new Map(items.map(item => [keyFor(item), item])).values()];

export function DesktopSearchAutocomplete(props: SearchAutocompleteProps) {
  const design = useDesktopDesign();
  return design.isDesktop ? <DesktopSearchContent {...props} /> :
    <DesktopDesignProvider enabled><DesktopSearchContent {...props} /></DesktopDesignProvider>;
}

function DesktopSearchContent({ value, onChangeText, onSelect, onSubmitText, onClear, autoFocus, suggestionsEnabled = true, variant = 'bar', recentSuggestions = [], onClearRecents, recentsError, recentPersistenceError, onRetryRecents, onOpenSearch, desktopActive = true, desktopSelectionLabel }: SearchAutocompleteProps) {
  const { scale, size } = useDesktopDesign();
  const reduced = useReducedMotion();
  const hero = variant === 'pill';
  const [open, setOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const [active, setActive] = useState(-1);
  const [position, setPosition] = useState<Position | null>(null);
  const launcher = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const skipFocus = useRef(false);
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const listId = `desktop-search-${reactId}`;
  const typedInput = [...value.trim().normalize('NFKC').replace(/[\p{M}\u0640\u200b-\u200f\ufeff]/gu, '')].length >= 2;
  const arabic = /[\u0600-\u06ff]/.test(value);
  const query = useSearchSuggestions(value, open && !composing && suggestionsEnabled);
  const data = query.data;
  const typed = typedInput && data?.mode !== 'defaults';
  const freshDefaults = [...(data?.sections.topAreas ?? []), ...(data?.sections.topCampuses ?? [])];
  const recents = unique(recentSuggestions).slice(0, 8).map(item => freshDefaults.find(fresh => keyFor(fresh) === keyFor(item)) ?? item);
  const recentKeys = new Set(recents.map(keyFor));
  const areas = (data?.sections.topAreas ?? []).filter(item => !recentKeys.has(keyFor(item)));
  const campuses = (data?.sections.topCampuses ?? []).filter(item => !recentKeys.has(keyFor(item)));
  const items = useMemo(() => typed ? data?.results ?? [] : unique([...recents, ...areas, ...campuses]), [typed, data, recentSuggestions]);
  const launcherValue=desktopSelectionLabel??value;
  const word = usePlaceholderWord(desktopActive && !open && !(hero?value:launcherValue), reduced);
  const vars = { '--ds': scale } as CSSProperties;

  const measure = useCallback(() => {
    const element=bar.current??launcher.current;
    const rect=element?.getBoundingClientRect();
    if(!element||!rect?.width)return;
    const inner=bar.current?.querySelector('.sds-bar-inner')?.getBoundingClientRect();
    const style=getComputedStyle(element);
    const layoutWidth=parseFloat(style.width)||rect.width;
    const layoutHeight=parseFloat(style.height)||rect.height;
    const scaleX=rect.width/layoutWidth;
    const scaleY=rect.height/layoutHeight;
    const left=Math.max(size(8),inner?.left??rect.left+size(3));
    const width=Math.max(0,Math.min(layoutWidth,(window.innerWidth-left-size(8))/scaleX));
    const top=inner?inner.bottom+size(8):rect.bottom+size(5);
    const panelHeight=Math.max(0,Math.min(size(460),(window.innerHeight-top)/scaleY-size(80)));
    setPosition(previous=>previous&&Math.abs(previous.left-left)<.1&&Math.abs(previous.top-top)<.1&&Math.abs(previous.width-width)<.1&&Math.abs(previous.panelHeight-panelHeight)<.1&&Math.abs(previous.scaleX-scaleX)<.001&&Math.abs(previous.scaleY-scaleY)<.001?previous:{left,top,width,panelHeight,scaleX,scaleY});
  },[size]);

  const close = useCallback((restore = false) => {
    setOpen(false); setActive(-1);
    input.current?.blur();
    if (restore) requestAnimationFrame(() => {
      skipFocus.current = hero;
      launcher.current?.querySelector<HTMLElement>('input,button')?.focus({ preventScroll: true });
    });
  }, [hero]);
  const openSearch = useCallback(() => { if (!desktopActive || open) return; if (skipFocus.current) { skipFocus.current = false; return; } measure(); setOpen(true); window.dispatchEvent(new CustomEvent('studently:desktop-search-open',{detail:listId})); onOpenSearch?.(); }, [measure,onOpenSearch,desktopActive,open,listId]);
  const select = (item: SearchSuggestion) => { close(); onSelect(item); };
  const submit = () => { close(); onSubmitText(value.trim()); };

  useEffect(() => { if (autoFocus) openSearch(); }, []);
  useEffect(() => { if (!desktopActive && open) close(); }, [desktopActive,open,close]);
  useEffect(() => { const other=(event:Event)=>{if((event as CustomEvent).detail!==listId)close();};window.addEventListener('studently:desktop-search-open',other);return()=>window.removeEventListener('studently:desktop-search-open',other);},[listId,close]);
  useLayoutEffect(() => {
    if (!open) return;
    measure(); let frame=0; const started=performance.now();
    const tick=()=>{measure();if(performance.now()-started<Math.max(M.heroFocusMs,M.headerSlideMs))frame=requestAnimationFrame(tick);};
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[open,measure]);
  useEffect(() => { setActive(-1); }, [value, data]);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => { input.current?.focus({ preventScroll: true }); if (!hero) input.current?.select(); });
    const scrollOwner = launcher.current?.closest('#studently-web-shell,#studently-home-scroll');
    const initialScroll = scrollOwner?.scrollTop ?? window.scrollY;
    const onOutside = (event: PointerEvent) => { if (!surface.current?.contains(event.target as Node) && !launcher.current?.contains(event.target as Node)) close(); };
    const onScroll = (event: Event) => {
      if (surface.current?.contains(event.target as Node)) return;
      const scroll = scrollOwner?.scrollTop ?? window.scrollY;
      if (!hero && Math.abs(scroll - initialScroll) > M.scrollCloseDistance) close(); else measure();
    };
    document.addEventListener('pointerdown', onOutside, true);
    window.addEventListener('resize', measure); window.addEventListener('scroll', onScroll, true);
    const observer = new ResizeObserver(measure); if (launcher.current) observer.observe(launcher.current); if(bar.current)observer.observe(bar.current);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener('pointerdown', onOutside, true); window.removeEventListener('resize', measure); window.removeEventListener('scroll', onScroll, true); };
  }, [open, close, measure, hero]);
  useEffect(() => { if (active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [active, listId]);

  function keyboard(event: KeyboardEvent<HTMLInputElement>) {
    if (composing || event.nativeEvent.isComposing) return;
    if (event.key === 'Escape') { event.preventDefault(); close(true); }
    else if (event.key === 'ArrowDown' && items.length) { event.preventDefault(); setActive(index => Math.min(index + 1, items.length - 1)); }
    else if (event.key === 'ArrowUp' && items.length) { event.preventDefault(); setActive(index => Math.max(index - 1, 0)); }
    else if (event.key === 'Enter') { event.preventDefault(); if (items.length && (active >= 0 || typed)) select(items[Math.max(active, 0)]); else submit(); }
    else if (event.key === 'Home' && active >= 0) { event.preventDefault(); setActive(0); }
    else if (event.key === 'End' && active >= 0) { event.preventDefault(); setActive(items.length - 1); }
  }

  function optionProps(item: SearchSuggestion, chip = false) {
    const index = items.findIndex(candidate => keyFor(candidate) === keyFor(item));
    return { id: `${listId}-${index}`, role: 'option' as const, 'aria-selected': index === active, tabIndex: -1,
      'aria-label': chip && item.type === 'campus' ? chipLabel(item) : `${item.label.en}, ${item.context.en} — ${item.label.ar}, ${item.context.ar}`,
      title: chip && item.type === 'campus' ? chipLabel(item) : `${item.label.en} — ${item.label.ar} (${item.context.en} / ${item.context.ar})`,
      onMouseEnter: () => setActive(index), onMouseDown: (event: React.MouseEvent) => event.preventDefault(), onClick: () => select(item) };
  }

  function section(label: string, icon: IconName, entries: SearchSuggestion[]) {
    if (!entries.length) return null;
    if (label==='Recently searched') return <section aria-label={label} role="group">
      <h3 className="sds-recent-head">{label}{onClearRecents&&<button className="sds-clear-recents" onClick={onClearRecents}>Clear all</button>}</h3>
      <div className="sds-recent-list">{entries.map(item=><button className="sds-recent-row" key={keyFor(item)} {...optionProps(item)}><SearchDestinationContent item={item} recent scale={scale}/></button>)}</div>
    </section>;
    return <section aria-label={label} role="group">
      <h3 className="sds-section-title"><Icon name={icon} size={size(14)} />{label}{label==='Recently searched'&&onClearRecents&&<button className="sds-clear-recents" onClick={onClearRecents}>Clear all</button>}</h3>
      <div className="sds-chip-grid">{entries.map(item => <button key={keyFor(item)} className="sds-chip" data-type={item.type} {...optionProps(item, true)}>
        <span className="sds-chip-label">{chipLabel(item)}</span>
        {item.type !== 'campus' && <>
          {item.context.en.includes('Matn') && <small className="sds-chip-context">Matn</small>}
          <bdi lang="ar" dir="rtl">{item.label.ar}{item.context.ar.includes('\u0627\u0644\u0645\u062a\u0646') ? ' \u00b7 \u0627\u0644\u0645\u062a\u0646' : ''}</bdi>
        </>}
      </button>)}</div>
    </section>;
  }

  const clear = <button type="button" className="sds-action sds-clear" aria-label="Clear search" onMouseDown={event => event.preventDefault()} onClick={() => { onChangeText(''); onClear(); input.current?.focus(); }}><Icon name="close" size={size(23)} /></button>;
  const hints = <div className="sds-hints" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> Explore</span><span><kbd>↵</kbd> Select</span><span><kbd>esc</kbd> Close</span></div>;
  const blur = (event: React.FocusEvent) => {
    const next=event.relatedTarget as Node|null;
    if(next&&(launcher.current?.contains(next)||surface.current?.contains(next)))return;
    close();
  };
  const editor = <div ref={bar} className={hero ? `sds-hero${open ? ' sds-open-bar' : ''}` : 'sds-open-bar'} data-open={open}>
    <span className="sds-ring" /><div className="sds-bar-inner">
      <input ref={input} className="sds-input" aria-label="Search" role="combobox" aria-expanded={open} aria-autocomplete="list" aria-controls={open?listId:undefined} aria-activedescendant={open&&active>=0?`${listId}-${active}`:undefined}
        aria-describedby={open?`${listId}-status`:undefined} autoComplete="off" spellCheck={false} dir="auto" maxLength={64} placeholder={open?'Search a city, area, university or property':undefined}
        value={value} onFocus={openSearch} onClick={openSearch} onChange={event=>{onChangeText(event.target.value);if(!open)openSearch();}} onKeyDown={open?keyboard:undefined} onCompositionStart={()=>setComposing(true)} onCompositionEnd={()=>setComposing(false)} />
      {!open&&!value&&<span className="sds-placeholder" aria-hidden="true">Search by <span className="sds-word" data-testid="search-placeholder-word">{word}<i className="sds-caret" /></span></span>}
      {value?clear:<button type="button" className="sds-action" aria-label={open?'Search all homes':'Open search'} onMouseDown={event=>event.preventDefault()} onClick={open?submit:openSearch}><Icon name="search" size={size(24)} animate={!open&&!reduced}/></button>}
    </div>
  </div>;
  return <>
    <style>{DESKTOP_SEARCH_CSS}</style>
    <div className="sds" style={{...vars,width:'100%',maxWidth:hero?undefined:size(640),minWidth:0,height:size(70),marginInline:'auto'}} data-desktop-search="true" inert={!desktopActive||undefined} aria-hidden={!desktopActive||undefined} data-variant={variant} data-open={open} ref={launcher} onBlur={blur}>
      {hero?editor:<div className="sds-editor-host">{open?editor:<button type="button" className="sds-launch" aria-label={launcherValue?`Search: ${launcherValue}`:'Open search'} aria-haspopup="listbox" aria-expanded={false} onClick={openSearch}>
        <span className="sds-launch-label" data-empty={!launcherValue}>{launcherValue||<>Search by <span className="sds-word" data-testid="search-placeholder-word">{word}<i className="sds-caret" /></span></>}</span><span className="sds-action"><Icon name="search" size={size(20)} animate={!reduced}/></span>
      </button>}</div>}
    </div>
    {open&&position&&createPortal(<>
      <div className="sds sds-surface" data-variant={variant} style={{...vars,left:position.left,top:position.top,width:position.width,transform:`scale(${position.scaleX},${position.scaleY})`,transformOrigin:'top left','--panel-height':`${position.panelHeight}px`} as CSSProperties} ref={surface} onBlur={blur}>
        <div className="sds-panel" data-testid="desktop-search-panel">
          <div className="sds-scroll">
            <div className="sds-panel-top"><strong><Icon name="globe" size={size(15)} />{typed ? 'Suggested places' : 'Explore Lebanon'}</strong></div>
            <div id={listId} role="listbox" aria-label="Search suggestions" aria-busy={query.isFetching}>
              {query.isFetching && !data ? <div className="sds-loading" aria-hidden="true">{[0, 1, 2].map(n => <div className="sds-skeleton" key={n}><span className="sds-bone sds-bone-icon" /><div className="sds-bone-lines"><span className="sds-bone sds-bone-line" /><span className="sds-bone sds-bone-line" /></div></div>)}</div> : query.isError ?
                <div className="sds-empty"><span className="sds-empty-icon"><Icon name="search" /></span><strong>Suggestions are taking a moment</strong><p>You can try again or search for your own words.</p><button className="sds-retry" onClick={() => void query.refetch()}>Try again</button></div> : typed ? items.length ? items.map(item => <button className="sds-row" key={keyFor(item)} {...optionProps(item)}>
                  <span className="sds-tile"><Icon name={item.type} size={size(21)} /></span><span className="sds-copy"><span className="sds-titles"><bdi className="sds-title" dir={arabic ? 'rtl' : 'ltr'} lang={arabic ? 'ar' : 'en'}>{arabic ? item.label.ar : item.label.en}</bdi><bdi className="sds-alias" dir={arabic ? 'ltr' : 'rtl'} lang={arabic ? 'en' : 'ar'}>{arabic ? item.label.en : item.label.ar}</bdi></span><span className="sds-context">{item.context.en}<span className="sds-separator">·</span><bdi dir="rtl" lang="ar">{item.context.ar}</bdi></span></span><span className="sds-type">{TYPE_LABEL[item.type]}</span>
                </button>) : <div className="sds-empty"><span className="sds-empty-icon"><Icon name="search" /></span><strong>No places found.</strong><p>Try another spelling, city, area or university.</p></div> : <>
                  {recentsError&&<div className="sds-empty" role="status">Recent searches unavailable. <button onClick={onRetryRecents}>Retry</button></div>}{recentPersistenceError&&<div className="sds-empty" role="status">Recent searches are saved for this session only.</div>}{section('Recently searched', 'history', recents)}{section('Top areas', 'area', areas)}{section('Top universities & campuses', 'campus', campuses)}
                  {!areas.length && !campuses.length && !recents.length && <div className="sds-empty"><strong>Where would you like to live?</strong><p>Type a city, area or university to find your place in Lebanon.</p></div>}
                </>}
            </div>
          </div>
          <div className="sds-footer">{hints}{typed ? <button className="sds-plain" onClick={submit}>Search all for “{value.trim()}”</button> : null}</div>
        </div>
        <span className="sds-sr" id={`${listId}-status`} role="status" aria-live="polite">{query.isFetching ? 'Searching Lebanon' : typed ? `${items.length} suggestions available` : 'Popular locations and campuses. Use the arrow keys to explore.'}</span>
      </div>
    </>,document.body)}
  </>;
}

import React, { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { DesktopDesignProvider, useDesktopDesign } from '@/components/ui/DesktopDesign';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useSearchSuggestions } from '@/features/search/useSearchSuggestions';
import type { SearchSuggestion } from '@/features/search/types';
import type { SearchAutocompleteProps } from './SearchAutocomplete';
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
    const delay = frame.deleting ? (frame.count ? 28 : 400) : (frame.count === text.length ? 2000 : 55);
    const timer = setTimeout(() => setFrame(current => {
      if (current.deleting) return current.count ? { ...current, count: current.count - 1 } : { word: (current.word + 1) % WORDS.length, count: 0, deleting: false };
      return current.count === WORDS[current.word].length ? { ...current, deleting: true } : { ...current, count: current.count + 1 };
    }), delay);
    return () => clearTimeout(timer);
  }, [enabled, reduced, frame]);
  return reduced ? 'City, university or property' : WORDS[frame.word].slice(0, frame.count);
}

type Position = { left: number; top: number; width: number; panelHeight: number };
const keyFor = (item: SearchSuggestion) => `${item.type}:${item.id}`;
function chipLabel(item: SearchSuggestion): string {
  if (item.type !== 'campus') return item.label.en;
  const [institution, ...parts] = item.label.en.split(/\s+[\u2014\u2013]\s+/);
  if (!parts.length) return institution;
  const campus = parts.join(' \u00b7 ').replace(/\bcampus\b/gi, '').replace(/\s+/g, ' ').trim();
  return campus ? `${institution} \u00b7 ${campus}` : institution;
}

const unique = (items: SearchSuggestion[]) => [...new Map(items.map(item => [keyFor(item), item])).values()];

export function DesktopSearchAutocomplete(props: SearchAutocompleteProps) {
  const design = useDesktopDesign();
  return design.isDesktop ? <DesktopSearchContent {...props} /> :
    <DesktopDesignProvider enabled><DesktopSearchContent {...props} /></DesktopDesignProvider>;
}

function DesktopSearchContent({ value, onChangeText, onSelect, onSubmitText, onClear, autoFocus, suggestionsEnabled = true, variant = 'bar', recentSuggestions = [] }: SearchAutocompleteProps) {
  const { scale, size } = useDesktopDesign();
  const reduced = useReducedMotion();
  const hero = variant === 'pill';
  const [open, setOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const [active, setActive] = useState(-1);
  const [position, setPosition] = useState<Position | null>(null);
  const launcher = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const skipFocus = useRef(false);
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const listId = `desktop-search-${reactId}`;
  const typedInput = [...value.trim().normalize('NFKC').replace(/[\p{M}\u0640\u200b-\u200f\ufeff]/gu, '')].length >= 2;
  const arabic = /[\u0600-\u06ff]/.test(value);
  const query = useSearchSuggestions(value, open && !composing && suggestionsEnabled);
  const data = query.data;
  const typed = typedInput && data?.mode !== 'defaults';
  const recents = unique(recentSuggestions).slice(0, 8);
  const recentKeys = new Set(recents.map(keyFor));
  const areas = (data?.sections.topAreas ?? []).filter(item => !recentKeys.has(keyFor(item)));
  const campuses = (data?.sections.topCampuses ?? []).filter(item => !recentKeys.has(keyFor(item)));
  const items = useMemo(() => typed ? data?.results ?? [] : unique([...recents, ...areas, ...campuses]), [typed, data, recentSuggestions]);
  const word = usePlaceholderWord(!open && !value, reduced);
  const vars = { '--ds': scale } as CSSProperties;

  const measure = useCallback(() => {
    const rect = launcher.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(hero ? rect.width : size(640), window.innerWidth - size(32));
    const brand = hero ? null : launcher.current?.parentElement?.parentElement?.querySelector<HTMLElement>('a[href="/"]')?.getBoundingClientRect();
    const minLeft = Math.max(size(16), brand ? brand.right + size(16) : 0);
    const left = Math.max(minLeft, Math.min(rect.left + (rect.width - width) / 2, window.innerWidth - width - size(16)));
    const top = Math.max(size(8), rect.top - (reduced ? 0 : hero ? size(12) : size(11)));
    const panelHeight = Math.max(size(120), Math.min(size(460), window.innerHeight - top - size(70 + 8 + 44 + 16)));
    setPosition(previous => previous && previous.left === left && previous.top === top && previous.width === width && previous.panelHeight === panelHeight ? previous : { left, top, width, panelHeight });
  }, [hero, size, reduced]);

  const close = useCallback((restore = false) => {
    setOpen(false); setActive(-1);
    input.current?.blur();
    if (restore) requestAnimationFrame(() => {
      skipFocus.current = hero;
      launcher.current?.querySelector<HTMLElement>('input,button')?.focus({ preventScroll: true });
    });
  }, [hero]);
  const openSearch = useCallback(() => { if (skipFocus.current) { skipFocus.current = false; return; } measure(); setOpen(true); }, [measure]);
  const select = (item: SearchSuggestion) => { close(); onSelect(item); };
  const submit = () => { close(); onSubmitText(value.trim()); };

  useEffect(() => { if (autoFocus) openSearch(); }, []);
  useEffect(() => { setActive(-1); }, [value, data]);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => { input.current?.focus({ preventScroll: true }); if (!hero) input.current?.select(); });
    const scrollOwner = launcher.current?.closest('#studently-web-shell');
    const initialScroll = scrollOwner?.scrollTop ?? window.scrollY;
    const onOutside = (event: PointerEvent) => { if (!surface.current?.contains(event.target as Node) && !launcher.current?.contains(event.target as Node)) close(); };
    const onScroll = (event: Event) => {
      if (surface.current?.contains(event.target as Node)) return;
      const scroll = scrollOwner?.scrollTop ?? window.scrollY;
      if (!hero && Math.abs(scroll - initialScroll) > 80) close(); else measure();
    };
    document.addEventListener('pointerdown', onOutside, true);
    window.addEventListener('resize', measure); window.addEventListener('scroll', onScroll, true);
    const observer = new ResizeObserver(measure); if (launcher.current) observer.observe(launcher.current);
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
    return <section aria-label={label} role="group">
      <h3 className="sds-section-title"><Icon name={icon} size={size(14)} />{label}</h3>
      <div className="sds-chip-grid">{entries.map(item => <button key={keyFor(item)} className="sds-chip" data-type={item.type} {...optionProps(item, true)}>
        <span className="sds-chip-label">{chipLabel(item)}</span>
        {item.type !== 'campus' && <>
          {item.context.en.includes('Matn') && <small className="sds-chip-context">Matn</small>}
          <bdi lang="ar" dir="rtl">{item.label.ar}{item.context.ar.includes('\u0627\u0644\u0645\u062a\u0646') ? ' \u00b7 \u0627\u0644\u0645\u062a\u0646' : ''}</bdi>
        </>}
      </button>)}</div>
    </section>;
  }

  const action = (small = false) => <span className="sds-action"><Icon name="search" size={size(small ? 20 : 24)} animate={!reduced} /></span>;
  const clear = <button type="button" className="sds-action sds-clear" aria-label="Clear search" onMouseDown={event => event.preventDefault()} onClick={() => { onChangeText(''); onClear(); input.current?.focus(); }}><Icon name="close" size={size(23)} /></button>;
  const hints = <div className="sds-hints" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> Explore</span><span><kbd>↵</kbd> Select</span><span><kbd>esc</kbd> Close</span></div>;

  return <>
    <style>{DESKTOP_SEARCH_CSS}</style>
    <div className="sds" style={{ ...vars, width: '100%', minWidth: 0 }} data-desktop-search="true" data-open={open} ref={launcher}>
      <div style={open ? { visibility: 'hidden' } : undefined}>
        {hero ? <div className="sds-hero"><span className="sds-ring" /><div className="sds-bar-inner">
          <input aria-label="Search" role="combobox" aria-expanded={false} autoComplete="off" className="sds-input" value={value} onFocus={openSearch} onClick={openSearch} onChange={event => { onChangeText(event.target.value); openSearch(); }} />
          {!value && <span className="sds-placeholder" aria-hidden="true">Search by <span className="sds-word" data-testid="search-placeholder-word">{word}<i className="sds-caret" /></span></span>}
          {value ? clear : <button className="sds-action" aria-label="Open search" onClick={openSearch}><Icon name="search" size={size(24)} animate={!reduced} /></button>}
        </div></div> : <button className="sds-launch" aria-label={value ? `Search: ${value}` : 'Open search'} aria-haspopup="listbox" aria-expanded={false} onClick={openSearch}>
          <span className="sds-launch-label" data-empty={!value}>{value || <>Search by <span className="sds-word" data-testid="search-placeholder-word">{word}<i className="sds-caret" /></span></>}</span>{action(true)}
        </button>}
      </div>
    </div>
    {open && position && createPortal(<>
      {hero && <div className="sds-veil" />}
      <div className="sds sds-surface" data-variant={variant} style={{ ...vars, left: position.left, top: position.top, width: position.width, '--panel-height': `${position.panelHeight}px` } as CSSProperties} ref={surface}
        onBlur={event => { if (!event.relatedTarget || !event.currentTarget.contains(event.relatedTarget as Node)) close(); }}>
        <div className="sds-open-bar"><span className="sds-ring" /><div className="sds-bar-inner">
          <input ref={input} className="sds-input" aria-label="Search" role="combobox" aria-expanded={true} aria-autocomplete="list" aria-controls={listId} aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            aria-describedby={`${listId}-status`} autoComplete="off" spellCheck={false} dir="auto" maxLength={64} placeholder="Search a city, area, university or property"
            value={value} onChange={event => onChangeText(event.target.value)} onKeyDown={keyboard} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} />
          {value ? clear : <button className="sds-action" aria-label="Search all homes" onMouseDown={event => event.preventDefault()} onClick={submit}><Icon name="search" size={size(24)} /></button>}
        </div></div>
        <div className="sds-panel" data-testid="desktop-search-panel">
          <div className="sds-scroll">
            <div className="sds-panel-top"><strong><Icon name="globe" size={size(15)} />{typed ? 'Suggested places' : 'Explore Lebanon'}</strong></div>
            <div id={listId} role="listbox" aria-label="Search suggestions" aria-busy={query.isFetching}>
              {query.isFetching && !data ? <div className="sds-loading" aria-hidden="true">{[0, 1, 2].map(n => <div className="sds-skeleton" key={n}><span className="sds-bone sds-bone-icon" /><div className="sds-bone-lines"><span className="sds-bone sds-bone-line" /><span className="sds-bone sds-bone-line" /></div></div>)}</div> : query.isError ?
                <div className="sds-empty"><span className="sds-empty-icon"><Icon name="search" /></span><strong>Suggestions are taking a moment</strong><p>You can try again or search for your own words.</p><button className="sds-retry" onClick={() => void query.refetch()}>Try again</button></div> : typed ? items.length ? items.map(item => <button className="sds-row" key={keyFor(item)} {...optionProps(item)}>
                  <span className="sds-tile"><Icon name={item.type} size={size(21)} /></span><span className="sds-copy"><span className="sds-titles"><bdi className="sds-title" dir={arabic ? 'rtl' : 'ltr'} lang={arabic ? 'ar' : 'en'}>{arabic ? item.label.ar : item.label.en}</bdi><bdi className="sds-alias" dir={arabic ? 'ltr' : 'rtl'} lang={arabic ? 'en' : 'ar'}>{arabic ? item.label.en : item.label.ar}</bdi></span><span className="sds-context">{item.context.en}<span className="sds-separator">·</span><bdi dir="rtl" lang="ar">{item.context.ar}</bdi></span></span><span className="sds-type">{TYPE_LABEL[item.type]}</span>
                </button>) : <div className="sds-empty"><span className="sds-empty-icon"><Icon name="search" /></span><strong>No places found.</strong><p>Try another spelling, city, area or university.</p></div> : <>
                  {section('Recently searched', 'history', recents)}{section('Top areas', 'area', areas)}{section('Top universities & campuses', 'campus', campuses)}
                  {!areas.length && !campuses.length && !recents.length && <div className="sds-empty"><strong>Where would you like to live?</strong><p>Type a city, area or university to find your place in Lebanon.</p></div>}
                </>}
            </div>
          </div>
          <div className="sds-footer">{hints}{typed ? <button className="sds-plain" onClick={submit}>Search all for “{value.trim()}”</button> : null}</div>
        </div>
        <span className="sds-sr" id={`${listId}-status`} role="status" aria-live="polite">{query.isFetching ? 'Searching Lebanon' : typed ? `${items.length} suggestions available` : 'Popular locations and campuses. Use the arrow keys to explore.'}</span>
      </div>
    </>, document.body)}
  </>;
}

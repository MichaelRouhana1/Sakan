import type { BrowseState } from '@/features/matcher/browseState';
import { hasAnswers } from '@/features/matcher/preferences';
import type { BrowseDestination } from '@/lib/browseSearchUrl';
import type { SearchSuggestion } from './types';

export function searchDestination(item: SearchSuggestion): BrowseDestination {
  if(item.type==='city') return {city:item.slug};
  if(item.type==='area') return {areas:[item.canonicalArea]};
  if(item.type==='campus') return {campusId:item.id,universitySlugs:[item.slug],...(item.nearbyRadiusMeters?{radiusKm:item.nearbyRadiusMeters/1000}:{})};
  return {placeId:item.id};
}
function replaceLocation(state: BrowseState,destination: BrowseDestination): BrowseState {
  const prefs=state.prefs ? {...state.prefs} : null;
  if(prefs) delete prefs.location;
  const remaining=hasAnswers(prefs) ? prefs : null;
  return {...state,filters:{...state.filters,q:null,city:null,placeId:null,campusId:null,institutionSlug:null,
    areas:[],universitySlugs:[],radiusKm:null,...destination},prefs:remaining,
    mode:destination.campusId ? 'university' : 'standard',sort:state.sort==='match' && !remaining ? 'newest' : state.sort};
}
export function applySearchSelection(state: BrowseState,item: SearchSuggestion): BrowseState {
  const next=replaceLocation(state,searchDestination(item));
  const hasDistance=item.center && (item.type==='campus'||item.type==='area'||(item.type==='city'&&item.canonicalAreas.length===1));
  return next.sort==='distance' && !hasDistance ? {...next,sort:'newest'} : next;
}
export function applySearchText(state: BrowseState,query: string): BrowseState {
  const next=replaceLocation(state,{q:query.trim()||null});
  return next.sort==='distance' ? {...next,sort:'newest'} : next;
}
export function clearSearchLocation(state: BrowseState): BrowseState {
  const f=state.filters;
  const explicit=Boolean(f.city || f.placeId || f.campusId || f.areas.length || f.universitySlugs.length);
  return applySearchText(state,explicit ? f.q ?? '' : '');
}

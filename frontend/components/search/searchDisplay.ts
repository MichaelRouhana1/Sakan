import type { SearchSuggestion } from '@/features/search/types';
import type { NearbyResolution } from '@/features/listings/useListings';
export const SEARCH_TYPE_LABEL={city:'City',area:'Area',campus:'Campus',place:'Property',street:'Street',hood:'Neighbourhood'} as const;
export const OSM_ATTRIBUTION={text:'\u00a9 OpenStreetMap contributors',url:'https://www.openstreetmap.org/copyright'} as const;
export const isNearby=(item:SearchSuggestion)=>item.type==='street'||item.type==='hood';
export const nearbyFallbackLabel=(kind:unknown)=>kind==='hood'?'Selected neighbourhood':'Selected street';
export function searchChipLabel(item:SearchSuggestion):string {
  if(item.type!=='campus')return item.label.en;
  const [institution,...parts]=item.label.en.split(/\s+[\u2014\u2013]\s+/);
  const campus=parts.join(' \u00b7 ').replace(/\bcampus\b/gi,'').replace(/\s+/g,' ').trim();
  return campus?`${institution} \u00b7 ${campus}`:institution;
}
const places=(n:number)=>`${n} place${n===1?'':'s'}`;
/** "4 places near Bliss Street", or "3 places in Hamra" when nothing is within the radius. */
export function nearbyCountLabel(item:SearchSuggestion):string|null {
  if(item.type!=='street'&&item.type!=='hood')return null;
  if(item.fallback)return `${places(item.fallback.count)} in ${item.fallback.label.en}`;
  return Number.isSafeInteger(item.eligibleUnitCount)?`${places(item.eligibleUnitCount!)} near ${item.label.en}`:null;
}
const distance=(m:number)=>m>=1000?`${+(m/1000).toFixed(1)} km`:`${m} m`;
/** Results note: "4 places within 400 m of Bliss Street" or "No places within 400 m of X — showing 3 in Hamra". */
export function nearbyResultsLabel(n:NearbyResolution):string {
  const within=`within ${distance(n.appliedRadiusMeters)} of ${n.label.en}`;
  return n.fallback?`No places ${within} \u2014 showing ${n.fallback.count} in ${n.fallback.label.en}`:`${places(n.count)} ${within}`;
}

import type { Href } from 'expo-router';
export type BrowseDestination = {
  q?: string | null; city?: string | null; placeId?: string | null; campusId?: string | null;
  areas?: string[]; universitySlugs?: string[];radiusKm?: number | null;
  locationId?: string | null; locationKind?: 'street' | 'hood' | null;
};
export type BrowseSearchUrlParams = { q?: string | null; city?: string | null; placeId?: string | null;
  campusId?: string | null; areas?: string | null; universitySlugs?: string | null;radiusKm?: string | null;
  locationId?: string | null; kind?: string | null };
export function browseSearchParams(input: BrowseDestination): Record<string,string> {
  const out:Record<string,string>={};
  for(const key of ['q','city','placeId','campusId'] as const) if(input[key]?.trim()) out[key]=input[key]!.trim();
  if(input.locationId?.trim()&&input.locationKind){out.locationId=input.locationId.trim();out.kind=input.locationKind;}
  for(const key of ['areas','universitySlugs'] as const) if(input[key]?.length) out[key]=input[key]!.join(',');
  if(input.radiusKm!=null&&Number.isFinite(input.radiusKm)&&input.radiusKm>0)out.radiusKm=String(input.radiusKm);
  return out;
}
export function browseSearchSetParams(input: BrowseDestination): Record<string,string|undefined> {
  return {q:undefined,city:undefined,placeId:undefined,campusId:undefined,areas:undefined,universitySlugs:undefined,radiusKm:undefined,
    locationId:undefined,kind:undefined,...browseSearchParams(input)};
}
export function homeBrowseHref(input: BrowseDestination): Href {
  const params=browseSearchParams(input);
  return Object.keys(params).length ? {pathname:'/search',params} as Href : '/search' as Href;
}
export function parseCsvParam(value: string|string[]|undefined): string[] {
  return (Array.isArray(value) ? value.join(',') : value ?? '').split(',').map(s=>s.trim()).filter(Boolean);
}
export {parseBrowseState,serializeBrowseState} from '@/features/matcher/browseState';

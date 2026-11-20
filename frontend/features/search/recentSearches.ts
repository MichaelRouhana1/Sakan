import type { SearchSuggestion } from './types';
export const RECENT_SEARCH_KEY='studently.search.recents.v1';
export const RECENT_SEARCH_LIMIT=8;
export const recentKey=(item: Pick<SearchSuggestion,'type'|'id'>)=>`${item.type}:${item.id}`;
const text=(x:unknown):x is string=>typeof x==='string'&&x.length>0&&x.length<=512;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Guest storage is untrusted. Reconstruct URLs from identity; never follow stored URLs. */
export function parseRecentSearches(raw:string|null):SearchSuggestion[] {
  try {
    const parsed=JSON.parse(raw??'null');
    if(parsed?.version!==1||!Array.isArray(parsed.items))return[];
    const result:SearchSuggestion[]=[];
    for(const x of parsed.items.slice(0,64)) {
      if(!x||!text(x.id)||!text(x.label?.en)||!text(x.label?.ar)||!text(x.context?.en)||!text(x.context?.ar))continue;
      const thumbnail=typeof x.thumbnailUrl==='string'&&x.thumbnailUrl.length<=2048&&
        (/^https?:\/\//i.test(x.thumbnailUrl)||/^\/(uploads|assets)\//.test(x.thumbnailUrl))?x.thumbnailUrl:null;
      const base={eligibleUnitCount:Number.isSafeInteger(x.eligibleUnitCount)&&x.eligibleUnitCount>=0?x.eligibleUnitCount:undefined,
        thumbnailUrl:thumbnail,id:x.id,label:{en:x.label.en,ar:x.label.ar},context:{en:x.context.en,ar:x.context.ar},center:
        Number.isFinite(x.center?.lat)&&Number.isFinite(x.center?.lng)&&Math.abs(x.center.lat)<=90&&Math.abs(x.center.lng)<=180?{lat:x.center.lat,lng:x.center.lng}:null};
      let item:SearchSuggestion;
      if((x.type==='city'||x.type==='area')&&typeof x.slug==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x.slug)&&x.id===`${x.type}:${x.slug}`) {
        if(x.type==='city'&&Array.isArray(x.canonicalAreas)&&x.canonicalAreas.every(text))item={...base,type:'city',slug:x.slug,canonicalAreas:x.canonicalAreas.slice(0,32),url:`/search?city=${encodeURIComponent(x.slug)}`};
        else if(x.type==='area'&&text(x.canonicalArea))item={...base,type:'area',slug:x.slug,canonicalArea:x.canonicalArea,url:`/search?areas=${encodeURIComponent(x.canonicalArea)}`};
        else continue;
      } else if(x.type==='campus'&&uuid.test(x.id)&&typeof x.slug==='string'&&/^[a-z0-9-]+$/.test(x.slug)) {
        const radius=Number.isSafeInteger(x.nearbyRadiusMeters)&&x.nearbyRadiusMeters>0&&x.nearbyRadiusMeters<=100000?x.nearbyRadiusMeters:undefined;
        item={...base,type:'campus',slug:x.slug,nearbyRadiusMeters:radius,url:`/search?campusId=${encodeURIComponent(x.id)}&universitySlugs=${encodeURIComponent(x.slug)}${radius?'&radiusKm='+radius/1000:''}`};
      }
      else if(x.type==='place'&&uuid.test(x.id)&&text(x.canonicalArea))item={...base,type:'place',canonicalArea:x.canonicalArea,url:`/search?placeId=${encodeURIComponent(x.id)}`};
      else continue;
      if(!result.some(r=>recentKey(r)===recentKey(item)))result.push(item);
      if(result.length===RECENT_SEARCH_LIMIT)break;
    }
    return result;
  } catch{return[];}
}
export function prependRecent(items:SearchSuggestion[],item:SearchSuggestion) {
  return [item,...items.filter(x=>recentKey(x)!==recentKey(item))].slice(0,RECENT_SEARCH_LIMIT);
}

import type { Listing } from '../../types/listing';

/** Call after matcher eligibility. Never reinsert a listing rejected by renter requirements. */
export function composePlacements(eligible:Listing[],sort:string,now=Date.now()):Listing[] {
  const normalized=eligible.map(l=>{
    if(!l.promotion) return l;
    const valid=l.status==='active' && l.availability==='available' && !!l.expiresAt && Date.parse(l.expiresAt)>now && Date.parse(l.promotion.endsAt)>now;
    if(!valid || (l.promotion.type==='bump' && sort!=='newest')) return {...l,promotion:undefined};
    return l;
  });
  const featured=normalized.filter(l=>l.promotion?.type==='featured').sort((a,b)=>a.promotion!.position-b.promotion!.position).slice(0,3);
  const selected=new Set(featured.map(l=>l.id));
  const organic=normalized.filter(l=>!selected.has(l.id));
  if(sort==='newest') organic.sort((a,b)=>{
    const legacy=(l:Listing)=>l.availability==='available' && Date.parse(l.boostedUntil??'')>now ? Date.parse(l.boostedUntil!) : 0;
    if(!a.promotion && !b.promotion && (legacy(a)||legacy(b))) return legacy(b)-legacy(a);
    const time=(l:Listing)=>Math.max(Date.parse(l.publishedAt??l.createdAt)||0,l.promotion?.type==='bump'?Date.parse(l.promotion.lastBumpedAt??'')||0:0);
    return time(b)-time(a)||a.id.localeCompare(b.id);
  });
  else if(sort==='rent_asc') organic.sort((a,b)=>a.monthlyRentUsd-b.monthlyRentUsd||a.id.localeCompare(b.id));
  return [...featured,...organic];
}

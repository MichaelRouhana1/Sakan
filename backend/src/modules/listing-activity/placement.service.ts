import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { getListingPromotions } from '../promotions/promotions.service.js';
import { cohortKey, rotateCampaigns, signPlacement } from './activity-policy.js';

export async function enrichPlacements<T extends Record<string,unknown>>(listings:T[], filters:{areas?:string[];campusId?:string;universitySlugs?:string[];sort?:string}, session?:string) {
  if(process.env.PROMOTION_PLACEMENT_ENABLED!=='true' || !z.string().uuid().safeParse(session).success) return listings;
  let market:string|null=null;
  if(filters.campusId) market=`campus:${filters.campusId}`;
  else if(filters.universitySlugs?.length===1) {
    const rows=await db.execute(sql`SELECT id FROM universities WHERE slug=${filters.universitySlugs[0]} AND active=true LIMIT 1`);
    if(rows[0]) market=`campus:${rows[0].id}`;
  } else if(!filters.universitySlugs?.length && filters.areas?.length===1) market=`area:${filters.areas[0]}`;
  const campaigns=await getListingPromotions(listings.map(l=>String(l.id)));
  const featured=campaigns.filter(c=>c.type==='featured' && c.marketKey===market);
  let order:string[]=[];
  if(featured.length && market) {
    const cohort=cohortKey(market,featured.map(c=>c.campaignId));
    order=await db.transaction(async tx=>{
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${cohort}))`);
      const saved=await tx.execute(sql`SELECT campaign_ids FROM promotion_search_allocations WHERE session_id=${session}::uuid AND cohort_key=${cohort}`);
      if(saved[0]) return saved[0].campaign_ids as string[];
      const counter=await tx.execute(sql`INSERT INTO promotion_rotation_counters(cohort_key,next_offset) VALUES (${cohort},1) ON CONFLICT(cohort_key) DO UPDATE SET next_offset=promotion_rotation_counters.next_offset+1 RETURNING next_offset`);
      const selected=rotateCampaigns(featured.map(c=>c.campaignId),Number(counter[0]!.next_offset)-1).slice(0,3);
      await tx.execute(sql`INSERT INTO promotion_search_allocations(session_id,cohort_key,campaign_ids) VALUES (${session}::uuid,${cohort},${JSON.stringify(selected)}::jsonb)`);
      return selected;
    });
  }
  const now=Date.now();
  return listings.map(l=>{
    const c=campaigns.find(c=>c.listingId===l.id && ((c.type==='featured' && order.includes(c.campaignId)) || c.type==='bump'));
    if(!c) return l;
    const position=c.type==='featured'?order.indexOf(c.campaignId):0;
    const token=signPlacement({v:1,listingId:String(l.id),boostId:c.campaignId,sessionId:session!,kind:c.type,position,issuedAt:now,exp:now+30*60_000});
    return {...l,promotion:{campaignId:c.campaignId,type:c.type,position,marketKey:c.marketKey,endsAt:c.endsAt,lastBumpedAt:c.lastBumpedAt,token,sessionId:session}};
  });
}

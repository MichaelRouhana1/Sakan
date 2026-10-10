import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { getPromotionCatalog } from '../../config/promotion-catalog.js';
import { ConflictError, InsufficientCreditsError, NotFoundError, ValidationError } from '../../lib/errors.js';
import { ensurePromotionWallet, type PromotionWalletTransaction as Tx } from '../credits/promotion-wallet.js';
import { eligibilityReasons, OPEN_STATUSES, remainingSeconds, unusedRefundUnits, beirutDate } from './promotions.policy.js';

type Row = Record<string, any>;
export async function promotionLock(tx: Tx) { await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('promotions'))`); }
async function ownedListing(tx: Tx, listingId: string, ownerId?: string) {
  const rows = await tx.execute(sql`SELECT l.*,unit_hidden_reason(l) AS hidden_reason,u.account_status,(SELECT count(*)::int FROM listing_photos p WHERE p.listing_id=l.id) AS photo_count,c.name AS campus_name,c.active AS campus_active FROM listings l JOIN users u ON u.id=l.poster_id LEFT JOIN universities c ON c.id=l.primary_campus_id WHERE l.id=${listingId}::uuid`);
  const row = rows[0] as Row | undefined;
  if (ownerId && (!row || row.poster_id !== ownerId)) throw new NotFoundError('Listing not found');
  return row;
}
function listingMarkets(l: Row) {
  const markets = [{key:`area:${l.area}`,kind:'area',label:String(l.area)}];
  if (l.primary_campus_id && l.campus_active) markets.push({key:`campus:${l.primary_campus_id}`,kind:'campus',label:String(l.campus_name)});
  return markets;
}
async function getCampaign(tx: Tx, id: string, owner?: string) {
  const result = await tx.execute(sql`SELECT * FROM promotion_campaigns WHERE id=${id}::uuid FOR UPDATE`);
  const c = result[0] as Row | undefined;
  if (!c || (owner && c.owner_id !== owner)) throw new NotFoundError('Promotion not found');
  return c;
}
function iso(value: any) { return value ? new Date(value).toISOString() : null; }
export async function campaignDto(c: Row, tx: Tx = db as unknown as Tx) {
  const ahead = c.status==='queued' ? await tx.execute(sql`SELECT count(*)::int AS n FROM promotion_campaigns WHERE status='queued' AND market_key=${c.market_key} AND (queued_at,id)<=(${iso(c.queued_at)}::timestamptz,${c.id}::uuid)`) : [];
  return { id:c.id,listingId:c.listing_id,listingTitle:c.listing_title,type:c.type,productId:c.product_id,durationDays:c.duration_days,pausable:c.pausable,marketKey:c.market_key,marketLabel:c.market_label,status:c.status,creditUnits:c.credit_units,credits:c.credit_units/100,spentUnits:c.spent_units,spentCredits:c.spent_units/100,refundedUnits:c.refunded_units,refundedCredits:c.refunded_units/100,remainingSeconds:remainingSeconds(c),startedAt:iso(c.started_at),endsAt:iso(c.ends_at),undoUntil:iso(c.undo_until),lastBumpedAt:iso(c.last_bumped_at),nextBumpAt:iso(c.next_bump_at),queuedAt:iso(c.queued_at),queuePosition:ahead.length?Number(ahead[0]?.n):null,autoRenew:c.auto_renew,stopReason:c.stop_reason,createdAt:iso(c.created_at) };
}
async function notice(tx:Tx,c:Row,kind:string,message:string) {
  await tx.execute(sql`INSERT INTO promotion_notifications(owner_id,campaign_id,kind,message) VALUES (${c.owner_id}::uuid,${c.id}::uuid,${kind},${message}) ON CONFLICT DO NOTHING`);
}
async function refundTarget(tx:Tx,c:Row,target:number,reason:string) {
  const amount = Math.max(0,Math.min(Number(c.spent_units),target)-Number(c.refunded_units));
  if (!amount) return;
  await ensurePromotionWallet(tx,c.owner_id);
  const next = Number(c.refunded_units)+amount;
  const inserted = await tx.execute(sql`INSERT INTO promotion_wallet_ledger(user_id,campaign_id,operation_key,delta_units,reason) VALUES (${c.owner_id}::uuid,${c.id}::uuid,${`${c.id}:refund:${next}`},${amount},${reason}) ON CONFLICT DO NOTHING RETURNING id`);
  if (!inserted.length) return;
  await tx.execute(sql`UPDATE users SET boost_credits=boost_credits+${amount},updated_at=now() WHERE id=${c.owner_id}::uuid`);
  await tx.execute(sql`UPDATE promotion_campaigns SET refunded_units=${next},updated_at=now() WHERE id=${c.id}::uuid`);
  c.refunded_units=next;
}
async function closeInterval(tx:Tx,c:Row,at:Date) {
  const seconds=remainingSeconds(c,at);
  await tx.execute(sql`UPDATE promotion_service_intervals SET ended_at=GREATEST(started_at,${iso(at)}) WHERE campaign_id=${c.id}::uuid AND ended_at IS NULL`);
  await tx.execute(sql`UPDATE promotion_campaigns SET status='paused',remaining_seconds=${seconds},active_since=NULL,slot_index=NULL,next_bump_at=NULL,updated_at=now() WHERE id=${c.id}::uuid`);
  c.remaining_seconds=seconds; c.active_since=null;
}
async function stopCampaign(tx:Tx,c:Row,reason:string,at:Date,full=false) {
  if (!OPEN_STATUSES.includes(c.status) && !full) return;
  if (c.status==='active') await closeInterval(tx,c,at);
  const missed = await tx.execute(sql`SELECT coalesce(sum(delta_units),0)::int AS n FROM promotion_wallet_ledger WHERE campaign_id=${c.id}::uuid AND reason='missed_bump'`);
  const target=full?Number(c.spent_units):unusedRefundUnits(Number(c.credit_units),Number(c.remaining_seconds),Number(c.duration_days))+Number(missed[0]?.n??0);
  await refundTarget(tx,c,target,reason);
  const state=full?'refunded':Number(c.spent_units)>0?'stopped':'cancelled';
  await tx.execute(sql`UPDATE promotion_campaigns SET status=${state},auto_renew=false,stop_reason=${reason},slot_index=NULL,active_since=NULL,ends_at=${iso(at)},next_bump_at=NULL,updated_at=now() WHERE id=${c.id}::uuid`);
  const reasons: Record<string,string> = { listing_expired:'the listing expired', under_offer:'the listing is under offer', listing_rented:'the listing was marked rented', rented:'the listing was marked rented', listing_archived:'the listing was archived', archive:'the listing was archived', listing_deleted:'the listing was deleted', listing_removed:'the listing was removed', listing_ineligible:'the listing no longer meets the requirements', target_changed:'the listing area or campus changed', account_restricted:'the host account is restricted', account_removed:'the host account was removed', host_stopped:'you stopped this run', purchase_undone:'you undid the purchase' };
  await notice(tx,c,'stopped',`Promotion stopped because ${reasons[reason] ?? 'it is no longer eligible'}. ${(Number(c.refunded_units)/100).toFixed(2)} credits returned.`);
}
/** Caller takes promotionLock before locking listing/user, then mutates listing and calls this. */
export async function stopListingPromotions(tx:Tx,listingId:string,reason:string,effectiveAt=new Date()) {
  const [listing] = await tx.execute(sql`SELECT expires_at FROM listings WHERE id=${listingId}::uuid`);
  if (listing?.expires_at && new Date(String(listing.expires_at)) < effectiveAt) effectiveAt = new Date(String(listing.expires_at));
  const rows=await tx.execute(sql`SELECT * FROM promotion_campaigns WHERE listing_id=${listingId}::uuid AND status IN ('active','queued','paused','action_needed') FOR UPDATE`);
  for (const c of rows as Row[]) await stopCampaign(tx,c,reason,effectiveAt);
}
export async function recheckListingPromotions(tx:Tx,listingId:string) {
  const l=await ownedListing(tx,listingId);
  if (!l) return stopListingPromotions(tx,listingId,'listing_deleted');
  if (eligibilityReasons(l).length) return stopListingPromotions(tx,listingId,'listing_ineligible');
  const markets=listingMarkets(l).map(m=>m.key);
  const rows=await tx.execute(sql`SELECT * FROM promotion_campaigns WHERE listing_id=${listingId}::uuid AND status IN ('active','queued','paused','action_needed') FOR UPDATE`);
  for (const c of rows as Row[]) if (!markets.includes(c.market_key)) await stopCampaign(tx,c,'target_changed',new Date());
}
async function nextBump(tx:Tx,anchor:Date) {
  const rows=await tx.execute(sql`SELECT ((${iso(anchor)}::timestamptz AT TIME ZONE 'Asia/Beirut')+interval '1 day') AT TIME ZONE 'Asia/Beirut' AS at`);
  return new Date(String(rows[0]!.at));
}
async function executeBump(tx:Tx,c:Row,now:Date) {
  const inserted=await tx.execute(sql`INSERT INTO promotion_bump_executions(campaign_id,local_date,executed_at) VALUES (${c.id}::uuid,${beirutDate(now)},${iso(now)}) ON CONFLICT DO NOTHING RETURNING campaign_id`);
  if(inserted.length) await tx.execute(sql`UPDATE promotion_campaigns SET last_bumped_at=${iso(now)},updated_at=now() WHERE id=${c.id}::uuid`);
}
async function activate(tx:Tx,c:Row,now:Date) {
  if(process.env.PROMOTION_PLACEMENT_ENABLED!=='true' || !getPromotionCatalog().salesEnabled) return false;
  const legacy = await tx.execute(sql`SELECT id FROM listings WHERE boosted_until>now() LIMIT 1`);
  if (legacy.length) throw new ConflictError('Promotion setup is being completed. Please try again later.');
  const l=c.listing_id?await ownedListing(tx,c.listing_id):undefined;
  const reasons=eligibilityReasons(l,now);
  if(reasons.length || (l&&!listingMarkets(l).some(m=>m.key===c.market_key))) {
    if(c.spent_units>0) await stopCampaign(tx,c,'listing_ineligible',now);
    else await tx.execute(sql`UPDATE promotion_campaigns SET status='action_needed',stop_reason='listing_ineligible',auto_renew=false WHERE id=${c.id}::uuid`);
    return false;
  }
  let slot:number|null=null;
  if(c.type==='featured') {
    const used=await tx.execute(sql`SELECT slot_index FROM promotion_campaigns WHERE status='active' AND type='featured' AND market_key=${c.market_key}`);
    slot=[1,2,3].slice(0,getPromotionCatalog().capacity).find(n=>!used.some(r=>Number(r.slot_index)===n))??null;
    if(slot==null) return false;
  }
  const wallet=await ensurePromotionWallet(tx,c.owner_id);
  if(c.spent_units===0 && wallet.boostCreditUnits<c.credit_units) {
    await tx.execute(sql`UPDATE promotion_campaigns SET status='action_needed',stop_reason='insufficient_credits',auto_renew=false WHERE id=${c.id}::uuid`);
    await notice(tx,c,'balance_needed','Add credits and rejoin the queue to start this promotion.');
    return false;
  }
  if(c.spent_units===0) {
    await tx.execute(sql`UPDATE users SET boost_credits=boost_credits-${c.credit_units},updated_at=now() WHERE id=${c.owner_id}::uuid`);
    await tx.execute(sql`INSERT INTO promotion_wallet_ledger(user_id,campaign_id,operation_key,delta_units,reason) VALUES (${c.owner_id}::uuid,${c.id}::uuid,${`${c.id}:purchase`},${-Number(c.credit_units)},'purchase')`);
  }
  const endsAt=new Date(now.getTime()+Number(c.remaining_seconds)*1000);
  const undoUntil=c.undo_until?new Date(c.undo_until):new Date(now.getTime()+getPromotionCatalog().undoMinutes*60_000);
  const bumpAt=c.type==='bump'?await nextBump(tx,now):null;
  await tx.execute(sql`UPDATE promotion_campaigns SET status='active',spent_units=credit_units,started_at=COALESCE(started_at,${iso(now)}),active_since=${iso(now)},ends_at=${iso(endsAt)},undo_until=${iso(undoUntil)},slot_index=${slot},next_bump_at=${iso(bumpAt)},stop_reason=NULL,updated_at=now() WHERE id=${c.id}::uuid`);
  await tx.execute(sql`INSERT INTO promotion_service_intervals(campaign_id,started_at) VALUES (${c.id}::uuid,${iso(now)})`);
  if(c.type==='bump') await executeBump(tx,c,now);
  await notice(tx,c,'started',`Your ${c.type==='featured'?'Featured':'Bump'} placement has started.`);
  return true;
}
async function reconcile(tx:Tx,now:Date) {
  const rows=await tx.execute(sql`SELECT * FROM promotion_campaigns WHERE status IN ('active','queued','paused','action_needed') ORDER BY created_at FOR UPDATE`);
  for(const c of rows as Row[]) {
    const l=c.listing_id?await ownedListing(tx,c.listing_id):undefined;
    const expired=l?.expires_at && new Date(l.expires_at)<=now;
    if(eligibilityReasons(l,now).length || (l&&!listingMarkets(l).some(m=>m.key===c.market_key))) {
      const effective=expired?new Date(l!.expires_at):now;
      await stopCampaign(tx,c,expired?'listing_expired':'listing_ineligible',effective); continue;
    }
    if(c.status!=='active') continue;
    // Missed execution windows are credited, never replayed in a burst.
    if(c.type==='bump' && c.next_bump_at) {
      let due=new Date(c.next_bump_at); let missed=0;
      while(due<=now && due<new Date(c.ends_at)) {
        // A short DST day must not create a fourth bump in a three-day product.
        const localDay = (Date.parse(beirutDate(due)) - Date.parse(beirutDate(new Date(c.started_at)))) / 86400_000;
        if (localDay >= Number(c.duration_days)) { due = new Date(c.ends_at); break; }
        const following=await nextBump(tx,due);
        if(following<=now || now>=new Date(c.ends_at)) missed++;
        else await executeBump(tx,c,now);
        due=following;
      }
      if(missed) await refundTarget(tx,c,Number(c.refunded_units)+Math.ceil(Number(c.credit_units)*missed/Number(c.duration_days)),'missed_bump');
      await tx.execute(sql`UPDATE promotion_campaigns SET next_bump_at=${iso(due)} WHERE id=${c.id}::uuid`);
    }
    if(new Date(c.ends_at)<=now) {
      await closeInterval(tx,c,new Date(c.ends_at));
      await tx.execute(sql`UPDATE promotion_campaigns SET status='completed',remaining_seconds=0,slot_index=NULL,updated_at=now() WHERE id=${c.id}::uuid`);
      if(c.auto_renew) {
        const catalog=getPromotionCatalog(); const product=catalog.products.find(p=>p.id===c.product_id);
        if(!catalog.salesEnabled || !product || product.creditUnits!==c.credit_units) {
          await tx.execute(sql`UPDATE promotion_campaigns SET auto_renew=false WHERE id=${c.id}::uuid`);
          await notice(tx,c,'renewal_changed','Promotion ended. Review current prices before renewing.');
        } else {
          await tx.execute(sql`INSERT INTO promotion_campaigns(owner_id,listing_id,listing_id_snapshot,listing_title,listing_published_at,type,product_id,catalog_version,duration_days,pausable,credit_units,status,market_key,market_label,remaining_seconds,queued_at,auto_renew,idempotency_key,renewed_from_id) VALUES (${c.owner_id}::uuid,${c.listing_id}::uuid,${c.listing_id_snapshot}::uuid,${c.listing_title},${iso(l!.published_at)},${c.type},${c.product_id},${catalog.version},${c.duration_days},${c.pausable},${c.credit_units},'queued',${c.market_key},${c.market_label},${c.duration_days*86400},${iso(now)},true,${`renew:${c.id}`},${c.id}::uuid) ON CONFLICT DO NOTHING`);
        }
      }
    } else if(c.auto_renew && !c.renewal_notified_at && new Date(c.ends_at).getTime()-now.getTime()<=86400_000) {
      await notice(tx,c,'renewal_due',`Auto-renew will use ${c.credit_units/100} wallet credits when capacity is available after this run. Turn it off in Manage promotion.`);
      await tx.execute(sql`UPDATE promotion_campaigns SET renewal_notified_at=${iso(now)} WHERE id=${c.id}::uuid`);
    }
  }
}
async function drainQueue(tx:Tx,now:Date) {
  const rows=await tx.execute(sql`SELECT * FROM promotion_campaigns WHERE status='queued' ORDER BY queued_at,id FOR UPDATE`);
  let started=0;
  for(const c of rows as Row[]) if(await activate(tx,c,now)) started++;
  return started;
}
export async function processPromotions(now=new Date()) {
  return db.transaction(async tx=>{await promotionLock(tx);await reconcile(tx,now);const started=await drainQueue(tx,now);await tx.execute(sql`DELETE FROM promotion_search_allocations WHERE created_at<now()-interval '1 day'`);await tx.execute(sql`DELETE FROM promotion_rotation_counters c WHERE NOT EXISTS (SELECT 1 FROM promotion_search_allocations a WHERE a.cohort_key=c.cohort_key)`);return {started};});
}
export async function promotionOptions(ownerId:string,listingId:string) {
  return db.transaction(async tx=>{
    await promotionLock(tx);
    const l=(await ownedListing(tx,listingId,ownerId))!;
    const wallet=await ensurePromotionWallet(tx,ownerId);
    const campaigns=await tx.execute(sql`SELECT * FROM promotion_campaigns WHERE owner_id=${ownerId}::uuid AND listing_id=${listingId}::uuid AND status IN ('active','queued','paused','action_needed') LIMIT 1`);
    const markets=[];
    for(const m of listingMarkets(l)) {
      const stats=await tx.execute(sql`SELECT count(*) FILTER(WHERE status='active' AND ends_at>now())::int AS active,count(*) FILTER(WHERE status='queued')::int AS queued,min(ends_at) FILTER(WHERE status='active' AND ends_at>now()) AS next FROM promotion_campaigns WHERE market_key=${m.key} AND type='featured'`);
      const s=stats[0]!;
      markets.push({...m,capacity:getPromotionCatalog().capacity,availableSlots:Math.max(0,getPromotionCatalog().capacity-Number(s.active)),queueLength:Number(s.queued),nextOpeningAt:Number(s.queued)===0?iso(s.next):null});
    }
    const reasons=eligibilityReasons(l);
    return {listingId,listingTitle:String(l.title || l.area),eligible:reasons.length===0,reasons,markets,balanceCredits:wallet.boostCredits,balanceUnits:wallet.boostCreditUnits,expiresAt:iso(l.expires_at),currentCampaign:campaigns[0]?await campaignDto(campaigns[0],tx):null};
  });
}
export type CreatePromotion={listingId:string;productId:string;marketKey?:string;mode:'start'|'queue';autoRenew:boolean;catalogVersion:string;idempotencyKey:string};
export async function createPromotion(ownerId:string,input:CreatePromotion) {
  return db.transaction(async tx=>{
    await promotionLock(tx);
    const existing=await tx.execute(sql`SELECT * FROM promotion_campaigns WHERE owner_id=${ownerId}::uuid AND idempotency_key=${input.idempotencyKey}`);
    if(existing[0]) {
      if(existing[0].listing_id!==input.listingId || existing[0].product_id!==input.productId || (input.marketKey&&existing[0].market_key!==input.marketKey)) throw new ConflictError('This purchase key was already used for another selection');
      return campaignDto(existing[0],tx);
    }
    const catalog=getPromotionCatalog();
    if(!catalog.salesEnabled || process.env.PROMOTION_PLACEMENT_ENABLED!=='true') throw new ConflictError('Promotion prices are TBD. Sales are not open yet.');
    if(input.catalogVersion!==catalog.version) throw new ConflictError('Prices changed. Review the current quote.');
    const product=catalog.products.find(p=>p.id===input.productId);
    if(!product || product.priceStatus!=='published') throw new ValidationError('Choose a published promotion');
    const l=(await ownedListing(tx,input.listingId,ownerId))!;
    const reasons=eligibilityReasons(l); if(reasons.length) throw new ValidationError(reasons.join(' '));
    const market=listingMarkets(l).find(m=>m.key===(input.marketKey??`area:${l.area}`));
    if(!market) throw new ValidationError('Choose this listing’s area or primary campus');
    await reconcile(tx,new Date()); await drainQueue(tx,new Date());
    const open=await tx.execute(sql`SELECT id FROM promotion_campaigns WHERE listing_id=${input.listingId}::uuid AND status IN ('active','queued','paused','action_needed')`);
    if(open.length) throw new ConflictError('Manage the existing promotion before starting another.');
    const wallet=await ensurePromotionWallet(tx,ownerId);
    if(input.mode==='start' && wallet.boostCreditUnits<product.creditUnits) throw new InsufficientCreditsError();
    const inserted=await tx.execute(sql`INSERT INTO promotion_campaigns(owner_id,listing_id,listing_id_snapshot,listing_title,listing_published_at,type,product_id,catalog_version,duration_days,pausable,credit_units,status,market_key,market_label,remaining_seconds,queued_at,auto_renew,idempotency_key) VALUES (${ownerId}::uuid,${l.id}::uuid,${l.id}::uuid,${l.title},${iso(l.published_at)},${product.type},${product.id},${catalog.version},${product.durationDays},${product.pausable},${product.creditUnits},'queued',${market.key},${market.label},${product.durationDays*86400},now(),${input.autoRenew},${input.idempotencyKey}) RETURNING *`);
    const c=inserted[0]!;
    if(input.mode==='start' || product.type==='bump') {
      const ahead=await tx.execute(sql`SELECT id FROM promotion_campaigns WHERE market_key=${market.key} AND status='queued' AND type='featured' AND id<>${c.id}::uuid LIMIT 1`);
      if(product.type==='featured'&&ahead.length) throw new ConflictError('Hosts are already waiting. Join the queue.');
      if(!await activate(tx,c,new Date())) throw new ConflictError('The area just filled. Join the queue.');
    }
    return campaignDto(await getCampaign(tx,String(c.id)),tx);
  });
}
export async function campaignAction(ownerId:string,id:string,action:string,enabled?:boolean) {
  return db.transaction(async tx=>{
    await promotionLock(tx); const c=await getCampaign(tx,id,ownerId); const now=new Date();
    if(action==='undo') {
      if(c.status==='refunded') return campaignDto(c,tx);
      if(!c.undo_until||new Date(c.undo_until)<=now||!c.spent_units) throw new ConflictError('The undo window has ended.');
      await stopCampaign(tx,c,'purchase_undone',now,true);
    } else if(action==='stop'||action==='cancel') {
      await stopCampaign(tx,c,'host_stopped',now);
    } else if(action==='pause') {
      if(c.status==='paused') return campaignDto(c,tx);
      if(c.status!=='active'||!c.pausable||new Date(c.ends_at)<=now) throw new ConflictError('Only an active 14- or 30-day Featured run can pause.');
      await closeInterval(tx,c,now);
      await tx.execute(sql`UPDATE promotion_campaigns SET status='paused',ends_at=NULL WHERE id=${id}::uuid`);
    } else if(action==='resume') {
      if(['queued','active'].includes(c.status)) return campaignDto(c,tx);
      if(!['paused','action_needed'].includes(c.status)) throw new ConflictError('This promotion cannot resume.');
      const l=c.listing_id?await ownedListing(tx,c.listing_id,ownerId):undefined;
      const reasons=eligibilityReasons(l); if(reasons.length) throw new ValidationError(reasons.join(' '));
      await tx.execute(sql`UPDATE promotion_campaigns SET status='queued',queued_at=${iso(now)},stop_reason=NULL WHERE id=${id}::uuid`);
      await reconcile(tx,now);await drainQueue(tx,now);
    } else if(action==='auto-renew') {
      if(!OPEN_STATUSES.includes(c.status)) throw new ConflictError('This promotion has ended.');
      if(enabled) { const cat=getPromotionCatalog();if(!cat.salesEnabled||cat.products.find(p=>p.id===c.product_id)?.creditUnits!==c.credit_units) throw new ConflictError('Review the current price before enabling auto-renew.'); }
      await tx.execute(sql`UPDATE promotion_campaigns SET auto_renew=${!!enabled},updated_at=now() WHERE id=${id}::uuid`);
    } else throw new ValidationError('Unknown promotion action');
    return campaignDto(await getCampaign(tx,id),tx);
  });
}
export async function listPromotions(ownerId:string,listingId:string) {
  const rows=await db.execute(sql`SELECT * FROM promotion_campaigns WHERE owner_id=${ownerId}::uuid AND listing_id_snapshot=${listingId}::uuid ORDER BY created_at DESC`);
  return Promise.all(rows.map(row=>campaignDto(row)));
}
export async function readPromotion(ownerId:string,id:string) {
  const rows=await db.execute(sql`SELECT * FROM promotion_campaigns WHERE id=${id}::uuid AND owner_id=${ownerId}::uuid`);
  if(!rows[0]) throw new NotFoundError('Promotion not found');
  return campaignDto(rows[0]);
}
export async function getListingPromotions(ids:string[]) {
  if(!ids.length || process.env.PROMOTION_PLACEMENT_ENABLED!=='true') return [];
  const rows=await db.execute(sql`SELECT c.* FROM promotion_campaigns c JOIN listings l ON l.id=c.listing_id JOIN users u ON u.id=c.owner_id WHERE c.listing_id IN (${sql.join(ids.map(id=>sql`${id}::uuid`),sql`,`)}) AND c.status='active' AND c.ends_at>now() AND l.status='active' AND unit_hidden_reason(l) IS NULL AND l.availability='available' AND l.expires_at>now() AND u.account_status NOT IN ('restricted','banned')`);
  return rows.map(c=>({campaignId:String(c.id),listingId:String(c.listing_id),type:String(c.type) as 'featured'|'bump',marketKey:String(c.market_key),startedAt:iso(c.started_at),endsAt:iso(c.ends_at)!,lastBumpedAt:iso(c.last_bumped_at)}));
}
export async function promotionNotices(ownerId:string) {
  return db.execute(sql`SELECT id,campaign_id AS "campaignId",kind,message,created_at AS "createdAt" FROM promotion_notifications WHERE owner_id=${ownerId}::uuid ORDER BY created_at DESC LIMIT 30`);
}

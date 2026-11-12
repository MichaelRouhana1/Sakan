import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';
import { promotionLock } from '../promotions/promotions.service.js';
import { lockInventory } from './inventory.service.js';
import { listingExpiryRepository } from './listing-expiry.repository.js';
import { expiryNotificationsRepository, type ExpiryCandidate, type NotificationKind } from './expiry-notifications.repository.js';
import { expiryNotificationsService } from './expiry-notifications.service.js';

export const unitAutoRenew = {
  async list(ownerId: string, listingId?: string) {
    return db.execute(sql`
      SELECT l.id,l.auto_renew AS enabled,l.expires_at AS "expiresAt",l.status,
        CASE WHEN l.inventory_needs_confirmation OR (l.unit_type='shared_bed' AND COALESCE(l.beds_available,0)<=0) THEN 'beds'
          WHEN l.availability<>'available' OR unit_hidden_reason(l) IS NOT NULL THEN 'unavailable'
          WHEN u.account_status IN ('restricted','banned') THEN 'account'
          WHEN u.post_credits < (SELECT count(*) FROM listings a WHERE a.poster_id=l.poster_id AND a.auto_renew
            AND a.status='active' AND a.availability='available' AND NOT a.inventory_needs_confirmation
            AND unit_hidden_reason(a) IS NULL AND a.expires_at>now()
            AND (a.unit_type<>'shared_bed' OR COALESCE(a.beds_available,0)>0)
            AND (a.expires_at,a.id)<=(l.expires_at,l.id)) THEN 'credits' ELSE NULL END AS blocked
      FROM listings l JOIN users u ON u.id=l.poster_id
      WHERE l.poster_id=${ownerId}::uuid
        ${listingId ? sql`AND l.id=${listingId}::uuid` : sql``}`);
  },
  async view(ownerId: string, listingId: string) {
    const [row] = await this.list(ownerId, listingId);
    if (!row) throw new NotFoundError('Unit not found');
    return row;
  },
  async set(ownerId: string, listingId: string, enabled: boolean) {
    await db.transaction(async tx => {
      await promotionLock(tx);
      const row = await lockInventory(tx, listingId, ownerId);
      if (enabled && (row.status !== 'active' || row.availability === 'rented' || !row.expires_at || new Date(String(row.expires_at)) <= new Date())) {
        throw new ConflictError('Renew this unit before enabling auto-renew');
      }
      await tx.execute(sql`UPDATE listings SET auto_renew=${enabled},updated_at=now() WHERE id=${listingId}::uuid`);
    });
    return this.view(ownerId, listingId);
  },
};

type Notify = (candidate: ExpiryCandidate, kind: Exclude<NotificationKind,'admin_escalation'>) => Promise<unknown>;

/** The hourly worker only charges in (expiry - 1 hour, expiry), never after expiry. */
export async function processUnitAutoRenewals(
  now = new Date(),
  options: { listingIds?: string[]; notify?: Notify } = {},
) {
  const notify = options.notify ?? ((candidate,kind) => expiryNotificationsService.sendHost(candidate,kind));
  const candidates = (await expiryNotificationsRepository.preExpiryCandidates(now))
    .filter(c => !options.listingIds || options.listingIds.includes(c.listingId))
    .sort((a,b) => a.cycleExpiresAt.getTime()-b.cycleExpiresAt.getTime() || a.listingId.localeCompare(b.listingId));
  const results: { listingId: string; state: string }[] = [];
  for (const candidate of candidates) {
    const state = await unitAutoRenew.view(candidate.posterId,candidate.listingId);
    if (!state.enabled) continue;
    if (state.blocked === 'credits' || state.blocked === 'beds') {
      await notify(candidate,state.blocked === 'credits' ? 'renewal_credit_needed' : 'renewal_beds_needed');
    }
    if (candidate.cycleExpiresAt.getTime()-now.getTime()>3600000) continue;
    if (state.blocked) {
      results.push({listingId:candidate.listingId,state:String(state.blocked)});
      continue;
    }
    try {
      // Recheck real time after acquiring the locks. A slow hourly run must not
      // charge using its start time after the unit has already expired.
      const renewed = await listingExpiryRepository.renew(candidate.listingId,candidate.posterId,candidate.cycleExpiresAt,{automatic:true});
      if (renewed.alreadyRenewed) continue;
      results.push({listingId:candidate.listingId,state:'renewed'});
      await notify(candidate,'renewal_succeeded');
    } catch (error) {
      // The renewal transaction rolls back both the charge and the event on failure.
      if (!(error instanceof ConflictError) && (error as {statusCode?:number}).statusCode !== 402) throw error;
      results.push({listingId:candidate.listingId,state:'blocked'});
      await notify(candidate,(error as {statusCode?:number}).statusCode === 402 ? 'renewal_credit_needed' : 'renewal_failed');
    }
  }
  return results;
}

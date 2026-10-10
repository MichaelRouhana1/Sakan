import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import { actorKey, costPerTap, verifyPlacement, type ActivityActor, type ActivityInput } from './activity-policy.js';

type Row = Record<string, any>;
export async function recordActivity(listingId: string, kind: 'view' | 'contact_tap' | 'featured_impression', input: ActivityInput, actor: ActivityActor, measurement?: string) {
  const key = actorKey(actor, input.sessionId);
  const eventId = input.eventId ?? randomUUID();
  return db.transaction(async tx => {
    // Serialize per listing: durable tap-window check and aggregate update share one transaction.
    const rows = await tx.execute(sql`SELECT id,poster_id,status,availability,expires_at,view_count,contact_tap_count FROM listings WHERE id=${listingId}::uuid FOR UPDATE`);
    const listing = rows[0] as Row | undefined;
    if (!listing) throw new NotFoundError('Listing not found');
    const unchanged = { id: listingId, viewCount: Number(listing.view_count), leadCount: Number(listing.contact_tap_count), counted: false };
    if (listing.poster_id === actor.userId || listing.status !== 'active' || listing.availability === 'rented' || !listing.expires_at || new Date(listing.expires_at).getTime() <= Date.now()) return unchanged;
    let boostId: string | null = null;
    const placement = verifyPlacement(input.placementToken, listingId, input.sessionId);
    if (placement) {
      const active = await tx.execute(sql`SELECT id FROM promotion_campaigns WHERE id=${placement.boostId}::uuid AND listing_id=${listingId}::uuid AND status='active' AND ends_at>now() AND active_since<=now() AND type=${placement.kind} AND ${listing.availability}='available'`);
      if (active.length) boostId = placement.boostId;
    }
    if (kind === 'featured_impression' && (!boostId || placement?.kind !== 'featured')) return unchanged;
    if (kind === 'contact_tap') {
      const recent = await tx.execute(sql`SELECT id FROM listing_activity_events WHERE listing_id_snapshot=${listingId}::uuid AND actor_key=${key} AND kind='contact_tap' AND occurred_at>now()-interval '15 seconds' LIMIT 1`);
      if (recent.length) return unchanged;
    }
    const dedupe = kind === 'featured_impression' ? `${boostId}:${listingId}:${input.sessionId}:impression` : null;
    const inserted = await tx.execute(sql`INSERT INTO listing_activity_events(event_id,listing_id,listing_id_snapshot,boost_id,kind,actor_key,session_id,platform,measurement,dedupe_key) VALUES (${eventId}::uuid,${listingId}::uuid,${listingId}::uuid,${boostId}::uuid,${kind},${key},${input.sessionId ?? null}::uuid,${input.platform},${measurement ?? null},${dedupe}) ON CONFLICT DO NOTHING RETURNING id`);
    if (!inserted.length) return unchanged;
    await tx.execute(sql`INSERT INTO listing_activity_coverage(id) VALUES ('listing_activity') ON CONFLICT DO NOTHING`);
    if (kind === 'view') await tx.execute(sql`UPDATE listings SET view_count=view_count+1 WHERE id=${listingId}::uuid`);
    if (kind === 'contact_tap') await tx.execute(sql`UPDATE listings SET contact_tap_count=contact_tap_count+1 WHERE id=${listingId}::uuid`);
    return { ...unchanged, counted: true, viewCount: unchanged.viewCount + Number(kind === 'view'), leadCount: unchanged.leadCount + Number(kind === 'contact_tap') };
  });
}

export async function recentListingActivity(listingId: string, now = new Date()) {
  const start = new Date(now.getTime() - 7 * 86400_000);
  const coverage = await db.execute(sql`SELECT started_at FROM listing_activity_coverage WHERE id='listing_activity'`);
  const started = coverage[0]?.started_at ? new Date(String(coverage[0].started_at)) : null;
  const result = await db.execute(sql`SELECT count(*) FILTER(WHERE kind='view')::int AS views,count(*) FILTER(WHERE kind='contact_tap')::int AS taps FROM listing_activity_events WHERE listing_id_snapshot=${listingId}::uuid AND occurred_at>=${start.toISOString()} AND occurred_at<${now.toISOString()}`);
  return { views: Number(result[0]?.views ?? 0), whatsappTaps: Number(result[0]?.taps ?? 0), historyComplete: !!started && started <= start, days: 7 as const };
}

export async function getCampaignAnalytics(userId: string, campaignId: string) {
  const campaigns = await db.execute(sql`SELECT * FROM promotion_campaigns WHERE id=${campaignId}::uuid AND owner_id=${userId}::uuid`);
  const campaign = campaigns[0] as Row | undefined;
  if (!campaign) throw new NotFoundError('Promotion not found');
  const now = new Date();
  const intervals = await db.execute(sql`SELECT started_at,LEAST(COALESCE(ended_at,${now.toISOString()}),COALESCE(${campaign.ends_at}::timestamptz,${now.toISOString()}),${now.toISOString()}) AS ended_at FROM promotion_service_intervals WHERE campaign_id=${campaignId}::uuid ORDER BY started_at`);
  const spans = intervals.map(row => ({ from: new Date(String(row.started_at)), to: new Date(String(row.ended_at)) })).filter(span => span.to >= span.from);
  const activeSeconds = spans.reduce((sum, span) => sum + (span.to.getTime() - span.from.getTime()) / 1000, 0);
  const from = spans[0]?.from ?? null;
  const beforeStart = from ? new Date(from.getTime() - activeSeconds * 1000) : null;
  const coverage = await db.execute(sql`SELECT started_at FROM listing_activity_coverage WHERE id='listing_activity'`);
  const coverageStarted = coverage[0]?.started_at ? new Date(String(coverage[0].started_at)) : null;
  const listingId = campaign.listing_id ?? campaign.listing_id_snapshot;
  const periods = spans.map(span => sql`(occurred_at>=${span.from.toISOString()} AND occurred_at<${span.to.toISOString()})`);
  const during = periods.length && listingId ? await db.execute(sql`SELECT count(*) FILTER(WHERE kind='view')::int AS views,count(*) FILTER(WHERE kind='contact_tap')::int AS taps FROM listing_activity_events WHERE listing_id_snapshot=${listingId}::uuid AND (${sql.join(periods,sql` OR `)})`) : [];
  const publishedAt = campaign.listing_published_at ? new Date(String(campaign.listing_published_at)) : null;
  const available = (!publishedAt || (!!beforeStart && publishedAt <= beforeStart)) && !!beforeStart && !!coverageStarted && coverageStarted <= beforeStart && activeSeconds > 0;
  const before = available && listingId ? await db.execute(sql`SELECT count(*) FILTER(WHERE kind='view')::int AS views,count(*) FILTER(WHERE kind='contact_tap')::int AS taps FROM listing_activity_events WHERE listing_id_snapshot=${listingId}::uuid AND occurred_at>=${beforeStart?.toISOString() ?? null} AND occurred_at<${from?.toISOString() ?? null}`) : [];
  const attributed = await db.execute(sql`SELECT count(*) FILTER(WHERE kind='contact_tap')::int AS taps,count(*) FILTER(WHERE kind='featured_impression')::int AS impressions,count(*) FILTER(WHERE kind='featured_impression' AND measurement='web_viewable')::int AS web,count(*) FILTER(WHERE kind='featured_impression' AND measurement='expo_viewport')::int AS expo FROM listing_activity_events WHERE boost_id=${campaignId}::uuid`);
  const prior = from && beforeStart && listingId ? await db.execute(sql`SELECT 1 FROM promotion_service_intervals i JOIN promotion_campaigns c ON c.id=i.campaign_id WHERE c.listing_id=${listingId}::uuid AND c.id<>${campaignId}::uuid AND i.started_at<${from?.toISOString() ?? null} AND COALESCE(i.ended_at,${now.toISOString()})>${beforeStart?.toISOString() ?? null} LIMIT 1`) : [];
  const totals = attributed[0] ?? {};
  return {
    campaignId, status: campaign.status,
    period: { from: from?.toISOString() ?? null, to: now.toISOString(), activeSeconds },
    previousPeriod: { from: beforeStart?.toISOString() ?? null, to: from?.toISOString() ?? null, available, coverageStartedAt: coverageStarted?.toISOString() ?? null, hadPromotion: prior.length > 0 },
    during: { views: Number(during[0]?.views ?? 0), whatsappTaps: Number(during[0]?.taps ?? 0) },
    before: available ? { views: Number(before[0]?.views ?? 0), whatsappTaps: Number(before[0]?.taps ?? 0) } : null,
    impressions: { total: Number(totals.impressions ?? 0), webViewable: Number(totals.web ?? 0), expoViewport: Number(totals.expo ?? 0) },
    attributedTaps: Number(totals.taps ?? 0), creditsSpent: Number(campaign.spent_units)/100, creditsRefunded: Number(campaign.refunded_units)/100,
    costPerWhatsappTap: costPerTap(Number(campaign.spent_units),Number(campaign.refunded_units),Number(totals.taps ?? 0)),
    provisional: ['active','queued','paused'].includes(campaign.status),
  };
}

export function assertImpressionMeasurement(platform: string, measurement: string) {
  if ((platform === 'web' && measurement === 'web_viewable') || (['ios','android'].includes(platform) && measurement === 'expo_viewport')) return;
  throw new ValidationError('Impression measurement does not match this platform');
}

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export const activityInputSchema = z.object({
  eventId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  platform: z.enum(['web', 'ios', 'android', 'unknown']).default('unknown'),
  placementToken: z.string().max(4096).optional(),
});
export type ActivityInput = z.infer<typeof activityInputSchema>;
export type ActivityActor = { userId?: string | null; ip?: string | null };
export type Placement = {
  v: 1; listingId: string; boostId: string; sessionId: string;
  kind: 'featured' | 'bump'; position: number; issuedAt: number; exp: number;
};
export function activitySecret() {
  const secret = process.env.PROMOTION_ATTRIBUTION_SECRET || process.env.CLERK_SECRET_KEY;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') throw new Error('PROMOTION_ATTRIBUTION_SECRET is required for activity tracking');
  return 'skoun-local-activity-only-not-for-production';
}
export function actorKey(actor: ActivityActor, sessionId?: string) {
  const identity = actor.userId ? `user:${actor.userId}` : sessionId ? `session:${sessionId}` : `ip:${actor.ip || 'unknown'}`;
  return createHmac('sha256', activitySecret()).update(identity).digest('hex');
}
export function signPlacement(payload: Placement, secret = activitySecret()) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}
export function verifyPlacement(token: string | undefined, listingId: string, sessionId: string | undefined, now = Date.now(), secret = activitySecret()): Placement | null {
  if (!token || !sessionId) return null;
  try {
    const [body, signature, extra] = token.split('.');
    if (!body || !signature || extra) return null;
    const expected = createHmac('sha256', secret).update(body).digest();
    const received = Buffer.from(signature, 'base64url');
    if (received.length !== expected.length || !timingSafeEqual(expected, received)) return null;
    const value = JSON.parse(Buffer.from(body, 'base64url').toString()) as Placement;
    if (value.v !== 1 || value.listingId !== listingId || value.sessionId !== sessionId || !Number.isFinite(value.exp) || value.exp <= now || value.issuedAt > now || value.exp - value.issuedAt > 30 * 60_000 || !['featured','bump'].includes(value.kind)) return null;
    return value;
  } catch { return null; }
}
export function cohortKey(market: string, ids: string[]) {
  return createHash('sha256').update(`${market}:${[...ids].sort().join(',')}`).digest('hex');
}
export function rotateCampaigns(ids: string[], offset: number) {
  const sorted = [...ids].sort();
  if (!sorted.length) return [];
  const start = ((offset % sorted.length) + sorted.length) % sorted.length;
  return [...sorted.slice(start), ...sorted.slice(0, start)];
}
export function costPerTap(spent: number, refunded: number, taps: number) {
  return taps > 0 ? Math.round((Math.max(0, spent - refunded) / 100 / taps) * 100) / 100 : null;
}

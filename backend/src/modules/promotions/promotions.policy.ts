export const OPEN_STATUSES = ['active','queued','paused','action_needed'];
export function eligibilityReasons(listing: Record<string, any> | undefined, now = new Date()) {
  if (!listing) return ['Listing no longer exists.'];
  const reasons: string[] = [];
  if (listing.status !== 'active') reasons.push('Publish or renew this listing first.');
  if (listing.availability !== 'available') reasons.push('Only available listings can be promoted. Under offer and rented listings are excluded.');
  if (!listing.expires_at || new Date(listing.expires_at) <= now) reasons.push('Renew this expired listing first.');
  if (['restricted','banned'].includes(listing.account_status)) reasons.push('This host account cannot promote listings.');
  if (Number(listing.photo_count) < 3) reasons.push('Add at least three photos.');
  if (!listing.electricity || !listing.water || typeof listing.wifi_included !== 'boolean') reasons.push('Answer the required utilities.');
  if (['generator_24_7','scheduled_cuts'].includes(listing.electricity) && ![5,10,15,20].includes(Number(listing.generator_amperes))) reasons.push('Confirm the generator amperage.');
  if (listing.electricity === 'scheduled_cuts' && !(Array.isArray(listing.electricity_cut_windows) && listing.electricity_cut_windows.length) && !(listing.electricity_cuts_start && listing.electricity_cuts_end)) reasons.push('Confirm the electricity cut periods.');
  return reasons;
}
export function remainingSeconds(campaign: Record<string, any>, at = new Date()) {
  if (campaign.status !== 'active' || !campaign.active_since) return Number(campaign.remaining_seconds);
  return Math.max(0, Number(campaign.remaining_seconds) - Math.max(0, Math.floor((at.getTime()-new Date(campaign.active_since).getTime())/1000)));
}
export function unusedRefundUnits(creditUnits: number, seconds: number, durationDays: number) {
  return Math.min(creditUnits, Math.max(0, Math.ceil(creditUnits * seconds / (durationDays*86400))));
}
export function beirutDate(at: Date) {
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Beirut',year:'numeric',month:'2-digit',day:'2-digit'}).format(at);
}

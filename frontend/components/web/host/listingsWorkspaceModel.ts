import type { Listing } from '@/types/listing';
import { expiryTime, hostListingStatus, isExpiringSoon, isPastExpiry, offersRenewal } from './hostListingStatus';

export const listingFilters = ['All', 'Needs attention', 'Live', 'Expired', 'Rented'] as const;
export type ListingsFilter = typeof listingFilters[number];
export type WorkspaceAction = 'renew' | 'availability' | 'analytics' | 'edit';
export const unitTypeName = (unit: Listing) => unit.unitType === 'shared_bed' ? 'Shared beds' : unit.unitType === 'whole_apartment' ? 'Whole apartment' : 'Private room';
export const unitTitle = (unit: Listing) => unit.title?.replace(/\s*·\s*Campus:.*$/i, '').trim() || unitTypeName(unit);
export const unitCampusName = (unit: Listing) => unit.primaryCampusName?.trim() || unit.title?.match(/·\s*Campus:\s*(.+)$/i)?.[1]?.trim() || null;
export const placeName = (unit: Listing) => unit.buildingName?.trim() || `${unit.placeKind === 'building' ? 'Building' : 'Apartment'} in ${unit.area}`;

export function workspaceFacts(unit: Listing, now: number) {
  const shared = unit.unitType === 'shared_bed';
  const rented = unit.availability === 'rented' || (shared && unit.bedsAvailable === 0 && !unit.inventoryNeedsConfirmation);
  const terminal = unit.status === 'draft' || unit.status === 'removed';
  const hidden = Boolean(unit.hidden || unit.hiddenReason);
  const expired = !terminal && !rented && isPastExpiry(unit.expiresAt, now);
  const expiring = !terminal && !rented && unit.status === 'active' && isExpiringSoon(unit.expiresAt, now);
  const live = !terminal && !rented && !hidden && unit.status === 'active' && (expiryTime(unit.expiresAt) ?? 0) > now;
  const enabled = unit.autoRenewState?.enabled ?? unit.autoRenew ?? false;
  const blocked = enabled ? unit.autoRenewState?.blocked : null;
  const needsBeds = Boolean(unit.inventoryNeedsConfirmation || (shared && unit.bedsAvailable == null));
  const attention = !terminal && !rented && (expired || expiring || Boolean(blocked) || needsBeds);
  const canEdit = unit.status === 'active' && !isPastExpiry(unit.expiresAt, now);
  const canRenew = offersRenewal(unit) && !rented;
  const primary: WorkspaceAction = rented ? 'availability' : (expired || expiring) && canRenew ? 'renew' : canEdit ? 'edit' : 'analytics';
  const status = hostListingStatus(unit, now);
  if (hidden && unit.status === 'active' && !expired && !rented) {
    status.label = status.label.startsWith('Live · ') ? status.label.replace('Live · ', 'Hidden · ') : `Hidden · ${status.label}`;
    status.tone = 'muted';
  }
  const availability = needsBeds ? 'Bed count needed' : shared ? `${unit.bedsAvailable} of ${unit.bedsTotal ?? '?'} beds free` : rented ? 'Rented' : unit.availability === 'pending' ? 'Under offer' : 'Available';
  const rank = terminal ? 6 : rented ? 5 : expired ? 0 : blocked ? 1 : expiring ? 2 : needsBeds ? 3 : unit.status === 'archived' ? 6 : 4;
  return { rented, hidden, expired, expiring, live, enabled, blocked, needsBeds, attention, canEdit, canRenew, primary, status, availability, rank };
}

export function portfolioCounts(units: Listing[], now: number) {
  const facts = units.map(unit => workspaceFacts(unit, now));
  return { All: units.length, 'Needs attention': facts.filter(f => f.attention).length, Live: facts.filter(f => f.live).length,
    Expired: facts.filter(f => f.expired).length, Rented: facts.filter(f => f.rented).length, expiring: facts.filter(f => f.live && f.expiring).length };
}

export function workspaceGroups(units: Listing[], filter: ListingsFilter, search: string, sort: 'urgency' | 'name', now: number) {
  const tokens = search.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const grouped = new Map<string, { id: string; name: string; unit: Listing; total: number; attention: number; units: Listing[] }>();
  for (const unit of units) {
    const id = unit.placeId ?? unit.id;
    if (!grouped.has(id)) grouped.set(id, { id, name: placeName(unit), unit, total: 0, attention: 0, units: [] });
    const group = grouped.get(id)!;
    group.total++;
    const f = workspaceFacts(unit, now);
    if (f.attention) group.attention++;
    const matches = filter === 'All' || (filter === 'Needs attention' && f.attention) || (filter === 'Live' && f.live) || (filter === 'Expired' && f.expired) || (filter === 'Rented' && f.rented);
    const text = `${unitTitle(unit)} ${unitCampusName(unit) ?? ''} ${group.name} ${unit.area} ${unitTypeName(unit)}`.toLocaleLowerCase();
    if (matches && tokens.every(token => text.includes(token))) group.units.push(unit);
  }
  const compare = (a: Listing, b: Listing) => sort === 'name' ? unitTitle(a).localeCompare(unitTitle(b), undefined, { numeric: true }) :
    workspaceFacts(a, now).rank - workspaceFacts(b, now).rank ||
    (workspaceFacts(a, now).rank < 4 ? (expiryTime(a.expiresAt) ?? Infinity) - (expiryTime(b.expiresAt) ?? Infinity) : 0) || unitTitle(a).localeCompare(unitTitle(b), undefined, { numeric: true });
  const groups = [...grouped.values()].filter(group => group.units.length);
  groups.forEach(group => group.units.sort(compare));
  return groups.sort((a,b) => sort === 'name' ? a.name.localeCompare(b.name) : compare(a.units[0], b.units[0]) || a.name.localeCompare(b.name));
}

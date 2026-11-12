import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hostListingStatus, offersRenewal } from '../components/web/host/hostListingStatus';

const now = Date.parse('2026-11-12T10:00:00Z');
const unit = (ms: number) => ({ status: 'active' as const, expiresAt: new Date(now + ms).toISOString() });
test('card states use exact instant boundaries before display rounding', () => {
  assert.equal(hostListingStatus(unit(72 * 3600000 + 1), now).label, 'Live · 4 days left');
  assert.equal(hostListingStatus(unit(72 * 3600000), now).label, 'Expiring in 3 days');
  assert.equal(hostListingStatus(unit(24 * 3600000 - 1), now).label, 'Expiring in 24 hours');
  assert.equal(hostListingStatus(unit(3600000), now).label, 'Expiring in 1 hour');
  assert.equal(hostListingStatus(unit(1), now).label, 'Expiring in 1 minute');
  assert.equal(hostListingStatus(unit(0), now).label, 'Expired');
  assert.equal(hostListingStatus(unit(-1), now).label, 'Expired');
});
test('renew is available throughout the live cycle and after expiry', () => {
  for (const ms of [30 * 86400000, 2 * 86400000, 0, -86400000]) assert.ok(offersRenewal(unit(ms)));
  assert.equal(offersRenewal({ ...unit(1), status: 'draft' }), false);
  assert.equal(offersRenewal({ ...unit(1), status: 'removed' }), false);
  assert.equal(offersRenewal({ ...unit(1), availability: 'rented' }), false);
  assert.equal(hostListingStatus({...unit(-1),availability:'rented'},now).label,'Rented');
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { composePlacements } from '../features/promotions/composePlacements';
import { promotionMode, canUndoPromotion } from '../features/promotions/promotionPresentation';
import type { Listing } from '../types/listing';
const now=Date.now();
const item=(id:string,extra:object={})=>({id,status:'active',availability:'available',expiresAt:new Date(now+86400000).toISOString(),createdAt:new Date(now-86400000).toISOString(),monthlyRentUsd:500,...extra} as Listing);
test('paid placement composes only filtered input; Featured first and Bump obeys explicit sort',()=>{
  const featured=item('f',{promotion:{type:'featured',position:0,endsAt:new Date(now+86400000).toISOString()}});
  const bump=item('b',{monthlyRentUsd:900,promotion:{type:'bump',lastBumpedAt:new Date(now).toISOString(),endsAt:new Date(now+86400000).toISOString()}});
  const cheap=item('c',{monthlyRentUsd:100});
  assert.deepEqual(composePlacements([cheap,bump,featured],'newest',now).map(l=>l.id),['f','b','c']);
  const sorted=composePlacements([cheap,bump,featured],'rent_asc',now);
  assert.deepEqual(sorted.map(l=>l.id),['f','c','b']);assert.equal(sorted[2].promotion,undefined);
  assert.deepEqual(composePlacements([cheap],'newest',now).map(l=>l.id),['c']);
  assert.equal(composePlacements([{...featured,availability:'pending'}],'newest',now)[0].promotion,undefined);
});
test('expired legacy boost has no ordering advantage',()=>{
  const old=item('old',{boostedUntil:new Date(now-1000).toISOString()});
  const fresh=item('new',{createdAt:new Date(now-5000).toISOString()});
  assert.deepEqual(composePlacements([old,fresh],'newest',now).map(l=>l.id),['new','old']);
});
test('full areas queue, undo expires at the boundary',()=>{
  assert.equal(promotionMode({type:'featured'} as never,{availableSlots:0,queueLength:0} as never),'queue');
  assert.equal(promotionMode({type:'bump'} as never,{availableSlots:0} as never),'start');
  assert.equal(canUndoPromotion({spentUnits:100,refundedUnits:0,undoUntil:new Date(now).toISOString()} as never,now),false);
});

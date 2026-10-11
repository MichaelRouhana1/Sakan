import assert from 'node:assert/strict';
import { test } from 'node:test';
import { promotionMode, canUndoPromotion } from '../features/promotions/promotionPresentation';
const now=Date.now();
test('full areas queue, undo expires at the boundary',()=>{
  assert.equal(promotionMode({type:'featured'} as never,{availableSlots:0,queueLength:0} as never),'queue');
  assert.equal(promotionMode({type:'bump'} as never,{availableSlots:0} as never),'start');
  assert.equal(canUndoPromotion({spentUnits:100,refundedUnits:0,undoUntil:new Date(now).toISOString()} as never,now),false);
});

import assert from 'node:assert/strict';
import {test} from 'node:test';
import {applyListingToastEvent} from '../features/saved/listingToastState';
import type {Listing} from '../types/listing';

test('auto-renew feedback replaces its prior state and leaves favorite Undo intact',()=>{
  const listing={id:'unit'} as Listing;
  let items=applyListingToastEvent([],{kind:'added',listing,seq:10});
  items=applyListingToastEvent(items,{kind:'feedback',id:'auto-renew:unit',title:'Auto-renew on.',seq:1});
  items=applyListingToastEvent(items,{kind:'feedback',id:'auto-renew:unit',title:'Auto-renew off.',seq:2});
  assert.equal(items.length,2);
  assert.equal(items[0].kind,'saved');assert.equal(items[0].title,'Added to favorites');
  assert.equal(items[1].title,'Auto-renew off.');assert.equal(items[1].open,true);
  items=applyListingToastEvent(items,{kind:'clear',listingId:'unit',seq:9});
  assert.equal(items[0].open,true);
  items=applyListingToastEvent(items,{kind:'clear',listingId:'unit',seq:10});
  assert.equal(items[0].open,false);assert.equal(items[1].open,true);
});

test('feedback from different units and new favorites keep their own entries',()=>{
  let items=applyListingToastEvent([],{kind:'feedback',id:'auto-renew:a',title:'Auto-renew on.',seq:1});
  items=applyListingToastEvent(items,{kind:'feedback',id:'auto-renew:b',title:'Could not save.',seq:2});
  items=applyListingToastEvent(items,{kind:'added',listing:{id:'a'} as Listing,seq:3});
  items=applyListingToastEvent(items,{kind:'added',listing:{id:'a'} as Listing,seq:4});
  assert.equal(items.length,3);assert.equal(items[2].seq,4);
  assert.deepEqual(items.map(item=>item.title),['Auto-renew on.','Could not save.','Added to favorites']);
});

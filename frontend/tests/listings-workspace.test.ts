import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Listing } from '../types/listing';
import { portfolioCounts, workspaceFacts, workspaceGroups, unitTitle, unitCampusName } from '../components/web/host/listingsWorkspaceModel';

const now=Date.parse('2026-11-12T10:00:00Z');
const unit=(id:string,extra:Partial<Listing>={}):Listing=>({id,placeId:id,status:'active',availability:'available',title:id,unitType:'private_room',area:'Hamra',monthlyRentUsd:450,expiresAt:new Date(now+10*86400000).toISOString(),photos:[],viewCount:0,...extra} as Listing);
test('campus metadata leaves the unit title intact and remains searchable',()=>{
 const raw=unit('campus',{title:'3-bedroom apartment in Dekwaneh · Campus: Dekouaneh Campus'});
 assert.equal(unitTitle(raw),'3-bedroom apartment in Dekwaneh');
 assert.equal(unitCampusName(raw),'Dekouaneh Campus');
 assert.equal(unitCampusName({...raw,primaryCampusName:'Selected campus'}),'Selected campus');
 assert.equal(workspaceGroups([raw],'All','Dekouaneh Campus','urgency',now).length,1);
 assert.equal(raw.title,'3-bedroom apartment in Dekwaneh · Campus: Dekouaneh Campus');
});
test('urgency, filters and counts derive from time, vacancy and eligibility independently',()=>{
  const units=[unit('live'),unit('soon',{expiresAt:new Date(now+72*3600000).toISOString()}),unit('expired',{expiresAt:new Date(now).toISOString()}),unit('rented',{availability:'rented'}),unit('blocked',{autoRenew:true,autoRenewState:{enabled:true,expiresAt:null,status:'active',blocked:'credits'}}),unit('beds',{unitType:'shared_bed',bedsTotal:4,bedsAvailable:null,inventoryNeedsConfirmation:true}),unit('hidden',{hiddenReason:'manual_hidden'})];
  const counts=portfolioCounts(units,now);
  assert.deepEqual(counts,{All:7,'Needs attention':4,Live:4,Expired:1,Rented:1,expiring:1});
  assert.deepEqual(workspaceGroups(units,'All','','urgency',now).map(g=>g.unit.id),['expired','blocked','soon','beds','hidden','live','rented']);
  assert.equal(workspaceFacts(units[3],now).primary,'availability');
  assert.equal(workspaceFacts(units[2],now).primary,'renew');
  assert.equal(workspaceFacts(units[0],now).primary,'edit');
});
test('filters preserve actual place membership and search every token',()=>{
  const units=[unit('Room 1',{placeId:'house',buildingName:'Bliss House'}),unit('Room 2',{placeId:'house',buildingName:'Bliss House',availability:'rented'}),unit('Studio',{placeId:'single',area:'Achrafieh'})];
  const groups=workspaceGroups(units,'All','bliss room 1','urgency',now);
  assert.equal(groups.length,1);assert.equal(groups[0].total,2);assert.equal(groups[0].units.length,1);
  assert.equal(workspaceGroups(units,'Rented','','urgency',now)[0].units[0].id,'Room 2');
  assert.equal(workspaceGroups(units,'Needs attention','','urgency',now).length,0);
});
test('unknown beds are not rented; zero vacancy is rented; removed records never demand renewal',()=>{
  assert.equal(workspaceFacts(unit('beds',{unitType:'shared_bed',bedsAvailable:null,inventoryNeedsConfirmation:true}),now).availability,'Bed count needed');
  assert.equal(workspaceFacts(unit('zero',{unitType:'shared_bed',bedsAvailable:0,bedsTotal:4}),now).rented,true);
  const removed=workspaceFacts(unit('removed',{status:'removed',expiresAt:new Date(now-1).toISOString()}),now);
  assert.equal(removed.expired,false);assert.equal(removed.attention,false);assert.equal(removed.primary,'analytics');
});

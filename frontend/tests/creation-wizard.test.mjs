import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../../backend/node_modules/esbuild/lib/main.js';
import path from 'node:path';
import {fixture,photos} from './creation-wizard-fixtures.mjs';
const root=path.resolve(import.meta.dirname,'..');
const bundle=await build({stdin:{contents:`export * from './features/listings/create/v2/model';`,loader:'ts',resolveDir:root},bundle:true,write:false,format:'esm',platform:'node'});
const m=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
const base=()=>fixture(m,'10000000-0000-4000-8000-000000000001','http://localhost:3002');
function finished(){let p=base();for(let i=0;i<10;i++)p=m.reduceWizard(p,{type:'next'});return p;}
test('five place screens, five unit screens (including card badges), another and Review run in order',()=>{let p=base();const order=[];for(let i=0;i<10;i++){order.push(p.position.screen);p=m.reduceWizard(p,{type:'next'});}assert.deepEqual(order,[...m.PLACE_SCREENS,...m.UNIT_SCREENS]);assert.equal(p.position.screen,'another');assert.equal(m.reduceWizard(p,{type:'back'}).position.screen,'card');p=m.reduceWizard(p,{type:'review'});assert.deepEqual(m.screenErrors(p),[]);});
test('copy is independent, appends suffix within title limit, and clears photos',()=>{let p=finished();const source=p.units[0].id;p=m.reduceWizard(p,{type:'unit',id:source,patch:{title:'a'.repeat(60)}});p=m.reduceWizard(p,{type:'add',id:'copy',copyFrom:source});assert.equal(p.units[1].data.title.length,60);assert.ok(p.units[1].data.title.endsWith(' (copy)'));assert.deepEqual(p.units[1].data.photos,[]);p=m.reduceWizard(p,{type:'unit',id:'copy',patch:{monthlyRentUsd:'900'}});assert.equal(p.units[0].data.monthlyRentUsd,'650');});
test('blank never appends copy and has no inherited unit values',()=>{let p=finished();p=m.reduceWizard(p,{type:'add',id:'blank'});assert.equal(p.units[1].data.title,'');assert.equal(p.units[1].data.monthlyRentUsd,'');assert.equal(p.units[1].data.furnishingType,null);assert.deepEqual(p.units[1].data.photos,[]);});
test('existing place skips all shared screens and is read-only',()=>{let p=base();p.place.id='10000000-0000-4000-8000-000000000002';p.completedPlace=[...m.PLACE_SCREENS];p.position.screen='layout';assert.equal(m.reduceWizard(p,{type:'back'}).position.screen,'layout');assert.equal(m.reduceWizard(p,{type:'editPlace'}),p);assert.equal(m.reduceWizard(p,{type:'place',patch:{area:'Verdun'}}),p);});
test('unit and shared photo limits enforce readiness and separate galleries',()=>{const p=finished();const list=Array.from({length:16},(_,i)=>({...photos('http://localhost:3002','p')[0],localId:`p-${i}`}));for(const n of [0,15,16]){const d=m.reduceWizard(p,{type:'gallery',id:'place',update:list.slice(0,n)});assert.equal(m.placeErrors(d,'building-photos').length===0,n<=15);}for(const n of [2,3,15,16]){const d=m.reduceWizard(p,{type:'gallery',id:p.units[0].id,update:list.slice(0,n)});assert.equal(m.unitErrors(d,p.units[0].id,'photos').length===0,n>=3&&n<=15);}for(const status of ['error','uploading']){const d=m.reduceWizard(p,{type:'gallery',id:p.units[0].id,update:list.slice(0,3).map(p=>({...p,status}))});assert.ok(m.unitErrors(d,d.units[0].id,'photos').length);}});
test('Review edits return directly and preserve independent units',()=>{let p=finished();p=m.reduceWizard(p,{type:'review'});p=m.reduceWizard(p,{type:'editUnit',id:p.units[0].id});for(let i=0;i<5;i++)p=m.reduceWizard(p,{type:'next'});assert.equal(p.position.screen,'review');});
test('opening Place after the last unit is removed stays saveable',()=>{let p=finished();p=m.reduceWizard(p,{type:'remove',id:p.units[0].id});p=m.reduceWizard(p,{type:'editPlace'});assert.equal(p.position.screen,'place-type');assert.equal(p.units.length,1);assert.equal(p.position.unitId,p.units[0].id);});
test('Back from a later unit preserves it and does not repeat Place questions',()=>{let p=m.reduceWizard(finished(),{type:'add',id:'second'});p=m.reduceWizard(p,{type:'back'});assert.equal(p.position.screen,'another');assert.equal(p.units.length,2);});
test('late uploads use stable unit IDs and cannot recreate removed units',()=>{let p=m.reduceWizard(finished(),{type:'add',id:'second'});const first=p.units[0].id;p=m.reduceWizard(p,{type:'gallery',id:first,update:x=>x.map(a=>({...a,caption:'Updated'}))});assert.deepEqual(p.units[1].data.photos,[]);p=m.reduceWizard(p,{type:'remove',id:first});p=m.reduceWizard(p,{type:'gallery',id:first,update:photos('http://localhost:3002','late')});assert.equal(p.units.length,1);assert.deepEqual(p.units[0].data.photos,[]);});
test('20-unit maximum and building rental restrictions are enforced',()=>{let p=finished();p=m.reduceWizard(p,{type:'unit',id:p.units[0].id,patch:{spaceType:'private_room'}});assert.ok(m.unitErrors(p,p.units[0].id,'layout').length);for(let i=1;i<20;i++)p=m.reduceWizard(p,{type:'add',id:`u-${i}`});assert.equal(m.reduceWizard(p,{type:'add',id:'extra'}),p);});
test('empty batch is blocked; interrupted photos restore in a recoverable state',()=>{let p=finished();p=m.reduceWizard(p,{type:'remove',id:p.units[0].id});assert.ok(m.screenErrors(p).includes('Add at least one unit'));p=m.reduceWizard(p,{type:'back'});assert.equal(p.position.screen,'layout');assert.equal(p.units.length,1);assert.equal(p.units[0].data.title??'','');assert.equal(m.reduceWizard(p,{type:'back'}).position.screen,'building-photos');const saved=m.persistable({...base(),place:{...base().place,photos:[{localId:'x',uri:'blob:lost',status:'uploading'}]}});assert.equal(saved.place.photos[0].status,'error');assert.equal(saved.place.photos[0].uri,'');});

test('parking keeps the existing included-in-rent default and respects an explicit override',()=>{let p=base();p.place.data.amenities=[];p.place.data.parkingIncludedInRent=false;p=m.reduceWizard(p,{type:'place',patch:{amenities:['parking']}});assert.equal(p.place.data.parkingIncludedInRent,true);p=m.reduceWizard(p,{type:'place',patch:{parkingIncludedInRent:false}});p=m.reduceWizard(p,{type:'place',patch:{amenities:['parking','wifi']}});assert.equal(p.place.data.parkingIncludedInRent,false);p=m.reduceWizard(p,{type:'place',patch:{amenities:[]}});assert.equal(p.place.data.parkingIncludedInRent,false);});

test('USD pricing blocks the Gemmayzeh mistake before Review while allowing normal and boundary amounts',()=>{
  for(const monthlyRentUsd of ['650','10000']) {
    const p=base();p.units[0].data.monthlyRentUsd=monthlyRentUsd;
    p.units[0].data.depositPreset='2';
    assert.deepEqual(m.unitErrors(p,p.units[0].id,'rent'),[]);
  }
  for(const monthlyRentUsd of ['234432','10001','0','650.5']) {
    const p=base();p.units[0].data.monthlyRentUsd=monthlyRentUsd;
    assert.ok(m.unitErrors(p,p.units[0].id,'rent').includes('monthlyRentUsd'));
    p.position.screen='rent';
    assert.equal(m.reduceWizard(p,{type:'next'}),p);
  }
  for(const securityDepositUsd of ['234432','20001','-1']) {
    const p=base();p.units[0].data.depositPreset='custom';p.units[0].data.securityDepositUsd=securityDepositUsd;
    assert.ok(m.unitErrors(p,p.units[0].id,'rent').includes('securityDepositUsd'));
  }
});

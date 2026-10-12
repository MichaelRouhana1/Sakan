import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from '../../backend/node_modules/esbuild/lib/main.js';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const bundle=await build({stdin:{contents:`export * from './features/listings/create/draft';export * from './features/listings/create/unitDrafts';export * from './features/listings/create/createListingReducer';export * from './features/listings/create/createDraftCheckpoint';export * from './features/listings/create/validators';`,loader:'ts',resolveDir:root},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'memory-storage',setup(b){
 b.onResolve({filter:/^@react-native-async-storage\/async-storage$/},()=>({path:'memory',namespace:'stub'}));
 b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:`const m=new Map();export default {getItem:async k=>m.get(k)??null,setItem:async(k,v)=>m.set(k,v),removeItem:async k=>m.delete(k)};`}));
}}]});
const m=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
const photo=id=>({localId:id,uri:'blob:'+id,url:'/uploads/'+id+'.jpg',status:'ready',caption:'Kitchen'});
test('legacy draft migration preserves uploads, captions, order and saved progress',async()=>{
 const legacy={...m.INITIAL_DRAFT,schemaVersion:undefined,step:7,title:'Saved room',photos:[photo('b'),photo('a')]};
 const migrated=m.hydrateDraft(legacy);
 assert.equal(migrated.schemaVersion,2);assert.equal(migrated.unitCount,1);assert.deepEqual(migrated.sharedPhotos,[]);
 assert.deepEqual(migrated.photos.map(p=>[p.localId,p.url,p.caption]),legacy.photos.map(p=>[p.localId,p.url,p.caption]));
 assert.equal(m.resumeStepFromCheckpoint({draft:migrated,committedStep:6,savedStep:7,savedAt:new Date().toISOString()}),7);
 assert.equal(migrated.photos[0].uri,'/uploads/b.jpg');
});
test('shrinking then growing a batch retains inactive unit cards and uploads',()=>{
 let d={...m.INITIAL_DRAFT,photos:[photo('first')]};d={...d,...m.resizeUnits(d,3)};
 d=m.createListingReducer(d,{type:'patchUnit',index:2,patch:{photos:[photo('third')],monthlyRentUsd:'500',areaSqm:'25'}});
 d={...d,...m.resizeUnits(d,1)};assert.equal(m.unitDrafts(d).length,1);
 d={...d,...m.resizeUnits(d,3)};assert.equal(m.unitDraft(d,2).photos[0].localId,'third');assert.equal(m.unitDraft(d,2).monthlyRentUsd,'500');
 assert.equal(d.photos[0].localId,'first');
 d=m.createListingReducer(d,{type:'patchUnit',index:0,patch:{genderRestriction:'girls_only',availableFrom:'2026-12-01',availableImmediate:false,leaseTerm:'year'}});
 assert.equal(m.unitDraft(d,2).genderRestriction,'anyone');assert.equal(m.unitDraft(d,2).availableImmediate,true);
 assert.equal(m.unitDraft(d,2).leaseTerm,m.INITIAL_DRAFT.leaseTerm);
});
test('gallery updates isolate shared and unit uploads, including late functional completions',()=>{
 let d={...m.INITIAL_DRAFT,...m.resizeUnits(m.INITIAL_DRAFT,2)};
 d=m.createListingReducer(d,{type:'gallery',index:'shared',updater:[photo('shared')]});
 d=m.createListingReducer(d,{type:'gallery',index:1,updater:p=>[...p,photo('unit')]});
 d=m.createListingReducer(d,{type:'gallery',index:1,updater:p=>p.map(a=>({...a,caption:'Bedroom'}))});
 assert.equal(d.photos.length,0);assert.equal(d.sharedPhotos[0].caption,'Kitchen');assert.equal(d.additionalUnits[0].data.photos[0].caption,'Bedroom');
});
test('both draft slots persist every gallery and retry identity without crossing accounts',async()=>{
 m.setActiveDraftUserId('owner');
 let d={...m.INITIAL_DRAFT,...m.resizeUnits(m.INITIAL_DRAFT,2),publishRequestId:'request',photos:[photo('first')],sharedPhotos:[photo('shared')]};
 d=m.createListingReducer(d,{type:'gallery',index:1,updater:[photo('second')]});
 await m.writeCheckpoint(d,5,5);await m.writeWorkingCheckpoint({...d,title:'Working'},6,6);
 const saved=await m.readCheckpoint();assert.equal(saved.draft.additionalUnits[0].data.photos[0].uri,'/uploads/second.jpg');assert.equal(saved.draft.sharedPhotos[0].uri,'/uploads/shared.jpg');assert.equal(saved.draft.publishRequestId,'request');
 await m.clearDraftSlot('working');assert.equal((await m.readCheckpoint()).draft.photos.length,1);
 m.setActiveDraftUserId('other');assert.equal(await m.readCheckpoint(),null);
});
test('multi-unit navigation asks shared details once while one unit keeps original steps',()=>{
 const single={...m.INITIAL_DRAFT};assert.deepEqual(m.wizardStepOrder(single),[0,1,2,3,4,5,6,7,8,9]);
 const multi={...single,unitCount:3,spaceType:'entire_place'};assert.equal(m.placeKind(multi),'building');assert.deepEqual(m.wizardStepOrder(multi),[0,1,3,4,5,8,9]);
 assert.deepEqual(m.wizardStepOrder({...multi,existingPlaceId:'p'}),[0,5,8,9]);
 assert.equal(m.adjacentStep({...multi,step:5},1),8);assert.equal(m.adjacentStep({...multi,step:5},-1),4);
});
test('every selected unit and all uploads must pass validation; inactive cards do not block',()=>{
 const good={...m.INITIAL_DRAFT,spaceType:'shared_room',propertyType:'apartment',bathroomPrivacy:'shared',beds:3,bedsAvailable:1,furnishingType:'furnished',photos:[photo('a'),photo('b'),photo('c')],monthlyRentUsd:'400',title:'Room near campus',description:'A furnished room near campus with shared facilities.'};
 let d={...good,...m.resizeUnits(good,2)};assert.ok(m.stepFieldErrors(d,5).some(s=>s.startsWith('Unit 2')));
 d={...d,unitCount:1};assert.deepEqual(m.stepFieldErrors(d,5),[]);
 assert.ok(m.stepFieldErrors({...good,bedsAvailable:0},2).includes('bedsAvailable'));
 assert.ok(m.stepFieldErrors({...good,sharedPhotos:[{...photo('failed'),status:'error'}]},5).includes('sharedPhotos'));
 assert.ok(m.stepFieldErrors({...good,photos:[...good.photos,{...photo('failed'),status:'error'}]},5).includes('photos'));
});

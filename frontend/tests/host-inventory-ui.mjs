// Browser test of the real cross-platform host component and API adapter.
// Database locking, ownership and refunds are tested by test:inventory.
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {build}=require('../../backend/node_modules/esbuild');
const {chromium,expect}=require('@playwright/test');
const root=path.resolve(import.meta.dirname,'..');
const output=path.join(root,'.expo','host-inventory-ui');await mkdir(output,{recursive:true});
const fixture={id:'bed',title:'Shared room',status:'active',placeId:'place',unitType:'shared_bed',availability:'available',hidden:false,placeHidden:false,hiddenReason:'confirm_beds',bedsTotal:3,bedsAvailable:null,inventoryNeedsConfirmation:true,inventoryVersion:0,genderRestriction:'anyone',blockers:[]};
const entry=`import React from 'react';import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {HostInventoryControl} from './components/listings/HostInventoryControl';
import {HostListingListView} from './components/web/host/HostListingListView';
const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
window.parentClicks=0;
const params=new URLSearchParams(location.search);
const listing={id:'bed',title:'Shared room near campus',area:'Hamra',listingType:'shared_dorm_bed',status:'active',availability:'available',expiresAt:null,photos:[]};
createRoot(document.getElementById('root')).render(<QueryClientProvider client={client}><main onClick={()=>window.parentClicks++} style={{maxWidth:400,margin:'20px auto',padding:16}}>{params.has('list')?<HostListingListView compact rows={[{kind:'listing',listing}]} onDraftPress={()=>{}} onListingPress={()=>window.parentClicks++}/>:<HostInventoryControl listingId={params.get('id')||'bed'}/>}</main></QueryClientProvider>);`;
const bundle=await build({stdin:{contents:entry,loader:'tsx',resolveDir:root},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"test"',__DEV__:'true'},alias:{'react-native':'react-native-web'},plugins:[{name:'local-api-and-unrelated-visuals',setup(b){
 b.onResolve({filter:/^@\/lib\/api$/},()=>({path:'test-api',namespace:'test'}));
 b.onResolve({filter:/^(\.\/PromotionAction|@expo\/vector-icons|expo-image)$/},()=>({path:'visuals',namespace:'test'}));
 b.onResolve({filter:/createDraftCheckpoint$/},()=>({path:'drafts',namespace:'test'}));
 b.onLoad({filter:/.*/,namespace:'test'},({path:p})=>({contents:p==='test-api'?"import axios from 'axios';export const API_BASE_URL=location.origin;export const api=axios.create({baseURL:location.origin});":p==='visuals'?"export const PromotionAction=()=>null;export const Ionicons=()=>null;export const Image=()=>null;":"export const checkpointCoverPhoto=()=>null;export const checkpointDisplayTitle=()=>'';export const checkpointLocationLine=()=>'';",resolveDir:root}));
}}]});
const rows=new Map([['bed',{...fixture}],['whole',{...fixture,id:'whole',title:'Whole apartment',unitType:'whole_apartment',bedsTotal:null,bedsAvailable:null,inventoryNeedsConfirmation:false,blockers:[{id:'room',title:'Room A',inventoryNeedsConfirmation:false}]}],['room',{...fixture,id:'room',title:'Room A',status:'archived',unitType:'private_room',bedsTotal:null,bedsAvailable:null,inventoryNeedsConfirmation:false,availability:'rented'}]]);
let fail=false;const writes=[];
const server=createServer(async(req,res)=>{
 if(req.url==='/bundle.js'){res.setHeader('content-type','text/javascript');res.end(bundle.outputFiles[0].text);return;}
 if(req.url==='/api/listings/places/place/visibility'&&req.method==='PATCH'){
  let body='';for await(const chunk of req)body+=chunk;const {hidden}=JSON.parse(body);
  for(const row of rows.values()){row.placeHidden=hidden;row.inventoryVersion++;}
  res.setHeader('content-type','application/json');res.end(JSON.stringify({data:{id:'place',hidden}}));return;
 }
 const match=req.url?.match(/^\/api\/listings\/([^/]+)\/inventory$/);
 if(match){
  res.setHeader('content-type','application/json');let row=rows.get(match[1]);
  if(req.method==='PATCH'){
   let body='';for await(const chunk of req)body+=chunk;const input=JSON.parse(body);writes.push(input);
   if(fail||input.expectedVersion!==row.inventoryVersion){res.statusCode=409;res.end(JSON.stringify({error:{message:'Inventory changed. Refresh before saving.'}}));return;}
   const {expectedVersion,bedAction,...change}=input;row={...row,...change,inventoryVersion:row.inventoryVersion+1};
   if(bedAction)row.bedsAvailable+=bedAction==='rent_one'?-1:1;
   row.inventoryNeedsConfirmation=row.unitType==='shared_bed'&&row.bedsAvailable===null;
   if(row.unitType==='shared_bed'&&!row.inventoryNeedsConfirmation)row.availability=row.bedsAvailable===0?'rented':row.availability==='rented'?'available':row.availability;
   if(row.id==='room'&&row.availability==='available')rows.get('whole').blockers=[];
   rows.set(row.id,row);
  }
  res.end(JSON.stringify({data:row}));return;
 }
 res.setHeader('content-type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
});
server.listen(0,'127.0.0.1');await once(server,'listening');let browser;const checks=[];
try {
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:390,height:844}});
 const base='http://127.0.0.1:'+server.address().port;
 await page.goto(base);
 await page.getByRole('button',{name:'Confirm available beds',exact:true}).click();
 await expect(page.getByLabel('Available beds',{exact:true})).toHaveValue('');
 await expect(page.getByRole('button',{name:'Save bed counts'})).toBeDisabled();
 await page.getByLabel('Available beds',{exact:true}).fill('4');await expect(page.getByRole('button',{name:'Save bed counts'})).toBeDisabled();
 await page.getByLabel('Available beds',{exact:true}).fill('3');await page.getByRole('button',{name:'Save bed counts'}).click();
 await expect(page.getByText('3 of 3 beds available')).toBeVisible();assert.deepEqual(writes.at(-1),{expectedVersion:0,bedsTotal:3,bedsAvailable:3});checks.push('explicit vacancy confirmation and bounds');
 await page.getByRole('button',{name:'Mark 1 bed rented'}).click();await expect(page.getByText('Who moved in?')).toBeVisible();
 assert.equal(rows.get('bed').bedsAvailable,2);assert.equal(rows.get('bed').genderRestriction,'anyone');
 await page.getByRole('button',{name:'Female',exact:true}).click();await expect(page.getByText('Offer the remaining beds to this gender only?')).toBeVisible();
 await page.screenshot({path:path.join(output,'gender-confirmation.png'),fullPage:true});
 assert.equal(rows.get('bed').genderRestriction,'anyone');
 await page.getByRole('button',{name:'Confirm gender preference'}).click();await expect(page.getByText('Gender preference saved.')).toBeVisible();
 assert.equal(rows.get('bed').genderRestriction,'girls_only');assert.equal(rows.get('bed').bedsAvailable,2);
 await page.getByRole('button',{name:'Undo gender change'}).click();await expect(page.getByText('Previous gender preference restored.')).toBeVisible();assert.equal(rows.get('bed').genderRestriction,'anyone');checks.push('rent one, female suggestion only on confirmation, undo');
 await page.getByRole('button',{name:'Mark 1 bed rented'}).click();await page.getByRole('button',{name:'Skip',exact:true}).click();assert.equal(rows.get('bed').genderRestriction,'anyone');checks.push('skip leaves gender unchanged');
 await page.getByRole('button',{name:'Mark 1 bed rented'}).click();await expect(page.getByText('All beds are now rented. No gender preference needs to change.')).toBeVisible();await page.getByRole('button',{name:'Male',exact:true}).click();
 await expect(page.getByText('Hidden because all beds are rented')).toBeVisible();await expect(page.getByRole('button',{name:'Mark 1 bed rented'})).toBeDisabled();assert.equal(rows.get('bed').genderRestriction,'anyone');
 await page.getByRole('button',{name:'Free a bed'}).click();await expect(page.getByText('1 of 3 beds available')).toBeVisible();checks.push('last bed hides, no restriction at zero vacancy, freeing reopens');
 await page.getByRole('button',{name:'Manage availability'}).click();await page.getByRole('button',{name:'Change gender preference'}).click();await page.getByRole('radio',{name:'Male only',exact:true}).click();await page.getByRole('button',{name:'Confirm gender preference'}).click();await expect(page.getByText('Gender preference saved.')).toBeVisible();assert.equal(rows.get('bed').genderRestriction,'boys_only');checks.push('change preference later');
 fail=true;await page.getByRole('button',{name:'Free a bed'}).click();await expect(page.getByRole('alert')).toHaveText('Inventory changed. Refresh before saving.');assert.equal(rows.get('bed').bedsAvailable,1);
 fail=false;await page.getByRole('button',{name:'Refresh inventory'}).click();await expect(page.getByRole('alert')).toHaveCount(0);checks.push('conflict surfaced without optimistic vacancy');
 await page.getByRole('button',{name:'Manage availability'}).click();await page.getByRole('button',{name:'Hide this unit'}).click();await expect(page.getByText('Hidden by you or staff')).toBeVisible();assert.equal(rows.get('bed').bedsAvailable,1);
 await page.getByRole('button',{name:'Manage availability'}).click();await page.getByRole('button',{name:'Show this unit'}).click();await expect(page.getByText('Hidden by you or staff')).toHaveCount(0);checks.push('manual hiding preserves occupancy');
 await page.getByRole('button',{name:'Manage availability'}).click();await page.getByRole('button',{name:'Hide this place',exact:true}).click();assert.equal(rows.get('bed').placeHidden,false);await page.getByRole('button',{name:'Confirm hide place'}).click();await expect(page.getByText('Hidden because this place is hidden')).toBeVisible();assert.equal(rows.get('bed').bedsAvailable,1);
 await page.getByRole('button',{name:'Manage availability'}).click();await page.getByRole('button',{name:'Show this place',exact:true}).click();await page.getByRole('button',{name:'Confirm show place'}).click();await expect(page.getByText('Hidden because this place is hidden')).toHaveCount(0);checks.push('place hiding needs confirmation and preserves vacancy');
 await page.goto(base+'?id=whole');await expect(page.getByText('Hidden because Room A is rented')).toBeVisible();await expect(page.getByRole('button',{name:'Mark rented',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Manage Room A'}).click();await expect(page.getByText('This listing is archived. Freeing it updates occupancy; it does not publish or renew it.')).toBeVisible();await page.getByRole('button',{name:'Mark vacant'}).click();await expect(page.getByRole('dialog',{name:'Blocking unit',exact:true}).getByRole('button',{name:'Mark rented',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Back to this unit'}).click();await expect(page.getByText('Hidden because Room A is rented')).toHaveCount(0);assert.equal(rows.get('room').status,'archived');checks.push('named blocker, archived occupant freed without publishing');
 await expect(page.getByRole('dialog',{name:'Blocking unit',exact:true})).toBeHidden();
 assert.equal(await page.evaluate(()=>window.parentClicks),0,'inventory controls must not open the parent listing');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(output,'host-inventory.png'),fullPage:true});
 await page.goto(base+'?list=1');await expect(page.getByText('1 of 3 beds available')).toBeVisible();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'compact list must fit a narrow screen');
 await page.getByRole('button',{name:'Free a bed'}).click();await expect(page.getByText('2 of 3 beds available')).toBeVisible();assert.equal(await page.evaluate(()=>window.parentClicks),0);
 await page.screenshot({path:path.join(output,'compact-list.png'),fullPage:true});checks.push('real compact list fits and inventory clicks do not navigate');
 await writeFile(path.join(output,'result.json'),JSON.stringify({passed:checks.length,checks},null,2));console.log('PASS host inventory browser: '+checks.join('; '));
} finally {if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}

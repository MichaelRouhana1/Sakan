// Real host grouping, unit utility controls, shared editor and API adapters.
// Auth, maps, image rendering and unrelated promotion/inventory controls are isolated.
import {build} from '../../backend/node_modules/esbuild/lib/main.js';
import {chromium,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'.expo/host-places-ui');await mkdir(out,{recursive:true});
const fixture={id:'u1',posterId:'owner',placeId:'p1',placeKind:'building',title:'Apartment one',spaceType:'entire_place',propertyType:'apartment',listingType:'entire_apartment',status:'active',availability:'available',area:'Hamra',buildingName:'Cedar House',monthlyRentUsd:500,electricity:'solar',water:'state_well_24_7',furnishingType:'furnished',bathroomPrivacy:'private',beds:2,bedrooms:2,bathrooms:1,maxOccupancy:2,floorNumber:1,description:'A bright apartment near campus with a living room.',contactName:'Test Host',contactPhone:'+96171123456',listingPosterRole:'landlord',primaryCampusId:'10000000-0000-4000-8000-000000000001',lat:33.89,lng:35.5,photos:[{id:'a',url:'/uploads/a.jpg'},{id:'b',url:'/uploads/b.jpg'},{id:'c',url:'/uploads/c.jpg'}],viewCount:12,contactTapCount:3,publishedAt:new Date().toISOString(),createdAt:new Date().toISOString(),expiresAt:'2099-01-01'};
const place={...fixture,id:'p1',kind:'building',amenities:[],photos:[],electricityCutWindows:[],targetAudience:'anyone',smokingPolicy:'no',petsPolicy:'no',guestsPolicy:'restricted',updatedAt:'2026-10-11T00:00:00.000Z'};
const entry=`import React from 'react';import {createRoot} from 'react-dom/client';import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {HostPlaceGroups} from './components/web/host/HostPlaceGroups';import {EditListingProvider} from './features/listings/edit/EditListingProvider';import {CreateStepAmenities} from './components/listings/create/CreateStepAmenities';import {CreateListingProvider,useCreateListingDraft} from './features/listings/create/CreateListingProvider';import {useUpdateListing} from './features/listings/useUpdateListing';import {normalizeListing} from './features/listings/normalizeListing';
const first=normalizeListing(${JSON.stringify(fixture)});const rows=[first,{...first,id:'u2',title:'Apartment two',viewCount:20,contactTapCount:5},{...first,id:'u3',placeId:'p2',title:'Other owner building',buildingName:'Separate place'}];
function Edit(){const {draft}=useCreateListingDraft();const save=useUpdateListing('u1');return <><CreateStepAmenities/><button onClick={()=>save.mutate(draft)}>Save unit</button>{save.isSuccess?<p>Unit saved</p>:null}{save.isError?<p role='alert'>Save failed</p>:null}</>}
function Draft(){const {draft,patch,persistDraft}=useCreateListingDraft();return <><p data-testid='draft-title'>{draft.title||'Empty draft'}</p><button onClick={()=>patch({title:'Owner saved room'})}>Change draft</button><button onClick={()=>persistDraft()}>Persist draft</button></>}
const params=new URLSearchParams(location.search);createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><main style={{maxWidth:1000,margin:'20px auto',padding:16}}>{params.has('draft')?<CreateListingProvider><Draft/></CreateListingProvider>:params.has('edit')?<EditListingProvider listingId='u1'><Edit/></EditListingProvider>:<HostPlaceGroups listings={rows} compact={innerWidth<700} layout={params.has('list')?'list':'grid'} onPress={()=>{}}/>}</main></QueryClientProvider>);`;
const stubs={
 api:`import axios from 'axios';export const API_BASE_URL=location.origin;export const api=axios.create({baseURL:location.origin});`,
 auth:`import {useSyncExternalStore} from 'react';let session={userId:'owner'};const listeners=new Set();window.changeAuth=userId=>{session={userId};listeners.forEach(fn=>fn());};export const useAuthSession=()=>({session:useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn);},()=>session),isSignedIn:true,isLoading:false,refreshUser:async()=>null});`,
 router:`export const router={push:v=>window.navigation=v,replace:v=>window.navigation=v};export const useRouter=()=>router;`,
 visuals:`export const Ionicons=()=>null;export const Image=()=>null;export const PromotionAction=()=>null;export const ListingAvailabilityControl=()=>null;`,
 enter:`export const Enter=({children})=>children;`,
 haptics:`export const ImpactFeedbackStyle={Light:'light'};export const impactAsync=async()=>{};`,
 gallery:`export const PhotoPickerGrid=()=>null;`,
 location:`export const CreateStepLocation=()=>null;`,
 icons:`export const ArrowUpDown=null,BatteryCharging=null,Droplets=null,Footprints=null,Globe=null,GraduationCap=null,Lightbulb=null,MapPin=null,Paintbrush=null,Shield=null,ShowerHead=null,Sparkles=null,Sun=null,UserRound=null,Users=null,VolumeOff=null,Wifi=null,Zap=null;`,
};
const bundle=await build({stdin:{contents:entry,loader:'tsx',resolveDir:root},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"test"',__DEV__:'true'},alias:{'react-native':'react-native-web'},plugins:[{name:'external-surfaces',setup(b){
 const rules=[[/^@\/lib\/api$/,'api'],[/AuthSessionProvider$/,'auth'],[/^expo-router$/,'router'],[/^(\.\/PromotionAction|@expo\/vector-icons|expo-image)$|ListingAvailabilityControl$/,'visuals'],[/\/Enter$/,'enter'],[/^expo-haptics$/,'haptics'],[/PhotoPickerGrid$/,'gallery'],[/CreateStepLocation$/,'location'],[/^lucide-react-native$/,'icons']];
 for(const [filter,id]of rules)b.onResolve({filter},()=>({path:id,namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},({path:p})=>({contents:stubs[p],resolveDir:root,loader:'tsx'}));
}}]});
const writes=[];let failShared=false;
const server=createServer(async(req,res)=>{
 if(req.url==='/bundle.js'){res.setHeader('content-type','text/javascript');res.end(bundle.outputFiles[0].text);return;}
 if(req.url?.startsWith('/api/')){
  res.setHeader('content-type','application/json');
  if(req.method==='PATCH'){let body='';for await(const c of req)body+=c;writes.push({path:req.url,body:JSON.parse(body)});
   if(failShared){res.statusCode=409;res.end(JSON.stringify({error:{message:'Shared details changed. Refresh before saving.'}}));return;}
  }
  res.end(JSON.stringify(req.url.includes('owner-edit')?{data:fixture,place,differentFields:[]}:req.url.includes('/places/')?{data:place}:{data:fixture}));return;
 }
 res.setHeader('content-type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
});
server.listen(0,'127.0.0.1');await once(server,'listening');const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'msedge',headless:true});const checks=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);await expect(page.getByText('Cedar House',{exact:true})).toHaveCount(1);await expect(page.getByText('Building · 2 units',{exact:true})).toBeVisible();await expect(page.getByText('12 views · 3 contact taps',{exact:true})).toHaveCount(2);await expect(page.getByText('20 views · 5 contact taps',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Add a unit',exact:true}).first().click();assert.equal((await page.evaluate(()=>window.navigation)).params.placeId,'p1');checks.push('place membership grouping, unit stats and Add a unit target');
 await page.getByRole('button',{name:'Edit shared details',exact:true}).first().click();await expect(page.getByText('Building details',{exact:true})).toBeVisible();failShared=true;await page.getByRole('button',{name:'Save shared details'}).click();await expect(page.getByRole('alert')).toHaveText('Shared details changed. Refresh before saving.');assert.equal(writes.at(-1).path,'/api/listings/places/p1');checks.push('shared editor uses owned place endpoint and surfaces stale-write failure');
 await page.screenshot({path:path.join(out,'shared-editor.png'),fullPage:true});
 place.updatedAt='2026-10-12T01:00:00.000Z';place.electricity='generator_24_7';place.generatorAmperes=10;
 await page.getByRole('button',{name:'Reload saved shared details'}).click();await expect(page.getByRole('alert')).toHaveCount(0);
 failShared=false;await page.getByRole('button',{name:'Save shared details'}).click();await expect.poll(()=>writes.at(-1).body.expectedUpdatedAt).toBe(place.updatedAt);assert.equal(writes.at(-1).body.details.electricity,'generator_24_7');
 checks.push('explicit shared reload refreshes values and concurrency version together');place.electricity='solar';
 failShared=false;await page.goto(origin+'?edit');await expect(page.getByText('Uses the shared details. Choose “Different for this apartment” to change them here.',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Different for this apartment'}).click();
 await page.getByText('24/7 Generator (Ishtirak)',{exact:true}).click();
 await page.getByRole('button',{name:'10A',exact:true}).click();await page.getByRole('button',{name:'Save unit',exact:true}).click();await expect(page.getByText('Unit saved',{exact:true})).toBeVisible();
 assert.equal(writes.at(-1).body.electricity,'generator_24_7');assert.ok(writes.at(-1).body.differentFields.includes('electricityCutWindows'));assert.equal(writes.at(-1).body.generatorAmperes,10);
 await page.getByRole('button',{name:'Same as building'}).click();await page.getByRole('button',{name:'Save unit',exact:true}).click();await expect.poll(()=>writes.at(-1).body.differentFields.length).toBe(0);assert.equal(writes.at(-1).body.electricity,'solar');checks.push('unit electricity can differ and return to shared values using host wording');
 await page.setViewportSize({width:390,height:844});await page.goto(origin+'?list');await expect(page.getByText('Building · 2 units',{exact:true})).toBeVisible();await expect(page.getByText('20 views · 5 contact taps',{exact:true})).toBeVisible();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,'grouped-phone.png'),fullPage:true});checks.push('grouped phone list keeps per-unit statistics without overflow');
 await page.goto(origin+'?draft');await expect(page.getByTestId('draft-title')).toHaveText('Empty draft');await page.getByRole('button',{name:'Change draft'}).click();await expect(page.getByTestId('draft-title')).toHaveText('Owner saved room');await page.getByRole('button',{name:'Persist draft'}).click();
 await expect.poll(()=>page.evaluate(()=>Object.keys(localStorage).some(k=>k.endsWith(':owner')&&localStorage.getItem(k).includes('Owner saved room')))).toBe(true);
 await page.evaluate(()=>window.changeAuth('second-owner'));await expect(page.getByTestId('draft-title')).toHaveText('Empty draft');await page.getByRole('button',{name:'Persist draft'}).click();
 await page.evaluate(()=>window.changeAuth('owner'));await expect(page.getByTestId('draft-title')).toHaveText('Owner saved room');checks.push('account switch clears an empty account and retains the original owner draft');
 assert.deepEqual(errors,[]);await writeFile(path.join(out,'result.json'),JSON.stringify({checks},null,2));console.log(JSON.stringify({checks},null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}

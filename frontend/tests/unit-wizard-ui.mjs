// Real exported wizard, upload/crop queue and publish adapter; API responses are controlled.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {build} from '../../backend/node_modules/esbuild/lib/main.js';
import {chromium,expect} from '@playwright/test';
const frontend=path.resolve(import.meta.dirname,'..'),root=path.join(frontend,'.expo/slice4-export'),out=path.join(frontend,'.expo/slice4-ui');await mkdir(out,{recursive:true});
const bundle=await build({stdin:{contents:`export * from './features/listings/create/draft';`,loader:'ts',resolveDir:frontend},bundle:true,write:false,format:'esm',platform:'node'});
const {INITIAL_DRAFT}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
const key='skoun.createListing.checkpoint.v1';
const photo=(id)=>({localId:id,status:'ready',uri:'https://photos.test/'+id+'.jpg',url:'https://photos.test/'+id+'.jpg',caption:'Bedroom'});
const baseDraft={...INITIAL_DRAFT,spaceType:'private_room',propertyType:'apartment',area:'Hamra',pin:{...INITIAL_DRAFT.pin,confirmed:true},primaryCampusId:'10000000-0000-4000-8000-000000000001',furnishingType:'furnished',electricity:'solar',water:'state_well_24_7',bathroomPrivacy:'shared',monthlyRentUsd:'300',areaSqm:'20',title:'Bright room near campus',description:'A bright room near campus with shared kitchen and living space.',listingPosterRole:'landlord',contactName:'Test Host',contactNumbers:[{kind:'mobile',prefix:'71',subscriber:'123456',calls:true,whatsapp:true}],photos:[photo('a'),photo('b'),photo('c')]};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.ttf':'font/ttf','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let target=path.resolve(root,'.'+pathname);
 if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 if(!path.extname(target))target+=pathname.endsWith('/')?'index.html':'.html';
 try{res.setHeader('content-type',mime[path.extname(target)]??'application/octet-stream');res.end(await readFile(target));}catch{res.writeHead(404);res.end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');const origin='http://127.0.0.1:'+server.address().port;
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#cbd5de"/><rect x="450" y="40" width="300" height="400" fill="#62849c"/></svg>';
const browser=await chromium.launch({channel:'msedge',headless:true});const checks=[],errors=[],publishes=[];let upload=0,failPublish=true;
async function pageFor(draft,width=1440,recover=false){
 const page=await browser.newPage({viewport:{width,height:1050},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://photos.test/**',r=>r.fulfill({contentType:'image/svg+xml',body:svg}));
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url());let data=[];
  if(url.pathname==='/api/listings/publish-quote'){const n=Number(url.searchParams.get('count'));data={units:Array.from({length:n},(_,index)=>({index,credits:index?1:0})),total:n-1,balance:recover?0:10};}
  if(url.pathname.startsWith('/api/listings/publish-units/'))data=recover?{listingIds:['u1','u2']}:null;
  if(url.pathname==='/api/listings/photos'){upload++;data={urls:['https://photos.test/upload-'+upload+'.jpg']};}
  if(url.pathname==='/api/listings/publish-units'){
   publishes.push(route.request().postDataJSON());
   if(failPublish){failPublish=false;return route.fulfill({status:503,json:{error:{message:'Temporary publish failure. Try again.'}}});}
   data={placeId:'p',listingIds:['u1','u2'],credits:[0,1],total:1};
  }
  if(url.pathname==='/api/listings/places/10000000-0000-4000-8000-000000000002')data={id:'10000000-0000-4000-8000-000000000002',kind:'building',area:'Hamra',buildingName:'Cedar House',primaryCampusId:baseDraft.primaryCampusId,lng:35.5,lat:33.89,electricity:'solar',water:'state_well_24_7',amenities:[],photos:[],targetAudience:'students_only',smokingPolicy:'no',petsPolicy:'no',guestsPolicy:'restricted'};
  if(url.pathname==='/api/listings/drafts')data={main:null,working:null};
  if(url.pathname==='/api/universities')data=[{id:baseDraft.primaryCampusId,name:'Test Campus',slug:'test-campus',active:true}];
  return route.fulfill({json:{data}});
 });
 if(draft)await page.addInitScript(({key,draft})=>{
  if(!sessionStorage.getItem('seed')){localStorage.setItem(key,JSON.stringify({draft,savedStep:draft.step,committedStep:draft.step-1,savedAt:new Date().toISOString()}));sessionStorage.setItem('seed','1');}
 },{key,draft});
 return page;
}
try{
 const fresh=await pageFor();await fresh.goto(origin+'/create?new=1');
 await expect(fresh.getByText('What are you listing?',{exact:true})).toBeVisible({timeout:90000});
 await fresh.getByText('Whole apartment',{exact:true}).click();await expect(fresh.getByText('How many are you listing?',{exact:true})).toBeVisible();
 await fresh.getByRole('button',{name:'Increase How many are you listing?'}).click();await fresh.getByRole('button',{name:'Apartment',exact:true}).click();await fresh.getByRole('button',{name:'Next',exact:true}).click();
 await expect(fresh.getByText('Building details',{exact:true})).toBeVisible();checks.push('first question, count, building branch');await fresh.close();
 const batch={...baseDraft,step:5,unitCount:2,additionalUnits:[{id:'second',data:{photos:[photo('d'),photo('e'),photo('f')],monthlyRentUsd:'450',areaSqm:'30',bathroomPrivacy:'private',title:'Second room near campus',description:baseDraft.description,furnishingType:'furnished'}}]};
 const page=await pageFor(batch);await page.goto(origin+'/create');
 await expect(page.getByText('Your units',{exact:true})).toBeVisible({timeout:90000});
 await expect(page.getByText('Shared photos · optional',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:/Room 2 · Second room/}).click();await page.getByLabel('Monthly rent in USD').filter({visible:true}).fill('475');
 const transfer=await page.evaluateHandle(svg=>{const d=new DataTransfer();d.items.add(new File([svg],'shared.svg',{type:'image/svg+xml'}));return d;},svg);
 await page.locator('[data-photo-drop]').first().dispatchEvent('drop',{dataTransfer:transfer});await transfer.dispose();
 await expect(page.getByRole('dialog',{name:'Crop photos'})).toBeVisible();await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect.poll(()=>upload).toBe(1);await expect(page.getByText('1 shared photos ready · 0–15 allowed.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Save and exit'}).click();await page.goto(origin+'/create');
 await expect(page.getByText('Your units',{exact:true})).toBeVisible();await expect(page.getByText('1 shared photos ready · 0–15 allowed.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:/Room 2 · Second room/}).click();await expect(page.getByLabel('Monthly rent in USD').filter({visible:true})).toHaveValue('475');
 await page.screenshot({path:path.join(out,'unit-cards.png'),fullPage:true});checks.push('repeated unit cards, shared crop/upload, independent rent and saved galleries');
 await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.getByText('How they reach you',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Next',exact:true}).click();
 await expect(page.getByText('Total: 1 post credits',{exact:true})).toBeVisible();await expect(page.getByText('0 post credits',{exact:true})).toBeVisible();await expect(page.getByText('1 post credit',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Publish units',exact:true}).click();await expect(page.getByText('Temporary publish failure. Try again.',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Publish units',exact:true}).click();
 await expect.poll(()=>publishes.length).toBe(2);assert.equal(publishes[0].requestId,publishes[1].requestId);assert.equal(publishes[0].units.length,2);assert.equal(publishes[0].units[0].details.monthlyRentUsd,300);assert.equal(publishes[0].units[1].details.monthlyRentUsd,475);assert.equal(publishes[0].sharedPhotos.length,1);assert.equal(publishes[0].units[0].details.photoUrls[0],photo('a').url);checks.push('per-unit credit review, single batch publish, stable retry ID and unit cover');await page.close();
 const legacy=await pageFor({...baseDraft,schemaVersion:undefined,bathroomPrivacy:undefined,step:6},390);await legacy.goto(origin+'/create');await expect(legacy.getByText('Rent and terms',{exact:true})).toBeVisible({timeout:90000});await expect(legacy.getByLabel('Monthly rent in USD')).toHaveValue('300');await legacy.screenshot({path:path.join(out,'legacy-phone.png'),fullPage:true});assert.ok(await legacy.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks.push('legacy draft keeps saved step and phone layout');await legacy.close();
 const add=await pageFor(undefined,390);await add.goto(origin+'/create?new=1&placeId=10000000-0000-4000-8000-000000000002');await add.getByText('Whole apartment',{exact:true}).click();await add.getByRole('button',{name:'Apartment',exact:true}).click();await add.getByRole('button',{name:'Next',exact:true}).click();await expect(add.getByText('Your units',{exact:true})).toBeVisible();await expect(add.getByText('Shared photos are saved with this building.',{exact:true})).toBeVisible();checks.push('Add a unit loads owned shared building details and skips shared questions');await add.close();
 const recovered=await pageFor({...batch,step:9,publishRequestId:'10000000-0000-4000-8000-000000000099'},1440,true);const priorCount=publishes.length;await recovered.goto(origin+'/create');await expect(recovered).toHaveURL(/hosting\/listing/,{timeout:30000});assert.equal(publishes.length,priorCount);checks.push('completed publish recovers from its receipt after reopening with zero credits');await recovered.close();
 const unexpected=errors.filter(e=>!/Minified React error #(418|423|425)|Hydration failed|hydration/i.test(e));assert.deepEqual(unexpected,[]);
 await writeFile(path.join(out,'result.json'),JSON.stringify({checks,existingHydrationWarnings:errors.length-unexpected.length},null,2));console.log(JSON.stringify({checks},null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}

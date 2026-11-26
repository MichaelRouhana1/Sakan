import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { build } from '../../backend/node_modules/esbuild/lib/main.js';
import { env, postgres, signIn, apiRequest } from './creation-wizard-auth.mjs';
import { fixture, photos, photoNames } from './creation-wizard-fixtures.mjs';

const root=path.resolve(import.meta.dirname,'..'), base=process.env.STUDENTLY_TEST_URL??'http://localhost:8084',api='http://localhost:3002';
const out=path.resolve(root,process.env.STUDENTLY_ARTIFACT_DIR??'../artifacts/production-wizard');await mkdir(out,{recursive:true});
const url=new URL(env.DATABASE_URL);if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.pathname!=='/studently_dev')throw Error('UI tests require local studently_dev');
const sql=postgres(url.toString(),{max:1,onnotice:()=>{}});
const [guard]=await sql`SELECT environment,database_name FROM studently_ops.environment_guard WHERE singleton=true`;
assert.equal(guard.environment,'local');assert.equal(guard.database_name,'studently_dev');
const bundle=await build({stdin:{contents:`export * from './features/listings/create/v2/model';`,loader:'ts',resolveDir:root},bundle:true,write:false,format:'esm',platform:'node'});
const m=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
const browser=await chromium.launch({channel:'msedge',headless:true});
const contexts=[],checks=[],screenshots=[],errors=[],draftIds=new Set(),requestIds=new Set(),uploads=new Set();
let owner,before,firstPlace,firstPublished,authState;
const createContext=async(width,state=authState)=>{
  const c=await browser.newContext({viewport:{width,height:width<600?900:1000},isMobile:width<600,hasTouch:width<600,reducedMotion:'reduce',...(state?{storageState:state}:{})});contexts.push(c);
  const p=await c.newPage();p.on('pageerror',e=>errors.push(`${width}px ${new URL(p.url()).pathname}: ${e.message}`));
  p.on('response',async r=>{try{const u=new URL(r.url());if(u.pathname==='/api/listings/creation-drafts'&&r.request().method()==='POST'&&r.ok())draftIds.add((await r.json()).data.id);if(u.pathname==='/api/listings/photos'&&r.ok())for(const v of (await r.json()).data.urls)uploads.add(v);}catch{}});
  p.on('request',r=>{if(new URL(r.url()).pathname==='/api/listings/publish-units'&&r.method()==='POST')requestIds.add(r.postDataJSON().requestId);});return{c,p};
};
async function screen(p,name){await expect(p.getByTestId(`screen-${name}`)).toBeVisible({timeout:90000});}
async function shot(p,file,fullPage=false){
  if(await p.locator('[data-wizard-art-asset]').count()){
    const art=p.locator('[data-wizard-art-asset]'),id=await art.getAttribute('data-wizard-art-asset');
    const data=JSON.parse(await readFile(path.join(root,'assets/lottie/wizard',id+'.json'),'utf8'));
    await expect(art.locator('svg')).toHaveCount(1,{timeout:30000});
    await expect(art.locator('svg')).toHaveAttribute('viewBox',`0 0 ${data.w} ${data.h}`,{timeout:30000});
  }
  const bytes=await p.screenshot({fullPage});
  for(let attempt=0;;attempt++){
    try{await writeFile(path.join(out,file),bytes);return;}
    catch(e){if(attempt>=5||!['UNKNOWN','EPERM','EBUSY'].includes(e.code))throw e;await new Promise(resolve=>setTimeout(resolve,150*(attempt+1)));}
  }
}
async function capture(p,name){
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name}: no horizontal overflow`);
  await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(400);
  const save=async suffix=>{const file=name+suffix+'.png';await shot(p,file,true);screenshots.push(file);};
  await save('');
  // The form has its own scroll area so the fixed actions stay visible. Capture its remaining fields too.
  const form=p.locator('[data-testid^="screen-"]');
  if(!await form.count())return;
  await expect(form.getByRole('heading').first()).toHaveCSS('font-family',/DMSans_700Bold|DM Sans/);
  assert.ok(await p.evaluate(()=>[...document.fonts].some(font=>(font.family.includes('DMSans_700Bold')||font.family.includes('DM Sans'))&&font.status==='loaded')),`${name}: display font loaded`);
  await expect(form).toHaveCSS('border-top-width','0px');
  assert.ok(!/prototype|saved on this browser/i.test(await form.innerText()),`${name}: production copy`);
  const scroller=await form.evaluateHandle(el=>{for(let a=el.parentElement;a;a=a.parentElement)if(a.scrollHeight>a.clientHeight+10&&getComputedStyle(a).overflowY==='auto')return a;return null;});
  const metrics=await scroller.evaluate(el=>el?{top:el.scrollTop,height:el.clientHeight,max:el.scrollHeight-el.clientHeight}:null);
  if(metrics&&metrics.top<10){for(let top=metrics.height-80,part=2;top<metrics.max+metrics.height-80;top+=metrics.height-80,part++){await scroller.evaluate((el,y)=>{el.scrollTop=Math.min(y,el.scrollHeight-el.clientHeight);},top);await p.waitForTimeout(80);await save(`-part-${part}`);if(top>=metrics.max)break;}await scroller.evaluate((el,y)=>{el.scrollTop=y;},metrics.top);}
  await scroller.dispose();
}
async function next(p,from,to,label='Next'){await screen(p,from);await p.getByRole('button',{name:label,exact:true}).click();await screen(p,to);}
async function create(p,payload){if(p.url()==='about:blank')await p.goto(`${base}/hosting/listing`,{timeout:90000});const row=await apiRequest(p,api,'/api/listings/creation-drafts','POST',{id:randomUUID(),payload});draftIds.add(row.id);return row;}
async function open(p,row){await p.goto(`${base}/create?draftId=${row.id}`,{timeout:90000});await screen(p,row.payload.position.screen);}
async function upload(p){
  const bytes=await readFile(path.resolve(root,'../backend/uploads/listings',photoNames[0]));
  const transfer=await p.evaluateHandle(encoded=>{const b=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));const d=new DataTransfer();d.items.add(new File([b],'acceptance-bedroom.jpg',{type:'image/jpeg'}));return d;},bytes.toString('base64'));
  await p.locator('[data-photo-drop]').dispatchEvent('drop',{dataTransfer:transfer});await transfer.dispose();await expect(p.getByRole('dialog',{name:'Crop photos'})).toBeVisible();await p.getByRole('button',{name:'Save',exact:true}).click();await expect(p.getByRole('dialog',{name:'Crop photos'})).toHaveCount(0);
}
async function uploadThree(p){for(let i=0;i<3;i++)await upload(p);await expect(p.getByText(/3 ready · first image/)).toBeVisible();}
async function publish(p,label){await expect(p.getByRole('button',{name:label,exact:true})).toBeEnabled();await p.getByRole('button',{name:label,exact:true}).click();await screen(p,'success');}

try{
  const first=await createContext(1440,null);await signIn(first.p,base);
  const me=await apiRequest(first.p,api,'/api/users/me');owner=me.id;
  [before]=await sql`SELECT post_credits,role,free_slot_publishes_month_key,free_slot_publishes_month,free_credit_claimed FROM users WHERE id=${owner}`;
  await sql`UPDATE users SET post_credits=80 WHERE id=${owner}`;
  authState=await first.c.storageState();
  const campuses=await apiRequest(first.p,api,'/api/universities');const campus=campuses.find(x=>x.slug==='aub')??campuses[0];
  await first.c.close();
  for(const width of [1440,375]){
    const device=width===375?'mobile':'desktop';const {c,p}=await createContext(width);
    try{
      const row=await create(p,fixture(m,campus.id,api));await open(p,row);
      const order=['place-type','location','utilities','rules','building-photos','layout','photos','rent','copy','another','review'];
      for(let i=0;i<9;i++){
        if(order[i]==='utilities'){
          const marker=p.getByTestId('wizard-water-marker');
          await marker.evaluate(el=>{for(let a=el.parentElement;a;a=a.parentElement)if(a.scrollHeight>a.clientHeight+10&&getComputedStyle(a).overflowY==='auto'){a.scrollTop+=el.getBoundingClientRect().top-a.getBoundingClientRect().top-a.clientHeight*.35;return;}});
          await expect(p.locator('[data-wizard-art-asset]')).toHaveAttribute('data-wizard-art-asset','water');await capture(p,`${device}-utilities-water`);
          await marker.evaluate(el=>{for(let a=el.parentElement;a;a=a.parentElement)if(a.scrollHeight>a.clientHeight+10&&getComputedStyle(a).overflowY==='auto'){a.scrollTop=0;return;}});
          await expect(p.locator('[data-wizard-art-asset]')).toHaveAttribute('data-wizard-art-asset','utilities');
        }
        await capture(p,`${device}-${String(i+1).padStart(2,'0')}-${order[i]}`);await next(p,order[i],order[i+1],order[i]==='building-photos'?'Skip for now':order[i]==='copy'?'Finish unit':'Next');
      }
      await capture(p,`${device}-10-another`);await p.reload();await screen(p,'another');
      await p.getByRole('button',{name:'Done — review units',exact:true}).click();await screen(p,'review');await capture(p,`${device}-11-review`);
      await p.getByText('Publishing cost',{exact:true}).scrollIntoViewIfNeeded();await capture(p,`${device}-11-contact-cost`);
      await publish(p,'Publish');await capture(p,`${device}-12-success`);
      const published=await apiRequest(p,api,`/api/listings/creation-drafts/${row.id}`);assert.equal(published.status,'published');assert.equal(published.result.listingIds.length,1);firstPlace??=published.result.placeId;firstPublished??=published.result.listingIds[0];
      const second=await createContext(width);await second.p.goto(`${base}/create?draftId=${row.id}`);await screen(second.p,'success');await second.c.close();
      checks.push(`${device}: every screen captured, real one-unit publishing and a second browser recovers the receipt`);

      let payload=fixture(m,campus.id,api);payload.completedPlace=[...m.PLACE_SCREENS];payload.units[0].finished=true;payload.position.screen='another';
      const many=await create(p,payload);await open(p,many);
      for(let n=2;n<=3;n++){
        await p.getByRole('button',{name:'Copy this unit',exact:true}).click();await screen(p,'layout');await capture(p,`${device}-copy-unit-${n}-layout`);
        await next(p,'layout','photos');await expect(p.locator('[data-photo-tile]')).toHaveCount(0);await capture(p,`${device}-copy-unit-${n}-empty-photos`);await uploadThree(p);
        await next(p,'photos','rent');await p.getByLabel('Monthly rent in USD').fill(n===2?'750':'850');await next(p,'rent','copy');
        await expect(p.getByLabel('Listing title')).toHaveValue(/\(copy\)$/);await capture(p,`${device}-copy-unit-${n}-title`);if(n===3)await p.getByLabel('Listing title').fill('Third floor near campus');
        await next(p,'copy','another','Finish unit');await expect(p.getByTestId('creation-unit-row')).toHaveCount(n);
      }
      await capture(p,`${device}-three-unit-summary`);await p.getByRole('button',{name:'Done — review units',exact:true}).click();await screen(p,'review');
      await p.getByRole('button',{name:'Edit unit 2',exact:true}).click();await screen(p,'layout');await next(p,'layout','photos');await next(p,'photos','rent');await p.getByLabel('Monthly rent in USD').fill('775');await next(p,'rent','copy');await next(p,'copy','review','Save unit');
      await expect(p.getByTestId('creation-unit-row').nth(1)).toContainText('$775');await capture(p,`${device}-three-unit-review`);
      await p.getByRole('button',{name:'Remove unit 3',exact:true}).click();await capture(p,`${device}-remove-confirmation`);await p.getByRole('button',{name:'Keep unit',exact:true}).click();
      await publish(p,'Publish all');await capture(p,`${device}-three-unit-published`);
      const manyResult=await apiRequest(p,api,`/api/listings/creation-drafts/${many.id}`);assert.equal(manyResult.result.listingIds.length,3);
      checks.push(`${device}: three independent units via Copy, real photos, suffix only on copy, summary, edit-return, removal cancellation, real batch credits`);

      await p.goto(`${base}/create?placeId=${firstPlace}&new=1`);await screen(p,'layout');
      await expect(p).toHaveURL(/draftId=/);
      const existingId=new URL(p.url()).searchParams.get('draftId');draftIds.add(existingId);
      let ex=await apiRequest(p,api,`/api/listings/creation-drafts/${existingId}`);
      ex.payload.units[0].data=fixture(m,campus.id,api).units[0].data;
      ex=await apiRequest(p,api,`/api/listings/creation-drafts/${existingId}`,'PUT',{payload:ex.payload,revision:ex.revision});
      await open(p,ex);await expect(p.getByRole('button',{name:'Place · existing',exact:true})).toBeDisabled();
      for(const [i,from,to,label] of [[0,'layout','photos','Next'],[1,'photos','rent','Next'],[2,'rent','copy','Next'],[3,'copy','another','Finish unit']]){await capture(p,`${device}-existing-${i+1}-${from}`);await next(p,from,to,label);}
      await p.getByRole('button',{name:'Done — review units',exact:true}).click();await screen(p,'review');
      await p.getByRole('button',{name:'Landlord / owner',exact:true}).click();await p.getByLabel('Contact name').fill('Acceptance Host');await p.getByLabel('Lebanese mobile number 1',{exact:true}).fill('123456');
      await capture(p,`${device}-existing-review`);await publish(p,'Publish');
      assert.equal((await apiRequest(p,api,`/api/listings/creation-drafts/${ex.id}`)).result.placeId,firstPlace);
      checks.push(`${device}: existing place skips all place screens and publishes only the new unit into the original place`);
    }finally{await c.close();}
  }

  const {c,p}=await createContext(1440);
  try{
    let payload=fixture(m,campus.id,api);payload.completedPlace=[...m.PLACE_SCREENS];payload.units[0].finished=true;payload.position.screen='another';
    const row=await create(p,payload);await open(p,row);await p.getByRole('button',{name:'Start blank',exact:true}).click();await screen(p,'layout');
    await p.getByRole('button',{name:'Next',exact:true}).click();await expect(p.getByRole('alert')).toContainText('Choose a rental type');
    await p.getByRole('button',{name:'Whole apartment',exact:true}).click();await p.getByRole('button',{name:'Apartment',exact:true}).click();await p.getByRole('button',{name:'Private bathroom',exact:true}).click();await p.getByRole('button',{name:'Fully furnished',exact:true}).click();
    await next(p,'layout','photos');await uploadThree(p);await next(p,'photos','rent');await expect(p.getByLabel('Monthly rent in USD')).toHaveValue('');await p.getByLabel('Monthly rent in USD').fill('500');await next(p,'rent','copy');
    await expect(p.getByLabel('Listing title')).toHaveValue('');await p.getByLabel('Listing title').fill('A new apartment from scratch');await p.getByLabel('Listing description').fill('A bright apartment with a comfortable study space and a private bathroom.');await next(p,'copy','another','Finish unit');
    await p.getByRole('button',{name:'Done — review units',exact:true}).click();await screen(p,'review');
    await p.getByRole('button',{name:'Remove unit 2',exact:true}).click();await p.getByRole('button',{name:'Remove unit',exact:true}).click();await expect(p.getByTestId('creation-unit-row')).toHaveCount(1);
    await p.getByRole('button',{name:'Remove unit 1',exact:true}).click();await p.getByRole('button',{name:'Remove unit',exact:true}).click();await expect(p.getByRole('button',{name:'Publish',exact:true})).toBeDisabled();
    checks.push('Start blank keeps title/rent/photos empty; validation and confirmed removal work; empty batches cannot publish');

    let review=fixture(m,campus.id,api);review.position.screen='review';review.reviewVisited=true;review.completedPlace=[...m.PLACE_SCREENS];review.units[0].finished=true;
    const failed=await create(p,review);await open(p,failed);await expect(p.getByRole('button',{name:'Publish',exact:true})).toBeEnabled();await sql`UPDATE users SET post_credits=0 WHERE id=${owner}`;
    await p.getByRole('button',{name:'Publish',exact:true}).click();await expect(p.getByText(/One post credit is required/)).toBeVisible();await capture(p,'desktop-402-no-credits');
    assert.equal((await apiRequest(p,api,`/api/listings/creation-drafts/${failed.id}`)).status,'active');
    await p.getByRole('button',{name:'Buy credits',exact:true}).click();await expect(p).toHaveURL(/\/hosting\/credits.*returnTo=/);await sql`UPDATE users SET post_credits=60 WHERE id=${owner}`;await open(p,failed);
    const other=await createContext(375);await other.p.goto(`${base}/create?draftId=${failed.id}`);await screen(other.p,'review');
    const newer=await apiRequest(other.p,api,`/api/listings/creation-drafts/${failed.id}`);newer.payload.units[0].data.title='Updated on the second device';await apiRequest(other.p,api,`/api/listings/creation-drafts/${failed.id}`,'PUT',{payload:newer.payload,revision:newer.revision});
    await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(p.getByText('Updated on another device. Reload?')).toBeVisible();await p.getByRole('button',{name:'Reload',exact:true}).click();await expect(p.getByText('Updated on the second device',{exact:true})).toBeVisible();await other.c.close();
    checks.push('Real 402 preserves draft and offers credit purchase with return URL; another device resumes server work and triggers the reload notice');

    let saveFail=true;await p.route('**/api/listings/creation-drafts/*',async r=>{if(r.request().method()==='PUT'&&saveFail)await r.fulfill({status:503,json:{error:{message:'Save temporarily unavailable'}}});else await r.continue();});
    await p.getByLabel('Contact name').fill('Saved after retry');await expect(p.getByText('Couldn’t save',{exact:true})).toBeVisible();await capture(p,'desktop-save-error');saveFail=false;await p.getByRole('button',{name:'Retry',exact:true}).click();await expect(p.getByText('Saved',{exact:true})).toBeVisible();await p.unroute('**/api/listings/creation-drafts/*');
    let conflict=true;await p.route('**/api/listings/publish-units',async r=>{if(conflict){conflict=false;const d=await apiRequest(p,api,`/api/listings/creation-drafts/${failed.id}`);await apiRequest(p,api,`/api/listings/creation-drafts/${failed.id}`,'PUT',{payload:d.payload,revision:d.revision});}await r.continue();});
    await p.getByRole('button',{name:'Publish',exact:true}).click();await expect(p.getByText(/Your draft changed on another device/)).toBeVisible();await capture(p,'desktop-409-review-again');await p.unroute('**/api/listings/publish-units');
    await p.getByRole('button',{name:'Reload',exact:true}).click();
    let posts=0;await p.route('**/api/listings/publish-units',async r=>{posts++;const response=await r.fetch();assert.ok(response.ok());await r.fulfill({response,status:503,json:{error:{message:'Response interrupted after publishing'}}});});
    const balance=(await sql`SELECT post_credits FROM users WHERE id=${owner}`)[0].post_credits;
    await p.getByRole('button',{name:'Publish',exact:true}).click();await expect(p.getByRole('button',{name:'Retry publishing',exact:true})).toBeVisible();await p.getByRole('button',{name:'Retry publishing',exact:true}).click();await screen(p,'success');assert.equal(posts,1);assert.equal((await sql`SELECT post_credits FROM users WHERE id=${owner}`)[0].post_credits,balance-1);await p.unroute('**/api/listings/publish-units');
    checks.push('Save failure/Retry, actual 409 rejection and recovery, lost publish response recovered by receipt with one POST and one credit charge');

    const late=fixture(m,campus.id,api);late.completedPlace=[...m.PLACE_SCREENS];late.units[0].finished=true;
    late.units.push({...structuredClone(late.units[0]),id:randomUUID()});late.position.screen='photos';
    const lateRow=await create(p,late);await open(p,lateRow);
    let releaseUpload,uploadStarted;const started=new Promise(resolve=>{uploadStarted=resolve;});const held=new Promise(resolve=>{releaseUpload=resolve;});
    await p.route('**/api/listings/photos',async r=>{const response=await r.fetch();for(const url of (await response.json()).data.urls)uploads.add(url);uploadStarted();await held;await r.fulfill({response});});
    await upload(p);await started;await p.getByRole('button',{name:'Unit 2',exact:true}).click();await screen(p,'layout');releaseUpload();
    await expect.poll(async()=>{const d=await apiRequest(p,api,`/api/listings/creation-drafts/${lateRow.id}`);return d.payload.units[0].data.photos.filter(x=>x.status==='ready').length;}).toBe(4);
    const lateSaved=await apiRequest(p,api,`/api/listings/creation-drafts/${lateRow.id}`);assert.equal(lateSaved.payload.units[1].data.photos.length,3);await p.unroute('**/api/listings/photos');
    checks.push('A real upload completing after switching units updates its original unit without leaking photos into the other unit');

    await p.goto(`${base}/hosting/listing?edit=${firstPublished}`);await expect(p.getByLabel('Listing title')).toHaveValue('Sunny apartment near campus');
    await p.getByLabel('Listing title').fill('Sunny apartment after an edit');const edited=p.waitForResponse(r=>r.url().endsWith(`/api/listings/${firstPublished}`)&&r.request().method()==='PATCH');
    await p.getByRole('button',{name:'Save changes',exact:true}).click();assert.equal((await edited).status(),200);await p.getByRole('button',{name:'Close edit',exact:true}).last().click();
    checks.push('The live-listing editor still loads and saves through the extracted shared forms');
    await p.goto(`${base}/hosting/listing`);await expect(p.getByTestId('listings-workspace')).toBeVisible();await expect(p.getByRole('button',{name:/Continue draft/}).first()).toBeVisible();await capture(p,'desktop-in-progress');
    checks.push('Your listings shows server drafts in In progress with Continue');
  }finally{await c.close();}
  for(const width of [768,1024]){const {c,p}=await createContext(width);try{const row=await create(p,fixture(m,campus.id,api));await open(p,row);await capture(p,`tablet-${width}`);await p.keyboard.press('Tab');assert.notEqual(await p.evaluate(()=>document.activeElement?.tagName),'BODY');}finally{await c.close();}}
  const max=await createContext(375);
  try{
    const payload=fixture(m,campus.id,api);payload.completedPlace=[...m.PLACE_SCREENS];payload.position.screen='review';payload.reviewVisited=true;
    payload.units=Array.from({length:20},(_,i)=>({...structuredClone(payload.units[0]),id:i?randomUUID():payload.units[0].id,finished:true}));
    const row=await create(max.p,payload);await open(max.p,row);
    const inHeader=async label=>expect.poll(async()=>{const box=await max.p.getByRole('button',{name:label,exact:true}).boundingBox();return Boolean(box&&box.x>=0&&box.x+box.width<=375);}).toBe(true);
    await inHeader('Review');await expect(max.p.getByRole('button',{name:'+ Add another unit',exact:true})).toBeDisabled();
    await shot(max.p,'mobile-progress-20-units.png');screenshots.push('mobile-progress-20-units.png');
    await max.p.getByRole('button',{name:'Edit unit 1',exact:true}).click();await screen(max.p,'layout');await inHeader('Unit 1');
    await shot(max.p,'mobile-progress-jump-unit-1.png');screenshots.push('mobile-progress-jump-unit-1.png');
    checks.push('At the 20-unit maximum on mobile, adding is disabled and the progress header follows Review and jumps back to the edited unit');
    const motion=max.p.locator('[data-wizard-art-asset]');
    const mutations=()=>max.p.evaluate(()=>new Promise(resolve=>{let count=0;const svg=document.querySelector('[data-wizard-art-asset] svg');const observer=new MutationObserver(records=>{count+=records.length;});observer.observe(svg,{attributes:true,subtree:true});setTimeout(()=>{observer.disconnect();resolve(count);},700);}));
    await max.p.emulateMedia({reducedMotion:'no-preference'});await expect(motion).toHaveAttribute('data-wizard-motion','playing');await max.p.waitForTimeout(300);assert.ok(await mutations()>0,'Original artwork animates with motion enabled');
    await max.p.emulateMedia({reducedMotion:'reduce'});await expect(motion).toHaveAttribute('data-wizard-motion','still');await max.p.waitForTimeout(300);assert.equal(await mutations(),0,'Reduced motion freezes the artwork');
    checks.push('The original illustration assets render on every screen, DM Sans headings and the unboxed layout are in place, and motion preferences start/stop the artwork');
  }finally{await max.c.close();}
  assert.deepEqual(errors,[]);
}catch(e){for(const c of contexts){const p=c.pages().at(-1);if(p&&!p.isClosed())await p.screenshot({path:path.join(out,'failure-screen.png')}).catch(()=>{});}await writeFile(path.join(out,'failure.json'),JSON.stringify({error:String(e),checks,errors},null,2));throw e;}
finally{
  for(const c of contexts)await c.close().catch(()=>{});await browser.close();
  if(owner&&before){
    const receipts=requestIds.size?await sql`SELECT result FROM unit_publish_batches WHERE owner_id=${owner} AND request_id=ANY(${[...requestIds]}::uuid[])`:[];
    const ids=[...new Set(receipts.flatMap(r=>r.result.listingIds))],places=[...new Set(receipts.map(r=>r.result.placeId))];
    if(ids.length){await sql`DELETE FROM listing_charge_ledger WHERE listing_id_snapshot=ANY(${ids}::uuid[])`;await sql`DELETE FROM listings WHERE id=ANY(${ids}::uuid[])`;}
    if(requestIds.size)await sql`DELETE FROM unit_publish_batches WHERE owner_id=${owner} AND request_id=ANY(${[...requestIds]}::uuid[])`;
    if(places.length)await sql`DELETE FROM places WHERE id=ANY(${places}::uuid[]) AND NOT EXISTS(SELECT 1 FROM listings WHERE place_id=places.id)`;
    if(draftIds.size)await sql`DELETE FROM creation_drafts WHERE owner_id=${owner} AND id=ANY(${[...draftIds]}::uuid[])`;
    await sql`UPDATE users SET post_credits=${before.post_credits},role=${before.role},free_slot_publishes_month_key=${before.free_slot_publishes_month_key},free_slot_publishes_month=${before.free_slot_publishes_month},free_credit_claimed=${before.free_credit_claimed} WHERE id=${owner}`;
    const [restored]=await sql`SELECT post_credits,role,free_slot_publishes_month_key,free_slot_publishes_month,free_credit_claimed FROM users WHERE id=${owner}`;assert.deepEqual(restored,before);
    await writeFile(path.join(out,'restoration.json'),JSON.stringify({restored:true,testUnitsRemoved:ids.length,testPlacesRemoved:places.length,draftsRemoved:draftIds.size,accountBalanceAndRoleRestored:true},null,2));
  }
  await sql.end();
  for(const url of uploads){const pathname=new URL(url).pathname;if(!/^\/uploads\/listings\/[0-9a-f-]{36}\.jpg$/.test(pathname))continue;const target=path.resolve(root,'../backend','.'+pathname);const allowed=path.resolve(root,'../backend/uploads/listings')+path.sep;if(!target.startsWith(allowed))throw Error('Upload cleanup escaped its directory');await unlink(target).catch(()=>{});}
}
await writeFile(path.join(out,'acceptance-results.json'),JSON.stringify({checks,screenshots,uncaughtBrowserErrors:errors},null,2));console.log(JSON.stringify({checks,screenshots:screenshots.length,uncaughtBrowserErrors:errors.length},null,2));

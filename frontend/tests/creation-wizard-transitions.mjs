import { chromium, expect } from '@playwright/test';
import { build } from '../../backend/node_modules/esbuild/lib/main.js';
import { signIn, apiRequest, env, postgres } from './creation-wizard-auth.mjs';
import { fixture } from './creation-wizard-fixtures.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),base=process.env.STUDENTLY_TEST_URL??'http://localhost:8085',out=path.resolve(root,process.env.STUDENTLY_ARTIFACT_DIR??'../artifacts/wizard-transition-fix/after');await mkdir(out,{recursive:true});
const bundle=await build({stdin:{contents:`export * from './features/listings/create/v2/model';`,loader:'ts',resolveDir:root},bundle:true,write:false,format:'esm',platform:'node'});const m=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
const url=new URL(env.DATABASE_URL);if(url.pathname!=='/studently_dev'||!['localhost','127.0.0.1'].includes(url.hostname))throw Error('Local dev only');
const sql=postgres(url.toString(),{max:1,onnotice:()=>{}});const [guard]=await sql`SELECT environment FROM studently_ops.environment_guard WHERE singleton=true`;if(guard.environment!=='local')throw Error('Guard');
const b=await chromium.launch({channel:'msedge',headless:true});const c=await b.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});const p=await c.newPage(),ids=new Set();let owner;const errors=[];p.on('pageerror',e=>errors.push(e.message));
p.on('response',async r=>{if(r.url().endsWith('/api/listings/creation-drafts')&&r.request().method()==='POST'&&r.ok())ids.add((await r.json()).data.id);});
try{
await signIn(p,base);owner=(await apiRequest(p,'http://localhost:3002','/api/users/me')).id;const campuses=await apiRequest(p,'http://localhost:3002','/api/universities');const payload=fixture(m,campuses[0].id,'http://localhost:3002');

const metrics=[];
for(const width of [1920,375]){
const row=await apiRequest(p,'http://localhost:3002','/api/listings/creation-drafts','POST',{id:randomUUID(),payload});ids.add(row.id);
await p.setViewportSize({width,height:width===375?900:1080});await p.goto(base+'/create?draftId='+row.id);await expect(p.getByTestId('screen-place-type')).toBeVisible();await expect(p.locator('[data-wizard-art-asset] svg')).toHaveCount(1);await p.waitForTimeout(700);
const device=width===375?'mobile':'desktop';await p.screenshot({path:path.join(out,device+'-header.png')});
const alignment=await p.getByTestId('wizard-header').evaluate(el=>{const texts=[...el.querySelectorAll('div')].filter(n=>n.childElementCount===0&&n.textContent?.trim()).map(n=>({text:n.textContent,box:n.getBoundingClientRect().toJSON()}));return texts;});
if(width===1920){const progressBox=await p.getByTestId('wizard-progress').boundingBox();assert.ok(progressBox.width<=720,'Progress stays compact on wide screens');assert.ok(Math.abs(progressBox.x+progressBox.width/2-width/2)<=1,'Progress stays centered on the page');const centers=alignment.filter(x=>['Save & exit','Saved','Place','Unit 1','Review'].includes(x.text)).map(x=>x.box.y+x.box.height/2);assert.ok(Math.max(...centers)-Math.min(...centers)<=1,'Header text shares one center line');}
const placeButton=p.getByRole('button',{name:'Place',exact:true});const beforeSave=await placeButton.boundingBox();let saveSeen=false;await p.route('**/api/listings/creation-drafts/*',async route=>{if(route.request().method()==='PUT'){saveSeen=true;await new Promise(resolve=>setTimeout(resolve,500));}await route.continue();});
for(const screen of ['location','utilities','rules','building-photos','layout','photos','rent','copy','another']){
await p.evaluate(()=>{window.__perf={frames:[],tasks:[],scroll:[],start:performance.now()};const data=window.__perf;new PerformanceObserver(list=>{if(window.__perf===data)data.tasks.push(...list.getEntries().map(e=>({start:e.startTime-data.start,duration:e.duration})));}).observe({type:'longtask'});let previous=performance.now();const frame=now=>{if(window.__perf!==data)return;const h=document.querySelector('[data-testid^="screen-"] [role="heading"]');data.frames.push({at:now-data.start,gap:now-previous,y:scrollY,headingY:h?.getBoundingClientRect().y});previous=now;requestAnimationFrame(frame);};requestAnimationFrame(frame);});
await p.getByTestId('create-wizard-footer').getByRole('button').last().click();await expect(p.getByTestId('screen-'+screen)).toBeVisible();const firstHeading=await p.getByTestId('screen-'+screen).getByRole('heading').first().boundingBox();if(screen==='location'){await expect(p.getByText('Saving…',{exact:true})).toBeVisible();const duringSave=await placeButton.boundingBox();assert.equal(duringSave.x,beforeSave.x,'Saving does not shift progress');assert.equal(duringSave.width,beforeSave.width,'Saving does not resize progress');}await p.waitForTimeout(1000);
const settledHeading=await p.getByTestId('screen-'+screen).getByRole('heading').first().boundingBox();assert.ok(Math.abs(firstHeading.y-settledHeading.y)<=1,'Heading stays still throughout '+screen+' entrance');
metrics.push({width,screen,alignment,...await p.evaluate(()=>{const d=window.__perf;return {maxGap:Math.max(...d.frames.map(x=>x.gap)),slowFrames:d.frames.filter(x=>x.gap>34),tasks:d.tasks,windowScroll:scrollY,heading:document.querySelector('[data-testid^="screen-"] [role="heading"]').getBoundingClientRect().toJSON(),headingPositions:[...new Set(d.frames.map(f=>f.headingY).filter(y=>typeof y==='number'))]};})});
}
await p.unroute('**/api/listings/creation-drafts/*');assert.ok(saveSeen);assert.equal(await p.evaluate(()=>scrollY),0,'Document does not jump on focus');
await p.getByRole('button',{name:'Unit 1',exact:true}).click();await expect(p.getByTestId('screen-layout')).toBeVisible();await p.waitForTimeout(500);await p.screenshot({path:path.join(out,device+'-layout.png')});
await p.emulateMedia({reducedMotion:'reduce'});await expect(p.locator('[data-wizard-art-asset]')).toHaveAttribute('data-wizard-motion','still');await p.emulateMedia({reducedMotion:'no-preference'});await expect(p.locator('[data-wizard-art-asset]')).toHaveAttribute('data-wizard-motion','playing');
}
await writeFile(path.join(out,'measurements.json'),JSON.stringify({base,metrics,errors},null,2));console.log(JSON.stringify(metrics.map(({width,screen,maxGap,tasks,windowScroll})=>({width,screen,maxGap,tasks,windowScroll})),null,2));

}finally{await c.close();await b.close();if(owner&&ids.size)await sql`DELETE FROM creation_drafts WHERE owner_id=${owner} AND id=ANY(${[...ids]}::uuid[])`;await sql.end();await writeFile(path.join(out,'draft-cleanup.json'),JSON.stringify({removedDrafts:ids.size,restored:true},null,2));}

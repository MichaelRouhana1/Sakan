import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium,expect} from '@playwright/test';

const out=path.resolve(import.meta.dirname,'../../artifacts/home-header-rea/implementation');
const base=process.env.STUDENTLY_TEST_URL??'http://127.0.0.1:8093';
const api=process.env.SEARCH_TEST_API_BASE??'http://127.0.0.1:3006';
if(!['127.0.0.1','localhost'].includes(new URL(api).hostname))throw Error('Local API required');
await mkdir(out+'/screenshots',{recursive:true});await mkdir(out+'/recordings',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const report={cases:[],screenshots:[],recordings:[],mobile:[],errors:[],apiQueries:[]};
const quick=process.env.STUDENTLY_HEADER_QUICK==='1';
async function prepare(context){
 const page=await context.newPage();page.setDefaultTimeout(12000);
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.route('**/api/**',async route=>{
  const u=new URL(route.request().url());
  if(route.request().method()==='GET'){
   const response=await route.fetch({url:api+u.pathname+u.search});
   if(u.pathname==='/api/search/suggest')report.apiQueries.push({q:u.searchParams.get('q'),status:response.status()});
   return route.fulfill({response});
  }
  return route.fulfill({json:{data:[]}});
 });return page;
}
async function ready(page,surface){
 const inventory=surface==='search'?page.waitForResponse(r=>new URL(r.url()).pathname==='/api/listings'&&r.status()===200,{timeout:20000}).catch(()=>null):Promise.resolve();
 await page.goto(base+(surface==='home'?'/':'/search?maxRentUsd=700&wifiIncluded=true&sort=rent_asc'),{waitUntil:'domcontentloaded',timeout:180000});
 await expect(page.locator(surface==='home'?'.sds-hero':'.sdh .sds-launch')).toBeVisible({timeout:120000});
 await page.evaluate(()=>document.fonts.ready);
 if(surface==='home')await expect.poll(()=>page.locator('img[src*="photo-1522708323590"]').first().evaluate(image=>image.complete&&image.naturalWidth>0).catch(()=>false),{timeout:30000}).toBe(true);
 await inventory;if(surface==='search')await expect(page.getByText(/Student Accommodations/).first()).toBeVisible({timeout:20000});await page.waitForTimeout(350);
}
async function shot(page,label,state){const file=`${label}-${state}.png`;await page.screenshot({path:out+'/screenshots/'+file});report.screenshots.push({file,label,state,viewport:page.viewportSize()});}
async function settled(page){await expect(page.getByRole('listbox')).toHaveAttribute('aria-busy','false');}
async function record(page,label,action){
 const dir=out+'/recordings/'+label;await mkdir(dir,{recursive:true});
 const c=await page.context().newCDPSession(page);const frames=[],jobs=[];let last=0;
 c.on('Page.screencastFrame',e=>{c.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{});if(e.metadata.timestamp-last<.07)return;last=e.metadata.timestamp;const file=String(frames.length).padStart(4,'0')+'.jpg';frames.push({file,timestamp:e.metadata.timestamp});jobs.push(writeFile(dir+'/'+file,Buffer.from(e.data,'base64')));});
 await c.send('Page.startScreencast',{format:'jpeg',quality:72,maxWidth:1600,maxHeight:1112,everyNthFrame:1});
 try{await action();}finally{await c.send('Page.stopScreencast');await Promise.all(jobs);await writeFile(dir+'/index.json',JSON.stringify({label,viewport:page.viewportSize(),frames},null,2));await c.detach();}
 report.recordings.push({label,frames:frames.length,seconds:frames.length?(frames.at(-1).timestamp-frames[0].timestamp):0});
}
async function sampler(page,kind){
 await page.evaluate(kind=>{
  const generation=(window.__headerGeneration??0)+1;window.__headerGeneration=generation;window.__headerSamples=[];const start=performance.now();
  const tick=()=>{
   if(window.__headerGeneration!==generation)return;
   const header=document.querySelector('[data-desktop-header]');const bar=header?.querySelector('.sds-open-bar');const hero=document.querySelector('[data-testid="home-hero-search"]');const root=document.querySelector('#studently-home-scroll');const ring=document.querySelector('.sds-hero .sds-ring');
   window.__headerSamples.push({t:performance.now()-start,kind,header:header?.getBoundingClientRect().toJSON(),shown:header?.dataset.visible,opacity:header&&Number(getComputedStyle(header).opacity),bar:bar?.getBoundingClientRect().toJSON(),brand:header?.querySelector('a[href="/"]')?.getBoundingClientRect().toJSON(),right:header?.querySelector('#studently-header-controls')?.getBoundingClientRect().toJSON(),heroOffset:hero&&root?hero.getBoundingClientRect().top-root.getBoundingClientRect().top+root.scrollTop:null,focused:document.querySelector('.sds-hero')?.dataset.open==='true',ring:ring&&{opacity:Number(getComputedStyle(ring).opacity),clip:getComputedStyle(ring).clipPath,same:window.__heroRing===ring}});
   requestAnimationFrame(tick);
  };tick();
 },kind);
}
async function samples(page){return page.evaluate(()=>{window.__headerGeneration++;return window.__headerSamples;});}
function contained(frames,label){
 const opened=frames.filter(x=>x.bar);assert.ok(opened.length>5,label+' open-frame coverage '+opened.length+'/'+frames.length);
 for(const x of opened){assert.ok(x.bar.left>=x.brand.right-.5,label+' brand '+JSON.stringify(x));assert.ok(x.bar.right<=x.right.left+.5,label+' controls '+JSON.stringify(x));assert.ok(x.bar.top>=x.header.top-.5&&x.bar.bottom<=x.header.bottom+.5,label+' vertical '+JSON.stringify(x));}
 return opened.length;
}
async function inspectOpen(page){return page.locator('.sdh').evaluate(e=>({header:e.getBoundingClientRect().toJSON(),bar:e.querySelector('.sds-open-bar').getBoundingClientRect().toJSON(),brand:e.querySelector('a[href="/"]').getBoundingClientRect().toJSON(),controls:e.querySelector('#studently-header-controls').getBoundingClientRect().toJSON(),links:[...e.querySelectorAll('#studently-header-controls [role=button],#studently-header-controls a')].map(n=>({text:n.getAttribute('aria-label')||n.textContent,visibility:getComputedStyle(n).visibility,display:getComputedStyle(n).display,opacity:getComputedStyle(n).opacity})),animation:getComputedStyle(e.querySelector('.sds-open-bar')).animationDuration,transition:getComputedStyle(e).transition}));}
async function runCase(width,scale,zoom=1){
 const label=`${width}-scale-${scale.toFixed(1)}`+(zoom===1?'':'-zoom90');
 const context=await browser.newContext({viewport:{width:Math.round(width/zoom),height:Math.round(1000/zoom)},deviceScaleFactor:zoom,reducedMotion:'no-preference'});
 await context.addInitScript(value=>localStorage.setItem('studently.homepageScale',value),String(scale));
 const page=await prepare(context);const result={label,width,scale,zoom};
 try{
  await ready(page,'home');await page.mouse.move(8,900/zoom);await shot(page,label,'home-top');
  await expect(page.locator('.sdh')).toHaveAttribute('data-visible','false');
  const before=await page.locator('.sds-hero .sds-ring').evaluate(e=>{window.__heroRing=e;return getComputedStyle(e).opacity;});assert.equal(before,'0');
  await record(page,label+'-hero-hover-click',async()=>{
   await page.locator('.sds-hero').hover();await page.waitForTimeout(500);await shot(page,label,'hero-hover');
   const timing=await page.locator('.sds-ring').last().evaluate(e=>getComputedStyle(e).animationDuration);assert.equal(timing,'2.8s');
   await sampler(page,'hero-handoff');await page.locator('.sds-hero input').click();await page.waitForTimeout(450);await settled(page);await page.mouse.move(8,900/zoom);await page.waitForTimeout(100);
   await expect.poll(()=>page.evaluate(()=>window.__headerSamples.filter(x=>x.focused).length),{timeout:5000}).toBeGreaterThan(5);const trace=await samples(page);const focused=trace.filter(x=>x.focused);assert.ok(focused.length>5);assert.ok(focused.every(x=>x.ring.same&&x.ring.opacity===1),'persistent ring without blank focused frame');
   result.ringFrames=focused.length;await writeFile(out+'/'+label+'-hero-handoff.json',JSON.stringify(trace,null,2));await shot(page,label,'hero-focus');
  });
  const heroInput=page.locator('.sds-hero input');await heroInput.fill('Hamra');await expect(page.locator('.sds-row')).not.toHaveCount(0);await heroInput.press('Escape');await expect(heroInput).toBeFocused();
  const boundary=await page.locator('#studently-home-scroll').evaluate(root=>document.querySelector('[data-testid="home-hero-search"]').getBoundingClientRect().bottom-root.getBoundingClientRect().top+root.scrollTop);
  result.boundary=boundary;
  const scroll=async y=>{await page.locator('#studently-home-scroll').evaluate((e,y)=>{e.scrollTop=y;},y);};
  await scroll(Math.ceil(boundary)-1);await page.waitForTimeout(450);await expect(page.locator('.sdh')).toHaveAttribute('data-visible','false');
  await record(page,label+'-scroll-down-up',async()=>{
   await sampler(page,'scroll-down');await scroll(Math.ceil(boundary)+1);await page.waitForTimeout(450);const down=await samples(page);
   assert.equal(down.at(-1).shown,'true');for(let i=1;i<down.length;i++)assert.ok(down[i].opacity>=down[i-1].opacity-.03,'monotone header entry');
   const offset=down[0].heroOffset;assert.ok(down.every(x=>Math.abs(x.heroOffset-offset)<.5),'no content jump on entry');
   await page.waitForTimeout(100);await sampler(page,'scroll-up');await scroll(Math.ceil(boundary)-1);await page.waitForTimeout(450);const up=await samples(page);
   assert.equal(up.at(-1).shown,'false');for(let i=1;i<up.length;i++)assert.ok(up[i].opacity<=up[i-1].opacity+.03,'monotone header exit');assert.ok(up.every(x=>Math.abs(x.heroOffset-offset)<.5),'no content jump on exit');
   result.scrollFrames=down.length+up.length;await writeFile(out+'/'+label+'-scroll.json',JSON.stringify({down,up},null,2));
   await scroll(boundary+100);await page.waitForTimeout(100);await scroll(boundary-10);await page.waitForTimeout(450);await scroll(boundary+100);await page.waitForTimeout(450);
  });
  await expect(page.locator('[data-desktop-search][data-variant=pill]')).toHaveAttribute('inert','');
  await shot(page,label,'compact-after-scroll');await expect(page.locator('.sdh .sds-launch-label')).toHaveAttribute('data-empty','true');
  await sampler(page,'home-header-open');await page.locator('.sdh .sds-launch').click();await page.waitForTimeout(430);await expect.poll(()=>page.evaluate(()=>window.__headerSamples.filter(x=>x.bar).length)).toBeGreaterThan(5);result.homeOpenFrames=contained(await samples(page),label+' home');
  const input=page.locator('.sdh input');await expect(input).toHaveValue('Hamra');await input.fill('');await settled(page);await expect(page.getByRole('group',{name:'Top areas',exact:true})).toBeVisible();await shot(page,label,'header-open-home');
  result.home=await inspectOpen(page);assert.equal(result.home.animation,'0.3s');assert.ok(result.home.links.every(x=>x.visibility==='visible'&&x.display!=='none'&&x.opacity==='1'));
  const panel=await page.locator('.sds-panel').boundingBox();const inner=await page.locator('.sdh .sds-bar-inner').boundingBox();assert.ok(Math.abs(panel.x-inner.x)<1);assert.ok(Math.abs(panel.y-inner.y-inner.height-8*scale)<1,'dropdown inner-input gap');
  await input.fill('\u0627\u0644\u062d\u0645\u0631\u0627');await expect(page.locator('.sds-row')).not.toHaveCount(0);await input.press('ArrowDown');await expect(input).toHaveAttribute('aria-activedescendant',/./);await input.press('Escape');await expect(page.locator('.sdh .sds-launch')).toBeFocused();
  await page.locator('.sdh .sds-launch').click();await page.waitForTimeout(350);await page.mouse.click(4,600);await expect(page.getByTestId('desktop-search-panel')).toHaveCount(0);
  await ready(page,'search');await sampler(page,'results-header-open');await page.locator('.sdh .sds-launch').click();await page.waitForTimeout(430);await expect.poll(()=>page.evaluate(()=>window.__headerSamples.filter(x=>x.bar).length)).toBeGreaterThan(5);result.resultsOpenFrames=contained(await samples(page),label+' results');await settled(page);await shot(page,label,'header-open-search');result.results=await inspectOpen(page);assert.ok(Math.abs(result.results.header.height-73*scale)<.5);assert.ok(Math.abs(result.home.header.height-result.results.header.height)<.5);
  await page.locator('.sdh input').press('Escape');await expect(page.locator('.sdh .sds-launch')).toBeFocused();
  // Resize an already open editor: no stale overlay width and no hidden controls.
  await page.locator('.sdh .sds-launch').click();for(const narrow of [1024,900]){await page.setViewportSize({width:narrow,height:1000});await page.waitForTimeout(150);await sampler(page,'resize');await expect.poll(()=>page.evaluate(()=>window.__headerSamples.filter(x=>x.bar).length)).toBeGreaterThan(5);contained(await samples(page),label+' resize '+narrow);}
  await page.setViewportSize({width:Math.round(width/zoom),height:Math.round(1000/zoom)});await page.waitForTimeout(250);
  // Reduced motion changes while mounted, including the JS typewriter.
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.sdh input').press('Escape');await page.locator('.sdh .sds-launch').click();await expect(page.locator('.sdh .sds-open-bar')).toHaveCSS('animation-name','none');await expect(page.locator('.sds-panel')).toHaveCSS('animation-name','none');await expect(page.locator('.sdh')).toHaveCSS('transition-duration','0s');
  await page.locator('.sdh input').press('Escape');const word=page.locator('.sdh [data-testid="search-placeholder-word"]');await expect(word).toHaveText('City, university or property');await page.waitForTimeout(250);await expect(word).toHaveText('City, university or property');
  result.reducedMotion=true;
  const alternate=scale===1.1?1:1.1;
  await page.getByRole('button',{name:alternate===1?'Scale 1.0':'Scale 1.1',exact:true}).click();
  await expect.poll(()=>page.locator('.sdh').evaluate(e=>e.getBoundingClientRect().height)).toBeCloseTo(73*alternate,0);
  await page.locator('.sdh .sds-launch').click();await expect(page.locator('.sdh input')).toBeVisible();await sampler(page,'scale-toggle');await expect.poll(()=>page.evaluate(()=>window.__headerSamples.filter(x=>x.bar).length)).toBeGreaterThan(5);contained(await samples(page),label+' scale toggle');
  result.scaleToggle=true;report.cases.push(result);console.log('PASS '+label);
 }finally{await context.close();}
}
try{
 for(const width of (quick?[1440]:[1440,1280]))for(const scale of (quick?[1.1]:[1.1,1]))await runCase(width,scale);
 if(!quick){
  for(const width of [1440,1280])await runCase(width,1.1,.9);
  for(const width of [899,390,430]){
   const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'});const page=await prepare(context);
   for(const surface of ['home','search']){await page.goto(base+(surface==='home'?'/':'/search'),{waitUntil:'domcontentloaded',timeout:180000});await expect(page.getByTestId(surface==='home'?'home-page-header':'search-page-header')).toBeVisible({timeout:60000});assert.equal(await page.locator('[data-desktop-header]').count(),0);assert.equal(await page.locator('[data-desktop-search]').count(),0);assert.equal(await page.getByTestId('desktop-scale-toggle').count(),0);await page.screenshot({path:out+'/screenshots/'+width+'-'+surface+'-mobile-guard.png'});}
   report.mobile.push({width,desktopChromeAbsent:true});await context.close();
  }
 }
 assert.deepEqual(report.errors.filter(x=>!/Minified React error #418|Hydration failed/.test(x)),[]);
}finally{await writeFile(out+'/checks.json',JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify({cases:report.cases.length,screenshots:report.screenshots.length,recordings:report.recordings.length,mobile:report.mobile,errors:report.errors}));

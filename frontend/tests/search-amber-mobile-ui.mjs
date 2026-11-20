// Live public app/API, no suggestion or inventory mocks.
import assert from 'node:assert/strict';import{chromium,expect}from'@playwright/test';import{mkdir,writeFile}from'node:fs/promises';import path from'node:path';
const out=path.resolve(import.meta.dirname,'../../artifacts/search-v2/mobile-polish');await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});const report={screenshots:[],checks:[],errors:[],defaults:null};
try{
 for(const width of [390,430])for(const surface of ['home','search']){
 const context=await browser.newContext({viewport:{width,height:width===390?844:932},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});const p=await context.newPage();p.setDefaultNavigationTimeout(120000);p.on('pageerror',e=>report.errors.push(e.message));
 p.on('response',async r=>{if(r.url().includes('/api/search/suggest?q=')&&new URL(r.url()).searchParams.get('q')==='')report.defaults=(await r.json()).data;});
 await p.goto('http://127.0.0.1:8091/'+(surface==='home'?'':'search?maxRentUsd=700&wifiIncluded=true'),{waitUntil:'domcontentloaded',timeout:120000});await p.evaluate(()=>document.fonts.ready);
 const trigger=p.getByRole('button',{name:'Open search',exact:true}).first();await expect(trigger).toBeVisible({timeout:90000});await trigger.click();
 const dialog=p.getByRole('dialog',{name:'Search Lebanon',exact:true}),input=p.getByRole('combobox',{name:'Search',exact:true});
 await expect(p.getByRole('group',{name:'Top areas',exact:true})).toBeVisible({timeout:20000});await expect(p.getByRole('group',{name:'Top universities',exact:true})).toBeVisible();
 await expect(input).toHaveValue('');await expect(input).not.toBeFocused();await expect(input).toHaveAttribute('placeholder','Search city, area, university or property');
 await expect(dialog.getByText('Explore Lebanon',{exact:true})).toHaveCount(0);
 const border=()=>input.evaluate(n=>getComputedStyle(n.parentElement).borderColor);assert.equal(await border(),'rgba(0, 0, 0, 0)');
 const areas=p.getByRole('group',{name:'Top areas',exact:true});assert.ok(report.defaults.sections.topAreas.length>=6&&report.defaults.sections.topAreas.length<=10);assert.ok(report.defaults.sections.topCampuses.length>=6&&report.defaults.sections.topCampuses.length<=10);
 for(const item of report.defaults.sections.topAreas){const row=areas.getByRole('option',{name:new RegExp('^'+item.label.en+',')});await expect(row).toContainText(item.eligibleUnitCount===0?'No places yet':`${item.eligibleUnitCount} place`);}
 const campuses=p.getByRole('group',{name:'Top universities',exact:true});
 for(const item of report.defaults.sections.topCampuses){await expect(campuses.getByRole('option',{name:new RegExp('^'+item.label.en.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+',')})).toContainText(item.eligibleUnitCount===0?'No places yet':`${item.eligibleUnitCount} place`);}
 const positions=await areas.getByRole('option').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();const thumb=n.firstElementChild.firstElementChild.getBoundingClientRect();return{x:r.x,y:r.y,thumbWidth:thumb.width,thumbHeight:thumb.height}}));
 assert.ok(positions.every(x=>x.thumbWidth===56&&x.thumbHeight===56));assert.ok(positions[1].y>positions[0].y);const gridGeometry=await areas.getByRole('option').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,right:r.right,height:r.height,scrollWidth:n.scrollWidth,clientWidth:n.clientWidth}}));assert.ok(gridGeometry[2].right<=width);assert.ok(gridGeometry[4].x<width);assert.ok(gridGeometry.every(n=>n.scrollWidth<=n.clientWidth+1));assert.ok(gridGeometry.every(n=>n.height===64));const titles=await areas.getByRole('option').allTextContents();assert.ok(titles.every(text=>!/[\u0600-\u06ff]/.test(text)));report.checks.push({width,surface,gridGeometry});if(positions.length>2)assert.ok(Math.abs(positions[2].y-positions[0].y)<1);
 async function shot(state){const file=`${width}-${surface}-${state}.png`;await p.screenshot({path:path.join(out,file),animations:'disabled'});report.screenshots.push(file);}
 await p.waitForTimeout(1000);await shot('defaults');await input.click();assert.equal(await border(),'rgb(234, 63, 74)');await shot('focused');await input.blur();assert.equal(await border(),'rgba(0, 0, 0, 0)');
 const grid=p.locator('[data-search-grid="area"]');await grid.evaluate(n=>{n.scrollLeft=n.scrollWidth;});await expect.poll(()=>grid.evaluate(n=>n.scrollLeft)).toBeGreaterThan(0);await shot('scrolled');await grid.evaluate(n=>{n.scrollLeft=0;});
 await areas.getByRole('option',{name:/^Hamra,/}).click();await expect(dialog).toHaveCount(0);
 await expect.poll(()=>p.evaluate(()=>JSON.parse(localStorage.getItem('studently.search.recents.v1')??'{"items":[]}').items.length)).toBe(1);
 await p.getByRole('button',{name:'Open search',exact:true}).first().click();await expect(input).toHaveValue('');
 const recent=p.getByRole('group',{name:'Recently searched',exact:true});await expect(recent).toBeVisible();await expect(recent.getByRole('option',{name:/^Hamra,/})).toBeVisible();
 const recentRow=await recent.getByRole('option').boundingBox();assert.ok(recentRow.width>=width-40);await shot('recents');
 await p.reload({waitUntil:'domcontentloaded'});await p.getByRole('button',{name:'Open search',exact:true}).first().click();await expect(recent).toBeVisible();await expect(input).toHaveValue('');
 await input.fill('\u0627\u0644\u062f\u0643\u0648\u0627\u0646\u0629');await expect(p.getByRole('option',{name:'Dekwaneh, Matn, City',exact:true})).toBeVisible({timeout:20000});await shot('arabic');
 await input.fill('qwertyuiozx');await expect(p.getByText('No places found.',{exact:true})).toBeVisible();await shot('no-results');await input.fill('');await expect(recent).toBeVisible();
 await p.getByRole('button',{name:'Back from search',exact:true}).click();await expect(dialog).toHaveCount(0);
 if(surface==='search'&&width===430){
  await p.setViewportSize({width:1440,height:1000});await expect(p.locator('[data-desktop-search]')).toBeVisible();await p.locator('[data-desktop-search]').getByRole('button',{name:/search/i}).click();await p.getByRole('combobox',{name:'Search',exact:true}).fill('');
  const desktopRecent=p.getByRole('group',{name:'Recently searched',exact:true});await expect(desktopRecent.locator('.sds-recent-row')).toBeVisible();await p.screenshot({path:path.join(out,'1440-desktop-recents.png'),animations:'disabled'});report.screenshots.push('1440-desktop-recents.png');
 }
 report.checks.push({surface,thumbnail56:true,twoRows:true,liveCounts:true,horizontalScroll:true,neutralRestFocusedRed:true,reopenShowsRecents:true,restartShowsRecents:true});await context.close();console.log('PASS '+surface);
 }
 assert.deepEqual(report.errors,[]);
}finally{await writeFile(path.join(out,'checks.json'),JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify({screenshots:report.screenshots.length,errors:report.errors}));

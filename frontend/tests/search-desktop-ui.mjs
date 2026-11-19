// Real app surfaces + the unchanged step-2 suggest API, with controlled empty inventory.
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium,expect } from '@playwright/test';
const frontend=path.resolve(import.meta.dirname,'..');
const output=path.resolve(frontend,'../artifacts/search-v2/step-3');await mkdir(output,{recursive:true});
const base=process.env.STUDENTLY_TEST_URL??'http://127.0.0.1:8091';
const api=process.env.SEARCH_TEST_API_BASE??'http://127.0.0.1:3006';
if(!['localhost','127.0.0.1'].includes(new URL(api).hostname))throw new Error('Loopback API required');
const browser=await chromium.launch({channel:'msedge',headless:true});
const report={screenshots:[],checks:[],errors:[],apiQueries:[]};
let sequence=0;
async function prepare(context){
  await context.addInitScript(()=>localStorage.setItem('studently.homepageScale','1.1'));
  const page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.route('**/api/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/api/search/suggest'){
      const response=await route.fetch({url:api+url.pathname+url.search});
      const payload=await response.json();
      report.apiQueries.push({q:url.searchParams.get('q'),types:payload.data?.results.map(item=>item.type),status:response.status()});
      return route.fulfill({response});
    }
    if(url.pathname==='/api/listings')return route.fulfill({json:{data:[],featured:[],campuses:[],matches:{},pagination:{page:1,pageSize:24,total:0,totalMatching:0,hasNext:false}}});
    return route.fulfill({json:{data:[]}});
  });
  return page;
}
async function ready(page,surface){
  await page.goto(base+(surface==='home'?'/':'/search?maxRentUsd=700&wifiIncluded=true&sort=rent_asc'),{timeout:180000,waitUntil:'domcontentloaded'});
  await expect(page.locator('[data-desktop-search]')).toBeVisible({timeout:120000});
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(1400);
  if(surface==='search')await expect(page.getByText('No listings match',{exact:true})).toBeVisible({timeout:15000});
}
async function open(page,surface){
  if(!await page.getByTestId('desktop-search-panel').count()){
    const launcher=page.locator('[data-desktop-search]');
    if(surface==='home')await launcher.getByRole('combobox').click();
    else await launcher.getByRole('button',{name:/search/i}).click();
  }
  await expect(page.getByRole('combobox',{name:'Search',exact:true})).toHaveAttribute('aria-expanded','true');
  return page.getByRole('combobox',{name:'Search',exact:true});
}
async function settled(page){await expect(page.getByRole('listbox')).toHaveAttribute('aria-busy','false',{timeout:15000});}
async function shot(page,width,surface,state){
  const filename=`${width}-${surface}-${state}.png`;
  const buffer=await page.screenshot({path:path.join(output,filename),animations:'disabled'});
  assert.ok(Math.abs(buffer.readUInt32BE(16)-width)<=1);
  report.screenshots.push({file:filename,physicalWidth:buffer.readUInt32BE(16),surface,state,viewport:page.viewportSize(),scale:1.1,zoom:.9});
}
try{
  for(const width of [1440,1280])for(const surface of ['home','search']){
    const context=await browser.newContext({viewport:{width:Math.round(width/.9),height:Math.round(1000/.9)},deviceScaleFactor:.9,reducedMotion:'no-preference'});
    const page=await prepare(context);await ready(page,surface);
    await shot(page,width,surface,'rest');
    let input=await open(page,surface);await settled(page);
    await expect(page.getByRole('group',{name:'Top areas',exact:true})).toBeVisible();
    await expect(page.getByRole('group',{name:'Top universities & campuses',exact:true})).toBeVisible();
    if(surface==='search'){
      const brand=await page.locator('a[href="/"]').first().boundingBox();
      const popup=await page.locator('.sds-surface').boundingBox();
      assert.ok(popup.x>=brand.x+brand.width,'Expanded search must not cover the brand');
    }
    await shot(page,width,surface,'defaults');
    const sizes=await page.locator('.sds-open-bar').evaluate(node=>({height:node.getBoundingClientRect().height,font:getComputedStyle(node.querySelector('input')).fontFamily,focusAnimation:getComputedStyle(node).animationDuration,panelAnimation:getComputedStyle(document.querySelector('.sds-panel')).animationDuration,red:getComputedStyle(node.closest('.sds')).getPropertyValue('--red')}));
    assert.ok(Math.abs(sizes.height-77)<1);
    if(surface==='home')assert.ok((await page.locator('.sds-surface').boundingBox()).width>700);assert.match(sizes.font,/DMSans/);assert.equal(sizes.red.trim(),'#ea3f4a');
    assert.equal(sizes.focusAnimation,surface==='home'?'0.36s':'0.3s');assert.equal(sizes.panelAnimation,'0.26s');
    await input.fill('De');await page.waitForTimeout(70);await expect(page.locator('.sds-loading')).toBeVisible();await shot(page,width,surface,'typing');
    for(const [term,type]of [['Fanar','City'],['Hamra','Area'],['AUB','Campus'],['Bliss','Property']]){
      await input.fill(term);await settled(page);await expect(page.locator('.sds-row .sds-type').getByText(type,{exact:true})).toBeVisible();
      if(type==='City')await expect(page.getByRole('option',{name:/^Fanar, Matn/})).toBeVisible();
      await shot(page,width,surface,'results-'+type.toLowerCase());
    }
    await input.fill('qwertyuiozx');await settled(page);await expect(page.getByText('No places found.',{exact:true})).toBeVisible();await shot(page,width,surface,'no-results');
    await input.fill('الدكوانة');await settled(page);await expect(page.getByRole('option',{name:/^Dekwaneh, Matn/})).toBeVisible();
    assert.match(await page.locator('.sds-title').first().textContent(),/[\u0600-\u06ff]/);
    await shot(page,width,surface,'arabic-query');
    await input.fill('Fanar');await settled(page);await input.press('ArrowDown');
    await expect(page.locator('[role=option][aria-selected=true]')).toHaveCount(1);
    const active=await input.getAttribute('aria-activedescendant');assert.ok(active);assert.equal(await page.locator('#'+active).getAttribute('aria-selected'),'true');
    await shot(page,width,surface,'keyboard-selection');
    await input.press('ArrowUp');assert.equal(await input.getAttribute('aria-activedescendant'),active);
    await input.press('Escape');await expect(page.getByTestId('desktop-search-panel')).toHaveCount(0);
    input=await open(page,surface);await settled(page);await input.press('ArrowDown');await input.press('Enter');
    await expect.poll(()=>new URL(page.url()).searchParams.get('city')).toBe('fanar');
    if(surface==='search'){
      const params=new URL(page.url()).searchParams;assert.equal(params.get('maxRentUsd'),'700');assert.equal(params.get('wifiIncluded'),'true');assert.equal(params.get('sort'),'rent_asc');
    }
    await open(page,'search');await page.mouse.click(20,500);await expect(page.getByTestId('desktop-search-panel')).toHaveCount(0);
    report.checks.push({width,surface,...sizes,defaults:true,allTypes:true,arabicMatn:true,keyboard:true,escape:true,outside:true,selectionUrl:true});
    await context.close();sequence++;
  }
  // Changing the OS preference must stop the JS typewriter and all search CSS motion.
  const reducedContext=await browser.newContext({viewport:{width:1600,height:1111},deviceScaleFactor:.9,reducedMotion:'reduce'});
  const reducedPage=await prepare(reducedContext);await ready(reducedPage,'home');
  const word=reducedPage.getByTestId('search-placeholder-word');await expect(word).toHaveText('City, university or property');
  await reducedPage.waitForTimeout(2300);await expect(word).toHaveText('City, university or property');
  await shot(reducedPage,1440,'home','reduced-motion-rest');
  await open(reducedPage,'home');await settled(reducedPage);await expect(reducedPage.locator('.sds-open-bar')).toHaveCSS('animation-name','none');await expect(reducedPage.locator('.sds-panel')).toHaveCSS('animation-name','none');
  await shot(reducedPage,1440,'home','reduced-motion-open');report.checks.push({reducedMotion:true,wordStableMs:2300,searchAnimations:'none'});await reducedContext.close();
  // The desktop surface also fits an unzoomed 1280 CSS-pixel viewport.
  const narrowContext=await browser.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce'});const narrow=await prepare(narrowContext);await ready(narrow,'search');await open(narrow,'search');await settled(narrow);
  const box=await narrow.locator('.sds-surface').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=1280);await narrow.screenshot({path:path.join(output,'1280-css-search-fit.png')});report.checks.push({unzoomed1280Fits:true});await narrowContext.close();
  const mobileContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const mobile=await prepare(mobileContext);await mobile.goto(base+'/');await expect(mobile.getByRole('textbox',{name:'Search',exact:true})).toBeVisible({timeout:30000});assert.equal(await mobile.locator('[data-desktop-search]').count(),0);report.checks.push({mobile390:'legacy renderer; no desktop surface'});await mobileContext.close();
  const unexpected=report.errors.filter(message=>!/Minified React error #418|Hydration failed/.test(message));assert.deepEqual(unexpected,[]);
  console.log(JSON.stringify({checks:report.checks,screenshots:report.screenshots.length,hydrationWarnings:report.errors.length},null,2));
}finally{
  await writeFile(path.join(output,'checks.json'),JSON.stringify(report,null,2));await browser.close();
}

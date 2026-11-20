// Live app and public API; no suggestion, listing, auth or history mocks.
import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const output=path.resolve(import.meta.dirname,'../../artifacts/search-v2/amber-mobile-defaults/regression');await mkdir(output,{recursive:true});
const base=process.env.STUDENTLY_TEST_URL??'http://127.0.0.1:8091';
const api=process.env.SEARCH_TEST_API_BASE??'http://127.0.0.1:3006';
const browser=await chromium.launch({channel:'msedge',headless:true});
const report={screenshots:[],checks:[],errors:[],native:{ios:'No iOS simulator on Windows',android:'Android SDK/emulator not installed'}};
const storedKey='studently.search.recents.v1';
try {
 for(const width of [390,430])for(const surface of ['home','search']){
  const context=await browser.newContext({viewport:{width,height:width===390?844:932},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const page=await context.newPage();page.setDefaultNavigationTimeout(120000);page.on('pageerror',e=>report.errors.push({width,surface,message:e.message}));
  const url=base+(surface==='home'?'/':'/search?maxRentUsd=700&wifiIncluded=true&sort=rent_asc');
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
  const trigger=page.getByRole('button',{name:'Open search',exact:true}).first();
  await expect(trigger).toBeVisible({timeout:90000});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1500);
  async function shot(state){const name=`${width}-${surface}-${state}.png`;await page.screenshot({path:path.join(output,name),animations:'disabled'});report.screenshots.push({file:name,width,surface,state});}
  await shot('closed');
  const before={url:page.url(),overflow:await page.evaluate(()=>document.body.style.overflow)};
  await trigger.click();
  const sheet=page.locator('[data-mobile-search-sheet]');await expect(sheet).toBeVisible();
  await expect(page.getByRole('dialog',{name:'Search Lebanon'})).toHaveCount(1);
  const input=page.getByRole('combobox',{name:'Search',exact:true});
  await expect(page.getByRole('group',{name:'Top areas',exact:true})).toBeVisible({timeout:20000});
  await expect(page.getByRole('group',{name:'Top universities',exact:true})).toBeVisible();
  const chips=await page.getByRole('option').evaluateAll(nodes=>nodes.map(n=>({type:n.dataset.searchType,text:n.textContent,inside:n.getBoundingClientRect().left>=-1&&n.getBoundingClientRect().right<=window.innerWidth+1,unclipped:n.scrollWidth<=n.clientWidth+1})));
  assert.ok(chips.every(x=>x.unclipped));assert.ok(chips.filter(x=>x.type==='campus').every(x=>!/[\u0600-\u06ff]/.test(x.text)&&!(/\bcampus\b/i.test(x.text))));
  await shot('open-defaults');
  const box=await sheet.boundingBox();assert.ok(Math.abs(box.width-width)<1);assert.ok(box.height>=840);
  await input.fill('Ha');await shot('typing');
  for(const [term,type]of [['Fanar','City'],['Hamra','Area'],['AUB','Campus'],['Bliss','Property']]){
   await input.fill(term);await expect(page.getByRole('option',{name:new RegExp(', '+type+'$')}).first()).toBeVisible({timeout:20000});assert.ok(!/\\u[0-9a-f]{4}/i.test(await sheet.innerText()));await shot('results-'+type.toLowerCase());
  }
  await input.fill('\u0627\u0644\u062f\u0643\u0648\u0627\u0646\u0629');
  await expect(page.getByRole('option',{name:'Dekwaneh, Matn, City',exact:true})).toBeVisible({timeout:20000});
  await expect(page.getByText('UOB \u2014 Dekwaneh Campus',{exact:true})).toBeVisible();await shot('arabic-query');
  await input.fill('qwertyuiozx');await expect(page.getByText('No places found.',{exact:true})).toBeVisible({timeout:20000});await shot('no-results');
  await input.fill('Hamra');const area=page.getByRole('option',{name:/^Hamra, .*Area$/});await expect(area).toBeVisible();await area.click();
  await expect(sheet).toHaveCount(0);await expect(page.getByRole('button',{name:'Open search',exact:true}).first()).toBeVisible({timeout:20000});
  await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'{"items":[]}').items.length,storedKey)).toBe(1);
  const selectedUrl=new URL(page.url());assert.equal(selectedUrl.searchParams.get('areas'),'Hamra');
  if(surface==='search'){assert.equal(selectedUrl.searchParams.get('maxRentUsd'),'700');assert.equal(selectedUrl.searchParams.get('wifiIncluded'),'true');}
  await page.getByRole('button',{name:'Open search',exact:true}).first().click();await page.getByRole('combobox',{name:'Search',exact:true}).fill('');
  await expect(page.getByRole('group',{name:'Recently searched',exact:true})).toBeVisible();await shot('recents');
  await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Open search',exact:true}).first().click();await page.getByRole('combobox',{name:'Search',exact:true}).fill('');
  await expect(page.getByRole('group',{name:'Recently searched',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Clear recent searches',exact:true}).click();await expect(page.getByRole('group',{name:'Recently searched',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Back from search',exact:true}).click();await expect(page.locator('[data-mobile-search-sheet]')).toHaveCount(0);
  const location=page.url();await page.getByRole('button',{name:'Open search',exact:true}).first().click();await expect(page.locator('[data-mobile-search-sheet]')).toBeVisible();
  await page.goBack();await expect(page.locator('[data-mobile-search-sheet]')).toHaveCount(0);assert.equal(page.url(),location);
  const overflow=await page.evaluate(()=>document.body.style.overflow);assert.equal(overflow,before.overflow);
  report.checks.push({width,surface,fullScreen:true,uniqueDialog:true,liveTypes:['city','area','campus','place'],arabicAndMatn:true,guestPersistsAfterReload:true,clearAll:true,browserBack:true,scrollRestored:true,otherFiltersPreserved:surface==='search'});
  await context.close();console.log(`PASS ${width} ${surface}`);
 }
 assert.deepEqual(report.errors,[]);
} finally {await writeFile(path.join(output,'checks.json'),JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify({screenshots:report.screenshots.length,checks:report.checks.length,errors:report.errors},null,2));

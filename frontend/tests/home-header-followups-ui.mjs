import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium,expect} from '@playwright/test';
const out=path.resolve(import.meta.dirname,'../../artifacts/home-header-rea/implementation');
const base=process.env.STUDENTLY_TEST_URL??'http://127.0.0.1:8093';
const api=process.env.SEARCH_TEST_API_BASE??'http://127.0.0.1:3006';
await mkdir(out+'/screenshots',{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true});
const report={images:[],screenshots:[],checks:[],errors:[]};
async function open(options={}){
 const context=await browser.newContext({viewport:{width:1440,height:1200},reducedMotion:'reduce'});await context.addInitScript(()=>localStorage.setItem('studently.homepageScale','1.1'));
 const page=await context.newPage();const forbidden=[];const brokenRequests=[];page.on('request',r=>{if(r.url().includes('never-load.invalid'))forbidden.push(r.url());});page.on('pageerror',e=>report.errors.push(e.message));
 await page.route('**/api/**',async route=>{const u=new URL(route.request().url());const response=await route.fetch({url:api+u.pathname+u.search});
  if(options.listingTrap&&u.pathname==='/api/search/suggest'&&!u.searchParams.get('q')){const data=await response.json();for(const x of data.data.sections.topAreas){if(x.label.en==='Hamra'){x.thumbnailSource='listing';x.thumbnailUrl='https://never-load.invalid/listing-cover.jpg';}}return route.fulfill({json:data});}
  return route.fulfill({response});});
 if(options.broken)await page.route('**/assets/search/areas/hamra.jpg',route=>{brokenRequests.push(route.request().url());return route.fulfill({status:404});});
 await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:120000});await expect(page.locator('.sds-hero')).toBeVisible({timeout:90000});await page.evaluate(()=>document.fonts.ready);return{page,context,forbidden,brokenRequests};
}
try{
 const {page,context}=await open();
 const cards=page.locator('[data-testid^=home-area-card-]');await expect(cards.first()).toBeVisible();
 await expect.poll(()=>cards.first().locator('img').count()).toBeGreaterThan(0);
 await expect.poll(()=>cards.evaluateAll(nodes=>nodes.every(e=>{const image=e.querySelector('img');return !image||(image.complete&&image.naturalWidth>0);}))).toBe(true);
 report.images=await cards.evaluateAll(nodes=>nodes.map(e=>({name:e.getAttribute('aria-label'),images:[...e.querySelectorAll('img')].map(x=>x.src),fallback:!!e.querySelector('[data-testid="home-area-image-fallback"]')})));
 assert.ok(report.images.length>0);for(const card of report.images){assert.ok(card.fallback||card.images.every(url=>url.includes('/assets/search/areas/')));}
 await page.locator('#studently-home-scroll').evaluate(root=>{const title=[...root.querySelectorAll('div')].find(e=>e.childElementCount===0&&e.textContent==='Popular across Lebanon');root.scrollTop+=title.getBoundingClientRect().top-root.getBoundingClientRect().top-110;});
 await page.screenshot({path:out+'/screenshots/1440-scale-1.1-home-curated-cards.png'});report.screenshots.push('1440-scale-1.1-home-curated-cards.png');
 await page.locator('#studently-home-scroll').evaluate(e=>e.scrollTop=0);const hero=page.locator('.sds-hero input');await hero.click();await hero.fill('Hamra');await hero.press('Escape');
 await page.locator('#studently-home-scroll').evaluate(e=>e.scrollTop=600);await expect(page.locator('.sdh')).toHaveAttribute('data-visible','true');await expect(page.locator('.sdh .sds-launch-label')).toHaveAttribute('data-empty','true');
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:out+'/screenshots/1440-scale-1.1-compact-placeholder.png'});report.screenshots.push('1440-scale-1.1-compact-placeholder.png');
 await page.locator('.sdh .sds-launch').click();await expect(page.locator('.sdh input')).toHaveValue('Hamra');
 await page.goto(base+'/search?areas=Hamra',{waitUntil:'domcontentloaded'});await expect(page.locator('.sdh .sds-launch-label')).toHaveText('Hamra',{timeout:60000});await page.locator('.sdh .sds-launch').click();await page.locator('.sdh input').fill('Beirut');await page.locator('.sdh input').press('Escape');await expect(page.locator('.sdh .sds-launch-label')).toHaveText('Hamra');
 await page.goto(base+'/search?q=Hamra',{waitUntil:'domcontentloaded'});await expect(page.locator('.sdh .sds-launch-label')).toHaveAttribute('data-empty','true',{timeout:60000});
 report.checks.push('curated-only cards','draft hidden in closed home launcher','draft retained when reopened','active area retained while editing','unselected free text uses placeholder');await context.close();
 const trap=await open({listingTrap:true});const requests=[];trap.page.on('request',r=>{if(r.url().includes('never-load.invalid'))requests.push(r.url());});await expect(trap.page.locator('[data-testid="home-area-card-Hamra"] [data-testid="home-area-image-fallback"]')).toBeVisible();await trap.page.waitForTimeout(300);assert.deepEqual(trap.forbidden,[]);assert.equal(await trap.page.locator('[data-testid="home-area-card-Hamra"] img').count(),0);report.checks.push('listing-cover URL is never requested');await trap.context.close();
 const broken=await open({broken:true});await expect.poll(()=>broken.brokenRequests.length).toBeGreaterThan(0);await expect(broken.page.locator('[data-testid="home-area-card-Hamra"] [data-testid="home-area-image-fallback"]')).toBeVisible();assert.equal(await broken.page.locator('[data-testid="home-area-card-Hamra"] img').count(),0);report.checks.push('failed curated image uses tinted icon');await broken.context.close();
 assert.deepEqual(report.errors,[]);
}finally{await writeFile(out+'/followup-checks.json',JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify(report,null,2));

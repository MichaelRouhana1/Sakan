import assert from 'node:assert/strict';
import { chromium,expect } from '@playwright/test';
import { mkdir,copyFile,writeFile } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..');
const output=path.join(root,'artifacts/search-v2/step-3/revision-1');await mkdir(output,{recursive:true});
const base=process.env.STUDENTLY_TEST_URL??'http://127.0.0.1:8091';
const browser=await chromium.launch({channel:'msedge',headless:true});
const report={screenshots:[],checks:[],errors:[],apiDefaults:null};
const banned=['Your next chapter starts here','Made for student life','Find a place to call yours','Your next place is out there'];
try{
  for(const width of[1440,1280])for(const surface of['home','search']){
    const context=await browser.newContext({viewport:{width:Math.round(width/.9),height:Math.round(1000/.9)},deviceScaleFactor:.9,reducedMotion:'reduce'});
    const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
    // No API routing: capture the configured app against real public inventory.
    page.on('response',async response=>{
      if(response.url().includes('/api/search/suggest?q=')&&new URL(response.url()).searchParams.get('q')==='')report.apiDefaults=await response.json();
    });
    await page.goto(base+(surface==='home'?'/':'/search'),{waitUntil:'domcontentloaded',timeout:120000});
    await expect(page.locator('[data-desktop-search]')).toBeVisible({timeout:60000});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(4000);
    const launcher=page.locator('[data-desktop-search]');
    if(surface==='home')await launcher.getByRole('combobox').click();else await launcher.getByRole('button',{name:/search/i}).click();
    const input=page.getByRole('combobox',{name:'Search',exact:true});await expect(page.getByRole('group',{name:'Top areas',exact:true})).toBeVisible({timeout:20000});
    const universities=page.getByRole('group',{name:'Top universities & campuses'});
    await expect(universities.getByRole('option',{name:'AUB \u00b7 Ras Beirut',exact:true})).toBeVisible();
    const chips=await page.locator('.sds-chip').evaluateAll(nodes=>nodes.map(node=>{
      const box=node.getBoundingClientRect(),group=node.closest('.sds-chip-grid').getBoundingClientRect(),label=node.querySelector('.sds-chip-label');
      return{text:node.textContent,type:node.dataset.type,inside:box.left>=group.left-1&&box.right<=group.right+1,unclipped:node.scrollWidth<=node.clientWidth+1&&label.scrollWidth<=label.clientWidth+1,overflow:getComputedStyle(label).overflowX};
    }));
    assert.ok(chips.length);assert.ok(chips.every(chip=>chip.inside&&chip.unclipped&&chip.overflow!=='hidden'));
    assert.ok(chips.filter(chip=>chip.type==='campus').every(chip=>!/[\u0600-\u06ff]/.test(chip.text)&&!(/\bcampus\b/i.test(chip.text))));
    const areas=await page.getByRole('group',{name:'Top areas',exact:true}).locator('.sds-chip-label').allTextContents();
    assert.deepEqual(areas,['Hamra','Gemmayzeh','Verdun']);
    for(const copy of banned)assert.ok(!(await page.locator('.sds-surface').textContent()).includes(copy));
    async function shot(state){const file=`${width}-${surface}-${state}.png`;const buffer=await page.screenshot({path:path.join(output,file),animations:'disabled'});assert.ok(Math.abs(buffer.readUInt32BE(16)-width)<=1);await copyFile(path.join(output,file),path.join(output,'..',file));report.screenshots.push({file,width,surface,state});}
    await shot('defaults');
    await input.fill('\u0627\u0644\u062f\u0643\u0648\u0627\u0646\u0629');await expect(page.getByRole('option',{name:/^Dekwaneh, Matn/})).toBeVisible({timeout:20000});
    assert.match(await page.locator('.sds-title').first().textContent(),/[\u0600-\u06ff]/);for(const copy of banned)assert.ok(!(await page.locator('.sds-surface').textContent()).includes(copy));await shot('arabic-query');
    await input.fill('qwertyuiozx');await expect(page.getByText('No places found.',{exact:true})).toBeVisible({timeout:20000});await expect(page.getByText('Try another spelling, city, area or university.',{exact:true})).toBeVisible();await shot('no-results');
    report.checks.push({width,surface,chips,areas,arabicRows:true,functionalCopyOnly:true});await context.close();
  }
  assert.deepEqual(report.errors,[]);console.log(JSON.stringify({screenshots:report.screenshots.length,checks:report.checks.length,errors:report.errors},null,2));
}finally{await writeFile(path.join(output,'checks.json'),JSON.stringify(report,null,2));await browser.close();}

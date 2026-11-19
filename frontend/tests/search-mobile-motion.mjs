import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const out='../artifacts/search-v2/step-4';const browser=await chromium.launch({channel:'msedge',headless:true});
const report={};
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
 const page=await context.newPage();await page.goto('http://127.0.0.1:8091/',{waitUntil:'domcontentloaded',timeout:120000});
 const trigger=page.getByRole('button',{name:'Open search',exact:true}).first();await expect(trigger).toBeVisible({timeout:90000});
 const first=await trigger.textContent();await expect.poll(()=>trigger.textContent(),{timeout:5000}).not.toBe(first);report.placeholderCycles=true;
 await trigger.click();const sheet=page.locator('[data-mobile-search-sheet]');await expect(sheet).toBeVisible();
 await expect.poll(async()=>Math.abs((await sheet.boundingBox()).y),{timeout:2000}).toBeLessThan(1);
 await page.getByRole('combobox',{name:'Search',exact:true}).fill('USJ');
 const options=page.getByRole('option');await expect(options.first()).toBeVisible({timeout:20000});
 const input=page.getByRole('combobox',{name:'Search',exact:true});await input.press('ArrowDown');await input.press('End');
 const selected=page.locator('[role="option"][aria-selected="true"]');await expect(selected).toBeVisible();
 const box=await selected.boundingBox();assert.ok(box.y>=54&&box.y+box.height<=845);report.keyboardScroll=true;
 await page.screenshot({path:out+'/390-keyboard-selection.png'});
 await page.evaluate(()=>{Object.defineProperty(window.visualViewport,'height',{value:420,configurable:true});window.visualViewport.dispatchEvent(new Event('resize'));});
 await expect.poll(async()=>Math.round((await sheet.boundingBox()).height)).toBe(420);report.visualViewportResizes=true;
 const header=await input.boundingBox();assert.ok(header.y>=0&&header.y<60);
 await page.screenshot({path:out+'/390-viewport-resize.png'});
 await page.getByRole('button',{name:'Back from search',exact:true}).click();await expect(sheet).toHaveCount(0);report.animatedBackCloses=true;
 console.log(JSON.stringify(report));
}finally{await writeFile(out+'/motion-checks.json',JSON.stringify(report,null,2));await browser.close();}

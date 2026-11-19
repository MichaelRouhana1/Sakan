import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const out=path.resolve(import.meta.dirname,'../../artifacts/search-v2/step-4');await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const report={screenshots:[],checks:[],errors:[]};
try{
 for(const width of [360,390,430])for(const surface of ['home','search']){
  const context=await browser.newContext({viewport:{width,height:width===430?932:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push({width,surface,message:e.message}));
  await page.goto('http://127.0.0.1:8091/'+(surface==='home'?'':'search?maxRentUsd=700&wifiIncluded=true'),{waitUntil:'domcontentloaded',timeout:120000});
  const header=page.getByTestId(surface==='home'?'home-page-header':'search-page-header');
  await expect(header).toBeVisible({timeout:90000});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1500);
  await expect(header.getByRole('link',{name:'Studently home',exact:true})).toBeVisible();
  await expect(header.getByText('Campus',{exact:true})).toHaveCount(0);
  await expect(header.getByRole('button',{name:'Download Studently Mobile App',exact:true})).toHaveCount(0);
  await expect(header.getByRole('button',{name:'Become a host',exact:true})).toHaveCount(0);
  const controls=await header.locator('[role="button"],[role="link"],button,a').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return{label:node.getAttribute('aria-label')??node.textContent,x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};}).filter(r=>r.width>0&&r.height>0));
  assert.equal(controls.length,surface==='search'?3:2);
  for(const item of controls){assert.ok(item.x>=-1&&item.right<=width+1,JSON.stringify(item));assert.ok(item.y>=0&&item.bottom<=65,JSON.stringify(item));}
  for(let a=0;a<controls.length;a++)for(let b=a+1;b<controls.length;b++){
   const one=controls[a],two=controls[b];assert.ok(one.right<=two.x||two.right<=one.x||one.bottom<=two.y||two.bottom<=one.y,JSON.stringify({one,two}));
  }
  const dimensions=await header.evaluate(node=>({scrollWidth:node.scrollWidth,clientWidth:node.clientWidth,rectWidth:node.getBoundingClientRect().width}));
  assert.ok(dimensions.scrollWidth<=dimensions.clientWidth+1);assert.equal(Math.round(dimensions.rectWidth),width);
  const account=header.getByRole('button',{name:surface==='home'?'Account menu':'User profile menu',exact:true});await account.click();
  await expect(header.getByText('Login or sign up',{exact:true})).toBeVisible();
  const menu=await header.getByText('Login or sign up',{exact:true}).boundingBox();assert.ok(menu.x>=0&&menu.x+menu.width<=width);
  await page.mouse.click(4,80);await expect(header.getByText('Login or sign up',{exact:true})).toHaveCount(0);
  const trigger=page.getByRole('button',{name:'Open search',exact:true}).first();await trigger.click();
  await expect(page.getByRole('dialog',{name:'Search Lebanon',exact:true})).toBeVisible();await expect(page.getByRole('group',{name:'Top areas',exact:true})).toBeVisible({timeout:20000});
  await page.getByRole('button',{name:'Back from search',exact:true}).click();await expect(page.getByRole('dialog',{name:'Search Lebanon',exact:true})).toHaveCount(0);
  if(surface==='search')await expect(page.getByText(/Student Accommodations/).first()).toBeVisible({timeout:20000});
  const file=`${width}-${surface}-closed.png`;await page.screenshot({path:path.join(out,file),animations:'disabled'});
  report.screenshots.push({file,width,surface,state:'closed'});report.checks.push({width,surface,controls,dimensions,noOverlap:true,noOverflow:true,menuAccessible:true,sheetOpens:true});
  await context.close();console.log(`PASS ${width} ${surface}`);
 }
 assert.deepEqual(report.errors,[]);
}finally{await writeFile(path.join(out,'header-checks.json'),JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify({screenshots:report.screenshots.length,checks:report.checks.length,errors:report.errors}));

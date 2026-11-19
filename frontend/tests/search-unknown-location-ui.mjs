// Actual exported app + real local browse API. API_BASE must be a loopback dev server.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile,mkdir,writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium,expect } from '@playwright/test';
const frontend=path.resolve(import.meta.dirname,'..'),root=path.join(frontend,'.expo/search-v2-step2-export');
const apiBase=process.env.SEARCH_TEST_API_BASE??'http://127.0.0.1:3006';
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(apiBase).hostname))throw new Error('Loopback API required');
const output=path.resolve(frontend,'../artifacts/search-v2/step-2/validation');await mkdir(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.ttf':'font/ttf','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  let target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  if(!path.extname(target))target=target===root?path.join(target,'index.html'):target+'.html';
  try{res.setHeader('content-type',mime[path.extname(target)]??'application/octet-stream');res.end(await readFile(target));}catch{res.writeHead(404);res.end();}
});server.listen(0,'127.0.0.1');await once(server,'listening');
let browser;const checks=[];
try{
  browser=await chromium.launch({channel:'msedge',headless:true});
  for(const width of [1440,390]){
    const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[],requests=[];
    let activeRequests=0;
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/**',async route=>{
      const url=new URL(route.request().url());
      if(url.pathname==='/api/listings'){
        activeRequests++;
        try {
          const response=await route.fetch({url:apiBase+url.pathname+url.search});
          requests.push({params:Object.fromEntries(url.searchParams),status:response.status(),body:await response.json()});
          return await route.fulfill({response});
        } finally { activeRequests--; }
      }
      return route.fulfill({json:{data:[]}});
    });
    for(const [key,value] of [['areas','xyz'],['city','notacity']])for(const withFilters of [false,true]){
      const params=new URLSearchParams({[key]:value,...withFilters?{maxRentUsd:'700',wifiIncluded:'true',electricity:'solar',sort:'rent_asc',q:'studio'}:{}});
      await page.goto('http://127.0.0.1:'+server.address().port+'/search?'+params);
      await expect(page.getByText("We couldn't find that location",{exact:true})).toBeVisible({timeout:30000});
      await expect(page.getByText('Couldn’t load listings',{exact:true})).toHaveCount(0);
      const rejection=requests.find(x=>x.params[key]===value&&x.status===400);assert.ok(rejection);
      assert.equal(rejection.body.error.code,key==='areas'?'UNKNOWN_SEARCH_AREA':'UNKNOWN_SEARCH_CITY');
      await page.screenshot({path:path.join(output,`unknown-${key}-${width}-${withFilters?'filters':'bare'}.png`)});
      await page.getByRole('button',{name:'Clear location',exact:true}).click();
      await expect.poll(()=>new URL(page.url()).searchParams.get(key)).toBe(null);
      // Clearing can legitimately reuse a successful cached nationwide query.
      await expect.poll(()=>requests.some(x=>x.status===200&&!x.params.city&&!x.params.areas&&
        (x.params.q??'')===(withFilters?'studio':'')&&(!withFilters||x.params.maxRentUsd==='700'))).toBe(true);
      const after=new URL(page.url()).searchParams;
      if(withFilters)for(const [k,v]of [['maxRentUsd','700'],['wifiIncluded','true'],['electricity','solar'],['sort','rent_asc'],['q','studio']])assert.equal(after.get(k),v);
      await expect(page.getByText("We couldn't find that location",{exact:true})).toHaveCount(0);
      await expect.poll(()=>activeRequests).toBe(0);
      checks.push({width,key,withFilters,rejectionCode:rejection.body.error.code,recovered:true,preservedFilters:Object.fromEntries(after)});
    }
    assert.deepEqual(errors.filter(e=>!e.startsWith('Minified React error #418;')),[]);await page.close();
  }
  await writeFile(path.join(output,'unknown-locations.json'),JSON.stringify(checks,null,2));console.log(JSON.stringify(checks,null,2));
}finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}

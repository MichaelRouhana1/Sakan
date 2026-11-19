// Exercises the real Expo export, without a visual redesign or mocked UI components.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium,expect } from '@playwright/test';
const root=path.resolve(import.meta.dirname,'../.expo/search-v2-step2-export');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.ttf':'font/ttf','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let target=path.resolve(root,'.'+pathname);
  if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  if(!path.extname(target))target=pathname.endsWith('/')?path.join(target,'index.html'):target+'.html';
  try{res.setHeader('content-type',mime[path.extname(target)]??'application/octet-stream');res.end(await readFile(target));}
  catch{res.writeHead(404);res.end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
let browser;
try{
  browser=await chromium.launch({headless:true,channel:'msedge'});
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const requests=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
  const placeId='903fce27-063f-420e-8d04-3ea45be377f9',campusId='b0c230c1-ad13-41de-a935-3de7bb09f613';
  const base='http://127.0.0.1:'+server.address().port;
  const items={
    Dekouané:{type:'city',id:'city:dekwaneh',slug:'dekwaneh',canonicalAreas:['Dekwaneh'],label:{en:'Dekwaneh',ar:'الدكوانة'},context:{en:'Matn',ar:'المتن'},url:'/search?city=dekwaneh'},
    Bliss:{type:'place',id:placeId,canonicalArea:'Hamra',label:{en:'Bliss House',ar:'Bliss House — الحمرا'},context:{en:'Hamra, Beirut',ar:'الحمرا، بيروت'},url:'/search?placeId='+placeId},
    AUB:{type:'campus',id:campusId,slug:'aub',label:{en:'AUB — Ras Beirut Campus',ar:'الجامعة الأميركية في بيروت'},context:{en:'Beirut',ar:'بيروت'},url:'/search?campusId='+campusId+'&universitySlugs=aub'},
    حمرا:{type:'area',id:'area:hamra',slug:'hamra',canonicalArea:'Hamra',label:{en:'Hamra',ar:'الحمرا'},context:{en:'Beirut',ar:'بيروت'},url:'/search?areas=Hamra'},
  };
  await page.route('**/api/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/api/search/suggest'){
      const q=url.searchParams.get('q'),item=items[q];
      return route.fulfill({json:{data:{query:q,normalizedQuery:q?.toLowerCase(),mode:q?'results':'defaults',minQueryLength:2,results:item?[{...item,center:{lat:33.89,lng:35.48}}]:[],sections:{topAreas:[],topCampuses:[]}}}});
    }
    if(url.pathname==='/api/universities')return route.fulfill({json:{data:[{id:campusId,slug:'aub',name:'Ras Beirut Campus',displayName:'AUB — Ras Beirut Campus',active:true,lat:33.89,lng:35.48}]}});
    if(url.pathname==='/api/listings'){
      requests.push(Object.fromEntries(url.searchParams));
      return route.fulfill({json:{data:[],featured:[],campuses:[],matches:{},widening:{strictCount:0,alternativeCount:0,labels:[],shortfall:true},pagination:{page:1,pageSize:24,total:0,totalMatching:0,hasNext:false}}});
    }
    return route.fulfill({json:{data:[]}});
  });
  const input=page.getByRole('textbox',{name:'Search',exact:true});
  await page.goto(base+'/search?city=beirut&maxRentUsd=700&wifiIncluded=true&sort=rent_asc');
  await expect(input).toBeVisible({timeout:30000});
  await expect.poll(()=>requests.at(-1)?.city).toBe('beirut');
  for(const [q,key,value] of [['Dekouané','city','dekwaneh'],['Bliss','placeId',placeId],['AUB','campusId',campusId],['حمرا','areas','Hamra']]){
    const item=items[q];await input.fill(q);
    await page.getByRole('button',{name:item.label.en+', '+item.context.en,exact:true}).click();
    await expect.poll(()=>new URL(page.url()).searchParams.get(key)).toBe(value);
    await expect.poll(()=>requests.at(-1)?.[key]).toBe(value);
    const params=new URL(page.url()).searchParams;
    assert.equal(params.get('maxRentUsd'),'700');assert.equal(params.get('wifiIncluded'),'true');assert.equal(params.get('sort'),'rent_asc');
    for(const other of ['city','placeId','campusId','areas','q'])if(other!==key)assert.equal(params.get(other),null);
  }
  await page.goto(base+'/');await expect(input).toBeVisible();await input.fill('Dekouané');
  await page.getByRole('button',{name:'Dekwaneh, Matn',exact:true}).click();
  await expect.poll(()=>new URL(page.url()).pathname).toBe('/search');
  await expect.poll(()=>requests.at(-1)?.city).toBe('dekwaneh');
  // The existing matcher-export suite also records this app-shell hydration warning.
  const hydration=errors.filter(message=>message.startsWith('Minified React error #418;'));
  assert.deepEqual(errors.filter(message=>!hydration.includes(message)),[]);
  console.log('PASS actual homepage and browse selections preserve filters and replace all four destination types');
  console.log('Existing app-shell hydration warnings: '+hydration.length);
}finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}

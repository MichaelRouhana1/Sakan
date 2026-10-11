// Exercises the real exported web search against a controlled API response.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
const frontend=path.resolve(import.meta.dirname,'..');
const root=path.join(frontend,'.expo/slice3-export');
const output=path.join(frontend,'.expo/slice3-ui'); await mkdir(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.ttf':'font/ttf','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let target=path.resolve(root,'.'+pathname);
  if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  if(!path.extname(target))target+=pathname.endsWith('/')?'index.html':'.html';
  try{res.setHeader('content-type',mime[path.extname(target)]??'application/octet-stream');res.end(await readFile(target));}
  catch{res.writeHead(404);res.end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch({headless:true,channel:'msedge'});
const base='http://127.0.0.1:'+server.address().port;
const unit=(id,rent)=>({id,placeId:'shared-place',title:'Unit '+id,monthlyRentUsd:rent,status:'active',availability:'available',area:'Hamra',listingType:'private_room',electricity:'solar',wifiIncluded:true,priceBasis:'per_room_month',lat:33.89,lng:35.48,createdAt:'2026-09-01',expiresAt:'2099-01-01',photos:[]});
const units=[unit('u1',700),unit('u2',300),unit('u3',800),unit('u4',200)];
const featured={...unit('f',600),promotion:{type:'featured',campaignId:'campaign',position:0,endsAt:'2099-01-01',token:'test',sessionId:'test'}};
const prefs={version:1,budget:{value:{min:null,max:500},importance:'prefer'}};
const requests=[],errors=[];let failPage=false;
try{
  const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname!=='/api/listings')return route.fulfill({json:{data:[]}});
    const params=Object.fromEntries(url.searchParams);requests.push(params);
    if(failPage&&params.page==='2')return route.fulfill({status:500,json:{error:{message:'Test search failure'}}});
    const pageNumber=Number(params.page??1);
    // Intentionally send an order that local price/matcher code would change.
    // This verifies server authority independently of server ranking tests.
    const data=params.view==='map'?units:units.slice((pageNumber-1)*2,pageNumber*2);
    const matches=Object.fromEntries(data.map((u,i)=>[u.id,{score:i===0?25:100,top:i===1,reasons:[],details:[],knownCount:1,answeredCount:1,priceBasis:'per_room_month'}]));
    await route.fulfill({json:{data,featured:[featured],matches,widening:{strictCount:1,alternativeCount:4,labels:[],shortfall:false},pagination:{page:pageNumber,pageSize:2,total:4,totalMatching:5,hasNext:pageNumber===1}}});
  });
  const cardIds=()=>page.locator('[data-testid^="result-card-"]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-testid').replace('result-card-','')));
  for(const [ui,api] of [['newest','newest'],['rent_asc','price_asc'],['rent_desc','price_desc'],['distance','distance'],['match','match']]){
    await page.goto(base+'/search?areas=Hamra&sort='+ui+(ui==='match'?'&match='+encodeURIComponent(JSON.stringify(prefs)):''));
    await expect.poll(cardIds,{timeout:30000}).toEqual(['f','u1','u2']);
    await expect.poll(()=>requests.filter(p=>p.view!=='map').at(-1)?.sort).toBe(api);
    if(ui==='match')assert.deepEqual(JSON.parse(requests.filter(p=>p.view!=='map').at(-1).matcher),prefs);
    await expect(page.getByText('5 matching units',{exact:false})).toBeVisible();
    await page.getByRole('button',{name:'Next results page'}).click();
    await expect.poll(cardIds).toEqual(['f','u3','u4']);
    await expect.poll(()=>requests.filter(p=>p.view!=='map').at(-1)?.page).toBe('2');
    await page.getByRole('button',{name:'Previous results page'}).click();
    await expect.poll(cardIds).toEqual(['f','u1','u2']);
  }
  await page.getByRole('button',{name:'Next results page'}).click();
  await expect.poll(cardIds).toEqual(['f','u3','u4']);
  await page.getByRole('button',{name:'Best matches',exact:true}).click();
  await page.getByRole('button',{name:'Newest',exact:true}).click();
  await expect.poll(cardIds).toEqual(['f','u1','u2']);
  assert.equal(requests.filter(p=>p.view!=='map').at(-1).page,'1');
  await page.getByLabel('Close filter menu').click({position:{x:10,y:300}});
  await page.evaluate(()=>{window.scrollTo(0,0);document.getElementById('skoun-web-shell')?.scrollTo(0,0)});
  await page.screenshot({path:path.join(output,'search-desktop.png'),fullPage:false});
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByText('Talk to posters directly',{exact:false})).toHaveCount(0);
  await expect(page.getByTestId('result-card-f')).toBeVisible();
  await page.screenshot({path:path.join(output,'search-mobile.png'),fullPage:false});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  failPage=true;
  await page.getByRole('button',{name:'Next results page'}).click();
  await expect(page.getByText('Couldn’t load listings',{exact:true})).toBeVisible({timeout:15000});
  failPage=false;
  await page.getByRole('button',{name:'Retry',exact:true}).click();
  await expect.poll(cardIds).toEqual(['f','u3','u4']);
  const unexpected=errors.filter(e=>!e.startsWith('Minified React error #418;'));
  assert.deepEqual(unexpected,[]);
  console.log('PASS exported search: five sorts preserve API order, separate Featured, unit pagination, filter reset, phone layout and error recovery');
  console.log('App-shell hydration warnings: '+(errors.length-unexpected.length));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}

// Real browser check of the admin inventory form and its API adapter.
// The backend's auth, transaction and database behavior is covered separately.
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {build}=require('../../backend/node_modules/esbuild');
const {chromium,expect}=require('@playwright/test');
const root=path.resolve(import.meta.dirname,'..');
const output=path.join(root,'.expo','inventory-ui');await mkdir(output,{recursive:true});
const fixture={id:'00000000-0000-4000-8000-000000000001',title:'Shared room',unitType:'shared_bed',availability:'available',hidden:false,hiddenReason:'confirm_beds',bedsTotal:4,bedsAvailable:null,inventoryNeedsConfirmation:true,inventoryVersion:0};
const entry=`import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {ListingInventory} from './components/admin-neu/listings/ListingInventory';
import {ADMIN_CSS} from './styles/adminCssText';
const style=document.createElement('style');style.textContent=ADMIN_CSS;document.head.append(style);
function App(){const [row,setRow]=useState(${JSON.stringify(fixture)});return <main className="skoun-admin" style={{maxWidth:440,margin:'32px auto'}}><ListingInventory key={row.inventoryVersion} listing={row} onSaved={setRow}/></main>};
createRoot(document.getElementById('root')).render(<App/>);`;
const bundle=await build({stdin:{contents:entry,loader:'tsx',resolveDir:root},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',plugins:[{name:'local-api',setup(b){b.onResolve({filter:/^@\/lib\/api$/},()=>({path:'test-api',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:"import axios from 'axios';export const api=axios.create({baseURL:location.origin});",resolveDir:root}));}}]});
let row={...fixture};let request;let fail=false;
const server=createServer(async(req,res)=>{
 if(req.url==='/bundle.js'){res.setHeader('content-type','text/javascript');res.end(bundle.outputFiles[0].text);return}
 if(req.url?.startsWith('/api/admin/inventory/listings/')){
  let body='';for await(const chunk of req)body+=chunk;request=JSON.parse(body);
  res.setHeader('content-type','application/json');
  if(fail){res.statusCode=409;res.end(JSON.stringify({error:{message:'Inventory changed. Refresh before saving.'}}));return}
  const {expectedVersion,...change}=request.inventory;assert.equal(expectedVersion,row.inventoryVersion);
  row={...row,...change,inventoryVersion:row.inventoryVersion+1};row.inventoryNeedsConfirmation=row.bedsAvailable===null;row.hiddenReason=row.hidden?'unit_hidden':row.inventoryNeedsConfirmation?'confirm_beds':null;
  res.end(JSON.stringify({data:row}));return;
 }
 res.setHeader('content-type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
});
server.listen(0,'127.0.0.1');await once(server,'listening');let browser;
try {
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:520,height:800}});
 await page.route('https://fonts.googleapis.com/**',route=>route.abort());
 await page.route('https://fonts.gstatic.com/**',route=>route.abort());
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.getByRole('checkbox').check();await page.getByLabel('Inventory change note').fill('Temporarily hidden');await page.getByRole('button',{name:'Save inventory'}).click();
 await expect(page.getByText('Hidden by host or staff')).toBeVisible();assert.deepEqual(request.inventory,{expectedVersion:0,hidden:true});
 await page.getByLabel('Available beds').fill('2');await page.getByLabel('Inventory change note').fill('Confirmed vacancy');await page.getByRole('button',{name:'Save inventory'}).click();
 await expect(page.getByLabel('Inventory change note')).toHaveValue('');assert.equal(row.bedsAvailable,2);assert.equal(request.inventory.bedsTotal,4);
 fail=true;await page.getByRole('checkbox').uncheck();await page.getByLabel('Inventory change note').fill('Show again');await page.getByRole('button',{name:'Save inventory'}).click();
 await expect(page.getByRole('alert')).toHaveText('Inventory changed. Refresh before saving.');assert.equal(row.hidden,true);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:path.join(output,'inventory.png'),fullPage:true});
 await writeFile(path.join(output,'result.json'),JSON.stringify({passed:3,checks:['hide unknown beds without guessing vacancy','confirm beds with versioned request','surface conflict without fake success']},null,2));
 console.log('PASS admin inventory browser: unknown-bed hiding, bed confirmation, conflict feedback; no horizontal overflow');
} finally {if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}

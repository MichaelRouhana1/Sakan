// Mobile sheet contract: real component and guarded suggest hook, controlled network.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import path from 'node:path';
import { build } from '../../backend/node_modules/esbuild/lib/main.js';
import { chromium,expect } from '@playwright/test';

test('suggest caller debounces, gates, guards in-flight results and selects typed destinations',{timeout:60000},async()=>{
  const frontend=path.resolve(import.meta.dirname,'..');
  const bundle=await build({stdin:{contents:`
    import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
    import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
    import {SearchAutocomplete} from './components/search/SearchAutocomplete';
    function App(){const[q,setQ]=useState('');const[selected,setSelected]=useState('');return <QueryClientProvider client={client}><div style={{width:680,margin:20}}><SearchAutocomplete value={q} onChangeText={setQ} onSelect={x=>setSelected(x.url)} onSubmitText={x=>setSelected('text:'+x)} onClear={()=>setSelected('')}/><output>{selected}</output><button>Outside</button></div></QueryClientProvider>};
    const client=new QueryClient({defaultOptions:{queries:{retry:false}}});createRoot(document.getElementById('root')).render(<App/>);`,loader:'tsx',resolveDir:frontend},
    absWorkingDir:frontend,bundle:true,write:false,platform:'browser',jsx:'automatic',
    resolveExtensions:['.web.tsx','.web.ts','.web.js','.tsx','.ts','.jsx','.js','.json'],
    define:{'process.env.NODE_ENV':'"test"',__DEV__:'false'},alias:{'react-native':'react-native-web'},
    plugins:[{name:'boundaries',setup(b){
      b.onResolve({filter:/^(@\/lib\/api|@expo\/vector-icons)$/},args=>({path:args.path,namespace:'stub'}));
      b.onLoad({filter:/.*/,namespace:'stub'},args=>({resolveDir:frontend,loader:'tsx',contents:args.path.includes('api')?
        // Deliberately ignore AbortSignal: the response guard must also protect older transports.
        `export const api={get:async(url,{params})=>({data:await(await fetch(url+'?'+new URLSearchParams(params))).json()})};`:
        `import React from 'react';export const Ionicons=()=>null;`}));
    }}]});
  const server=createServer((req,res)=>{res.setHeader('content-type',req.url==='/app.js'?'text/javascript':'text/html');res.end(req.url==='/app.js'?bundle.outputFiles[0].contents:'<div id="root"></div><script src="/app.js"></script>');});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  let browser;
  try{
    browser=await chromium.launch({channel:'msedge',headless:true});
    const page=await browser.newPage({viewport:{width:800,height:800},reducedMotion:'reduce'});
    const requests=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
    let releaseHamra;const holdHamra=new Promise(resolve=>releaseHamra=resolve);
    await page.route('**/api/search/suggest*',async r=>{
      const q=new URL(r.request().url()).searchParams.get('q');requests.push({q,time:Date.now()});
      if(q==='Hamra')await holdHamra;
      const label=q==='Fanar'?'Fanar':q==='Hamra'?'Hamra':q;
      await r.fulfill({json:{data:{query:q,normalizedQuery:q?.toLowerCase(),mode:q?'results':'defaults',minQueryLength:2,results:q?[{type:'city',id:'city:'+q.toLowerCase(),slug:q.toLowerCase(),canonicalAreas:[label],label:{en:label,ar:label},context:{en:'Matn',ar:'المتن'},url:'/search?city='+q.toLowerCase(),center:{lat:33.89,lng:35.48}}]:[],sections:{topAreas:[],topCampuses:[]}}}});
    });
    await page.goto('http://127.0.0.1:'+server.address().port);
    const trigger=page.getByRole('button',{name:'Open search',exact:true});
    const resting=await trigger.textContent();await page.waitForTimeout(2300);await expect(trigger).toHaveText(resting);
    await page.getByRole('button',{name:'Open search',exact:true}).click();
    const input=page.getByRole('combobox',{name:'Search',exact:true});await input.click();
    await expect.poll(()=>requests.length).toBe(1);assert.equal(requests[0].q,'');
    await input.fill('H');await page.waitForTimeout(260);assert.equal(requests.length,1);
    const start=Date.now();await input.fill('Hamra');await page.waitForTimeout(100);assert.equal(requests.length,1);
    await expect.poll(()=>requests.some(x=>x.q==='Hamra')).toBe(true);assert.ok(requests.find(x=>x.q==='Hamra').time-start>=185);
    await input.fill('Fanar');releaseHamra();
    await page.waitForTimeout(100);await expect(page.getByRole('option',{name:'Hamra, Matn, City',exact:true})).toHaveCount(0);
    const fanar=page.getByRole('option',{name:'Fanar, Matn, City',exact:true});await expect(fanar).toBeVisible();
    await input.press('ArrowDown');await input.press('Enter');await expect(page.locator('output')).toHaveText('/search?city=fanar');
    await page.getByRole('button',{name:'Open search',exact:true}).click();await input.fill('Beirut');await page.waitForTimeout(60);await input.fill('Beirutt');await page.waitForTimeout(60);await input.fill('Beirut');
    await expect(page.getByRole('option',{name:'Beirut, Matn, City',exact:true})).toBeVisible();
    assert.equal(requests.filter(x=>x.q==='Beirutt').length,0);
    await input.fill('حمرا');await expect.poll(()=>requests.some(x=>x.q==='حمرا')).toBe(true);
    await input.press('Escape');await expect(page.getByRole('dialog',{name:'Search Lebanon'})).toBeVisible();
    await input.click();await input.dispatchEvent('compositionstart');await input.fill('USJ');await page.waitForTimeout(300);
    assert.equal(requests.filter(x=>x.q==='USJ').length,0);await input.dispatchEvent('compositionend');
    await expect.poll(()=>requests.some(x=>x.q==='USJ')).toBe(true);
    await page.getByRole('button',{name:'Back from search',exact:true}).click();
    await expect(page.getByRole('option',{name:'حمرا, Matn, City',exact:true})).toHaveCount(0);
    assert.deepEqual(errors,[]);
  }finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

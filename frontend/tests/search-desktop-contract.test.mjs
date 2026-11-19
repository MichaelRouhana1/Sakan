import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import path from 'node:path';
import { build } from '../../backend/node_modules/esbuild/lib/main.js';
import { chromium,expect } from '@playwright/test';
test('desktop combobox preserves API order, unique recent chips, focus and IME safety',{timeout:60000},async()=>{
  const frontend=path.resolve(import.meta.dirname,'..');
  const city={type:'city',id:'city:fanar',slug:'fanar',canonicalAreas:['Fanar'],label:{en:'Fanar',ar:'الفنار'},context:{en:'Matn',ar:'المتن'},center:null,url:'/search?city=fanar'};
  const area={...city,type:'area',id:'area:hamra',slug:'hamra',canonicalArea:'Hamra',label:{en:'Hamra',ar:'الحمرا'},url:'/search?areas=Hamra'};
  const campus={...city,type:'campus',id:'campus-1',slug:'aub',label:{en:'AUB \u2014 Ras Beirut Campus',ar:'\u0627\u0644\u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0623\u0645\u064a\u0631\u0643\u064a\u0629'},url:'/search?campusId=campus-1'};
  const place={...city,type:'place',id:'place-1',canonicalArea:'Hamra',label:{en:'Bliss House',ar:'Bliss House — الحمرا'},url:'/search?placeId=place-1'};
  const items=[city,area,campus,place];
  const bundle=await build({stdin:{contents:`import React,{useState} from 'react';import{createRoot}from'react-dom/client';import{QueryClient,QueryClientProvider}from'@tanstack/react-query';import{DesktopDesignProvider}from'./components/ui/DesktopDesign';import{SearchAutocomplete}from'./components/search/SearchAutocomplete';const recent=${JSON.stringify([city])};const client=new QueryClient();function App(){const[q,setQ]=useState('');const[selected,setSelected]=useState([]);return <QueryClientProvider client={client}><DesktopDesignProvider enabled><div style={{width:528,margin:40}}><SearchAutocomplete value={q} onChangeText={setQ} onSelect={item=>setSelected(old=>[...old,item.type])} onClear={()=>{}} onSubmitText={()=>{}} recentSuggestions={recent}/><output>{selected.join(',')}</output><button style={{position:'fixed',right:20,bottom:20}}>Outside</button></div></DesktopDesignProvider></QueryClientProvider>}createRoot(document.getElementById('root')).render(<App/>);`,resolveDir:frontend,loader:'tsx'},absWorkingDir:frontend,bundle:true,write:false,platform:'browser',jsx:'automatic',resolveExtensions:['.web.tsx','.web.ts','.web.js','.tsx','.ts','.jsx','.js','.json'],define:{'process.env.NODE_ENV':'"test"',__DEV__:'false'},alias:{'react-native':'react-native-web'},plugins:[{name:'boundaries',setup(b){b.onResolve({filter:/^(@\/lib\/api|@expo\/vector-icons)$/},args=>({path:args.path,namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},args=>({resolveDir:frontend,loader:'tsx',contents:args.path.includes('api')?`export const api={get:async(url,{params,signal})=>({data:await(await fetch(url+'?'+new URLSearchParams(params),{signal})).json()})};`:'export const Ionicons=()=>null;'}));}}]});
  const server=createServer((req,res)=>{res.setHeader('content-type',req.url==='/app.js'?'text/javascript':'text/html');res.end(req.url==='/app.js'?bundle.outputFiles[0].contents:'<div id="root"></div><script src="/app.js"></script>');});server.listen(0,'127.0.0.1');await once(server,'listening');
  let browser;
  try{
    browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});const errors=[],queries=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/search/suggest*',route=>{const q=new URL(route.request().url()).searchParams.get('q');queries.push(q);return route.fulfill({json:{data:{query:q,normalizedQuery:q,mode:q?'results':'defaults',minQueryLength:2,results:q?items:[],sections:{topAreas:q?[]:[city,area],topCampuses:q?[]:[campus]}}}});});
    await page.goto('http://127.0.0.1:'+server.address().port);const launcher=page.locator('.sds-launch');await launcher.click();const input=page.getByRole('combobox',{name:'Search',exact:true});
    await expect(page.getByRole('group',{name:'Top universities & campuses'}).getByRole('option',{name:'AUB \u00b7 Ras Beirut',exact:true})).toBeVisible();
    assert.equal(await page.getByRole('group',{name:'Top universities & campuses'}).locator('bdi').count(),0);
    await expect(page.getByRole('group',{name:'Recently searched'})).toBeVisible();await expect(page.getByRole('option')).toHaveCount(3);
    const ids=await page.getByRole('option').evaluateAll(nodes=>nodes.map(node=>node.id));assert.equal(new Set(ids).size,ids.length);
    await expect(page.getByRole('option',{name:/^Fanar, Matn/})).toHaveCount(1);
    await input.press('Escape');await expect(launcher).toBeFocused();await launcher.click();await expect(input).toBeFocused();
    await input.fill('Be');await expect(page.locator('.sds-row')).toHaveCount(4);assert.deepEqual(await page.locator('.sds-type').allTextContents(),['City','Area','Campus','Property']);
    await page.setViewportSize({width:1280,height:420});await input.press('ArrowDown');await input.press('End');await input.press('ArrowDown');await expect.poll(()=>page.locator('.sds-scroll').evaluate(node=>node.scrollTop)).toBeGreaterThan(0);await expect(input).toBeFocused();await expect(page.locator('[aria-selected=true] .sds-type')).toHaveText('Property');await input.press('Enter');await expect(page.locator('output')).toHaveText('place');
    await launcher.click();
    await input.dispatchEvent('compositionstart');await input.fill('حم');await input.press('Enter');await expect(page.locator('output')).toHaveText('place');await input.dispatchEvent('compositionend');await expect(page.locator('.sds-row')).toHaveCount(4);
    await input.press('Enter');await expect(page.locator('output')).toHaveText('place,city');
    await launcher.click();await page.getByRole('button',{name:'Clear search',exact:true}).click();await expect(input).toHaveValue('');await expect(page.getByRole('group',{name:'Top areas',exact:true})).toBeVisible();
    await input.fill('A');await page.waitForTimeout(260);assert.ok(!queries.includes('A'));await page.getByRole('button',{name:'Outside'}).click();await expect(page.getByTestId('desktop-search-panel')).toHaveCount(0);
    assert.deepEqual(errors,[]);
  }finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import path from 'node:path';
import {build} from '../../backend/node_modules/esbuild/lib/main.js';
import {chromium,expect} from '@playwright/test';
const city=(slug)=>({type:'city',id:'city:'+slug,slug,canonicalAreas:[slug],label:{en:slug[0].toUpperCase()+slug.slice(1),ar:'Arabic '+slug},context:{en:'Matn',ar:'Arabic context'},url:'/search?city='+slug,center:null});
const hamra={type:'area',id:'area:hamra',slug:'hamra',canonicalArea:'Hamra',label:{en:'Hamra',ar:'Arabic Hamra'},context:{en:'Beirut',ar:'Arabic Beirut'},url:'/search?areas=Hamra',center:null};
test('guest and signed-in history persist separately and late account responses never replace the current account',{timeout:60000},async()=>{
 const root=path.resolve(import.meta.dirname,'..');
 const bundle=await build({stdin:{resolveDir:root,loader:'tsx',contents:`import React,{useState}from'react';import{createRoot}from'react-dom/client';import{QueryClient,QueryClientProvider}from'@tanstack/react-query';import{SearchRecentsProvider}from'./features/search/SearchRecentsProvider';import{SearchAutocomplete}from'./components/search/SearchAutocomplete';const client=new QueryClient();function App(){const[q,setQ]=useState('');return <QueryClientProvider client={client}><SearchRecentsProvider><div style={{margin:16}}><SearchAutocomplete value={q} onChangeText={setQ} onClear={()=>setQ('')} onSelect={()=>setQ('')} onSubmitText={()=>{}} variant="pill"/></div></SearchRecentsProvider></QueryClientProvider>}createRoot(document.getElementById('root')).render(<App/>);`},bundle:true,write:false,absWorkingDir:root,platform:'browser',jsx:'automatic',resolveExtensions:['.web.tsx','.web.ts','.web.js','.tsx','.ts','.js','.json'],define:{'process.env.NODE_ENV':'"test"',__DEV__:'false'},alias:{'react-native':'react-native-web'},plugins:[{name:'boundaries',setup(b){
  b.onResolve({filter:/^(@\/lib\/api|@expo\/vector-icons|@\/features\/auth\/AuthSessionProvider)$/},a=>({path:a.path,namespace:'stub'}));
  b.onLoad({filter:/.*/,namespace:'stub'},a=>({loader:'tsx',resolveDir:root,contents:a.path.includes('AuthSession')?`import{useState,useEffect}from'react';export function useOptionalAuthSession(){const[id,set]=useState(window.testAccount??null);useEffect(()=>{const sync=()=>set(window.testAccount);window.addEventListener('test-auth',sync);return()=>window.removeEventListener('test-auth',sync)},[]);return{user:id?{id}:null,isSignedIn:!!id,isLoading:false,hasClerkSession:!!id}}`:a.path.includes('/api')?`const request=async(url,method,body,options={})=>{const response=await fetch(url+(options.params?'?'+new URLSearchParams(options.params):''),{method,headers:{'content-type':'application/json','x-account':window.testAccount??'guest'},body:body?JSON.stringify(body):undefined,signal:options.signal});if(!response.ok)throw new Error('request failed');return{data:response.status===204?undefined:await response.json()}};export const API_BASE_URL='http://127.0.0.1:3006';export const api={get:(u,o)=>request(u,'GET',null,o),post:(u,b,o)=>request(u,'POST',b,o),delete:(u,o)=>request(u,'DELETE',null,o)};`:'export const Ionicons=()=>null;'}));
 }}]});
 const server=createServer((req,res)=>{res.setHeader('content-type',req.url==='/app.js'?'text/javascript':'text/html');res.end(req.url==='/app.js'?bundle.outputFiles[0].contents:'<div id="root"></div><script src="/app.js"></script>');});server.listen(0,'127.0.0.1');await once(server,'listening');let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});const errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));
  const accounts={A:[],B:[city('dekwaneh')]};let releasePost;const heldPost=new Promise(resolve=>releasePost=resolve);
  await page.route('**/api/search/**',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.pathname.endsWith('/suggest')){const q=url.searchParams.get('q');return route.fulfill({json:{data:{query:q,normalizedQuery:q,mode:q?'results':'defaults',minQueryLength:2,results:q?[q==='Fanar'?city('fanar'):hamra]:[],sections:{topAreas:q?[]:[hamra],topCampuses:[]}}}});}
   const account=req.headers()['x-account'];
   if(req.method()==='POST'){const body=req.postDataJSON();writes.push({account,body});accounts[account]=[city('fanar')];await heldPost;}
   if(req.method()==='DELETE'){accounts[account]=[];return route.fulfill({status:204,body:''});}
   try{await route.fulfill({json:{data:accounts[account]??[]}});}catch{/* Account switch cancels the old transport. */}
  });
  await page.goto('http://127.0.0.1:'+server.address().port);
  const open=async()=>{await page.getByRole('button',{name:'Open search',exact:true}).click();};
  const input=page.getByRole('combobox',{name:'Search',exact:true});
  await open();await input.fill('Hamra');await page.getByRole('option',{name:'Hamra, Beirut, Area',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('studently.search.recents.v1')??'{"items":[]}').items.length)).toBe(1);
  const login=async account=>page.evaluate(id=>{window.testAccount=id;window.dispatchEvent(new Event('test-auth'));},account);
  await login('A');await open();await expect(page.getByRole('group',{name:'Recently searched',exact:true})).toHaveCount(0);
  await input.fill('Fanar');await page.getByRole('option',{name:'Fanar, Matn, City',exact:true}).click();
  await expect.poll(()=>writes.length).toBe(1);assert.deepEqual(writes[0],{account:'A',body:{type:'city',id:'city:fanar'}});
  await login('B');releasePost();await open();
  const recent=page.getByRole('group',{name:'Recently searched',exact:true});await expect(recent).toBeVisible();
  await expect(recent.getByRole('option',{name:'Dekwaneh, Matn, City',exact:true})).toBeVisible();
  await expect(recent.getByText('Fanar',{exact:true})).toHaveCount(0);await expect(recent.getByText('Hamra',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Clear recent searches',exact:true}).click();await expect(recent).toHaveCount(0);assert.deepEqual(accounts.B,[]);
  await login(null);await expect(recent).toBeVisible();await expect(recent.getByRole('option',{name:'Hamra, Beirut, Area',exact:true})).toBeVisible();
  assert.deepEqual(errors,[]);
 }finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

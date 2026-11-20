// Actual native router root and persistence in a controlled React harness; not a device emulator.
import test from 'node:test';import assert from 'node:assert/strict';import {createServer}from'node:http';import{once}from'node:events';import path from'node:path';
import{build}from'../../backend/node_modules/esbuild/lib/main.js';import{chromium,expect}from'@playwright/test';
const root=path.resolve(import.meta.dirname,'..');
const item={type:'area',id:'area:hamra',slug:'hamra',canonicalArea:'Hamra',label:{en:'Hamra',ar:'Arabic Hamra'},context:{en:'Beirut',ar:'Arabic Beirut'},url:'/search?areas=Hamra',center:null,eligibleUnitCount:4,thumbnailSource:'curated',thumbnailUrl:'/assets/search/areas/hamra.jpg'};
const bundle=await build({stdin:{resolveDir:root,loader:'tsx',contents:`import React from'react';import{createRoot}from'react-dom/client';import{QueryClient,QueryClientProvider}from'@tanstack/react-query';import NativeRoot from'./app/_layout.native';import{useSearchRecents}from'./features/search/useSearchRecents';const client=new QueryClient();function Actions(){const r=useSearchRecents();return <><button onClick={()=>r.remember(${JSON.stringify(item)})}>Save</button><button onClick={()=>r.retry()}>Refresh</button><output>{r.items.map(x=>x.label.en).join(',')}</output><pre data-testid="native-records">{JSON.stringify(r.items)}</pre></>}window.NativeTestScreen=Actions;createRoot(document.getElementById('root')).render(<NativeRoot/>);`},bundle:true,write:false,absWorkingDir:root,platform:'browser',jsx:'automatic',loader:{'.ttf':'dataurl'},define:{'process.env.NODE_ENV':'"test"'},plugins:[{name:'native-boundaries',setup(b){
 const rootStubs={
  'expo-router':`import React from'react';export function Stack(){return React.createElement(window.NativeTestScreen)}Stack.Screen=()=>null;export const ErrorBoundary=()=>null;`,
  'expo-router/react-navigation':`export const DarkTheme={};export const DefaultTheme={};export const ThemeProvider=({children})=>children;`,
  'expo-font':`export const useFonts=()=>[true,null];`,
  'expo-splash-screen':`export const preventAutoHideAsync=()=>{};export const hideAsync=()=>{};`,
  'expo-web-browser':`export const maybeCompleteAuthSession=()=>{};`,
  'expo-secure-store':`export const getItemAsync=async()=>null;export const setItemAsync=async()=>{};`,
  '@clerk/expo':`export const ClerkProvider=({children})=>children;`,
  '@expo/vector-icons':`export const Ionicons={font:{}};`,
  '@expo-google-fonts/dm-sans':`export const DMSans_400Regular='',DMSans_500Medium='',DMSans_600SemiBold='',DMSans_700Bold='';`,
  'react-native-gesture-handler':`export const GestureHandlerRootView=({children})=>children;`,
  'react-native-reanimated':``,
  '@/components/useColorScheme':`export const useColorScheme=()=>null;`,
  '@/lib/clerkEnabled':`export const CLERK_PUBLISHABLE_KEY='';export const isClerkEnabled=false;export const ClerkEnabledProvider=({children})=>children;`,
  '@/features/notifications/NotificationBootstrap':`export const NotificationBootstrap=()=>null;`,
  '@/features/saved/saveAuthPrompt':`export const SaveAuthPrompt=()=>null;`,
  '@/features/saved/SavedListingToast':`export const SavedListingToast=()=>null;`,
  '@/components/common/InitialLoadingScreen':`export const InitialLoadingScreen=()=>null;`,
 };
 b.onResolve({filter:/.*/},a=>Object.hasOwn(rootStubs,a.path)?{path:a.path,namespace:'native-root-stub'}:null);
 b.onLoad({filter:/.*/,namespace:'native-root-stub'},a=>({loader:'tsx',resolveDir:root,contents:rootStubs[a.path]}));
 b.onResolve({filter:/^(react-native|@react-native-async-storage\/async-storage|@\/lib\/api|@\/features\/auth\/AuthSessionProvider)$/},a=>({path:a.path,namespace:'stub'}));
 b.onLoad({filter:/.*/,namespace:'stub'},a=>({loader:'tsx',resolveDir:root,contents:a.path==='react-native'?`export const Platform={OS:new URLSearchParams(location.search).get('os')};`:a.path.includes('async-storage')?`export default {getItem:async()=>{window.nativeReads=(window.nativeReads??0)+1;const snapshot=await(await fetch('/native-store')).text();if(window.holdNextNativeRead){window.holdNextNativeRead=false;return new Promise(resolve=>window.releaseNativeRead=()=>resolve(snapshot||null));}return snapshot||null;},setItem:async(key,raw)=>{await fetch('/native-store',{method:'POST',body:raw});window.nativeWrites=(window.nativeWrites??0)+1;}};`:a.path.includes('AuthSession')?`import{useState}from'react';export function useOptionalAuthSession(){const[loading,set]=useState(new URLSearchParams(location.search).has('loading'));window.finishAuth=()=>set(false);return{isLoading:loading,isSignedIn:false,hasClerkSession:false,user:null};}export const AuthSessionProvider=({children})=>children;`:`export const API_BASE_URL='http://192.168.10.249:3001';export const api={get:async()=>({data:{data:[]}})};`}));
}}]});
for(const os of ['ios','android'])test(`native ${os} recent persistence`,{timeout:30000},async t=>{
 let durable='';const server=createServer(async(req,res)=>{if(req.url.startsWith('/native-store')){if(req.method==='POST'){let raw='';for await(const c of req)raw+=c;durable=raw;}res.end(durable);return;}res.setHeader('content-type',req.url.startsWith('/app.js')?'text/javascript':'text/html');res.end(req.url.startsWith('/app.js')?bundle.outputFiles[0].contents:`<div id="root"></div><script>window.nativeStorageEvents=0;const original=window.addEventListener.bind(window);window.addEventListener=(name,...args)=>{if(name==='storage')window.nativeStorageEvents++;return original(name,...args)};</script><script src="/app.js"></script>`);});
 server.listen(0,'127.0.0.1');await once(server,'listening');const browser=await chromium.launch({channel:'msedge',headless:true});
 const url='http://127.0.0.1:'+server.address().port+'/?os='+os;
 try{
 await t.test('native does not register browser-only storage listeners',async()=>{durable='';const p=await browser.newPage();await p.goto(url);await expect(p.getByText('Save',{exact:true})).toBeVisible();await expect.poll(()=>p.evaluate(()=>window.nativeReads??0)).toBeGreaterThan(0);assert.equal(await p.evaluate(()=>window.nativeStorageEvents),0);await p.close();});
 await t.test('selection during auth bootstrap persists and survives a fresh JS runtime',async()=>{durable='';const p=await browser.newPage();await p.goto(url+'&loading=1');await p.getByText('Save',{exact:true}).click();await p.evaluate(()=>window.finishAuth());await expect(p.locator('output')).toHaveText('Hamra');await expect.poll(()=>p.evaluate(()=>window.nativeWrites??0)).toBeGreaterThan(0);await p.goto(url);await expect(p.locator('output')).toHaveText('Hamra');assert.equal(JSON.parse(durable).items[0].id,'area:hamra');const restored=JSON.parse(await p.getByTestId('native-records').textContent());assert.equal(restored[0].eligibleUnitCount,4);assert.equal(restored[0].thumbnailUrl,'/assets/search/areas/hamra.jpg');await p.close();});
 await t.test('late native read cannot overwrite a newly saved recent on reopen',async()=>{durable='';const p=await browser.newPage();await p.goto(url);await expect.poll(()=>p.evaluate(()=>window.nativeReads??0)).toBeGreaterThan(0);await p.waitForTimeout(50);await p.evaluate(()=>window.holdNextNativeRead=true);await p.getByText('Refresh',{exact:true}).click();await expect.poll(()=>p.evaluate(()=>typeof window.releaseNativeRead)).toBe('function');await p.getByText('Save',{exact:true}).click();await expect.poll(()=>p.evaluate(()=>window.nativeWrites??0)).toBeGreaterThan(0);await expect(p.locator('output')).toHaveText('Hamra');await p.evaluate(()=>window.releaseNativeRead());await p.waitForTimeout(150);await expect(p.locator('output')).toHaveText('Hamra');await p.close();});
 }finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

// Sign-in email-code step with Clerk mocked. After a correct password Clerk can answer
// needs_client_trust / needs_second_factor / needs_first_factor instead of "complete".
// The real modal must show a code step (send, enter, resend, wrong code, success), never a dead end.
import {build} from '../../backend/node_modules/esbuild/lib/main.js';
import {chromium,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {existsSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'.expo/auth-signin-code-ui');await mkdir(out,{recursive:true});
// The modal file carries the product name; resolve whichever name this checkout uses.
const modalFile=['StudentlyAuthModal','SkounAuthModal'].find(name=>existsSync(path.join(root,'components/auth',name+'.tsx')));
assert.ok(modalFile,'auth modal component not found');
const entry=`import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import * as Modal from './components/auth/${modalFile}';
const AuthModal=Object.values(Modal).find(value=>typeof value===\u0027function\u0027);
function Host(){const [visible,setVisible]=useState(true);window.modalClosed=!visible;return <AuthModal visible={visible} onClose={()=>setVisible(false)} onSuccess={id=>{window.successId=id;}}/>}
createRoot(document.getElementById('root')).render(<Host/>);`;
const stubs={
 clerk:`const status=new URLSearchParams(location.search).get('status')||'needs_client_trust';
const calls=window.calls=[];
const signIn={status:null,createdSessionId:null,
 supportedFirstFactors:status==='needs_first_factor'?[{strategy:'email_code',emailAddressId:'idn_1'}]:[],
 supportedSecondFactors:status==='needs_first_factor'?[]:[{strategy:'email_code',emailAddressId:'idn_1'}],
 async create(p){calls.push(['create',p]);this.status=status;return this;},
 async prepareFirstFactor(p){calls.push(['prepareFirstFactor',p]);},
 async prepareSecondFactor(p){calls.push(['prepareSecondFactor',p]);},
 async attemptFirstFactor(p){return this.attempt('attemptFirstFactor',p);},
 async attemptSecondFactor(p){return this.attempt('attemptSecondFactor',p);},
 async attempt(name,p){calls.push([name,p]);if(p.code!=='424242')throw {errors:[{message:'Incorrect code'}]};this.status='complete';this.createdSessionId='sess_1';return this;}};
const clerk={loaded:true,client:{signIn}};
export const useClerk=()=>clerk;export const useOAuth=()=>({startOAuthFlow:async()=>({})});`,
 web:`export const maybeCompleteAuthSession=()=>{};export const openAuthSessionAsync=async()=>({type:'cancel'});`,
 api:`export const api={post:async()=>({data:{}}),get:async()=>({data:{}})};export const API_BASE_URL=location.origin;`,
 auth:`window.syncs=0;export const useAuthSession=()=>({syncWithBackend:async()=>{window.syncs++;return {id:'user-1'};}});`,
 userApi:`export class UserApiError extends Error{}`,
 clerkAuth:`export const isAlreadySignedInError=()=>false;
export const activateClerkSession=async(_clerk,id)=>{window.calls.push(['activate',id]);};
export const completeOAuthSession=async()=>{};export const startWebOAuthRedirect=async()=>false;`,
 enabled:`export const CLERK_SETUP_MESSAGE='setup';export const useClerkEnabled=()=>true;`,
 session:`export const getLastAuthProvider=async()=>null;export const setLastAuthProvider=async()=>{};export const setPendingAuthProvider=async()=>{};`,
 icons:`export const Ionicons=()=>null;`,
};
const bundle=await build({stdin:{contents:entry,loader:'tsx',resolveDir:root},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"test"',__DEV__:'true'},alias:{'react-native':'react-native-web'},plugins:[{name:'external-surfaces',setup(b){
 const rules=[[/^@clerk\/expo$/,'clerk'],[/^expo-web-browser$/,'web'],[/^@\/lib\/api$/,'api'],[/AuthSessionProvider$/,'auth'],[/auth\/userApi$/,'userApi'],[/lib\/clerkAuth$/,'clerkAuth'],[/lib\/clerkEnabled$/,'enabled'],[/lib\/session$/,'session'],[/^@expo\/vector-icons$/,'icons']];
 for(const [filter,id] of rules)b.onResolve({filter},()=>({path:id,namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},({path:p})=>({contents:stubs[p],resolveDir:root,loader:'tsx'}));
}}]});
const server=createServer((req,res)=>{
 if(req.url==='/bundle.js'){res.setHeader('content-type','text/javascript');res.end(bundle.outputFiles[0].text);return;}
 res.setHeader('content-type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
});
server.listen(0,'127.0.0.1');await once(server,'listening');const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'msedge',headless:true});const checks=[];
const names=calls=>calls.map(([name])=>name);
try{
 for(const status of ['needs_client_trust','needs_second_factor','needs_first_factor']){
  const first=status==='needs_first_factor';const prepare=first?'prepareFirstFactor':'prepareSecondFactor',attempt=first?'attemptFirstFactor':'attemptSecondFactor';
  const page=await browser.newPage({viewport:{width:480,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'?status='+status);
  await page.getByPlaceholder('Enter your email address').fill('Student@Example.com');await page.getByPlaceholder('Enter your password').fill('Correct-horse-1!');
  await page.getByText('Sign in',{exact:true}).click();
  // Correct password, but Clerk asks for a second step: the code step renders and a code is requested.
  await expect(page.getByText('Check your email',{exact:true})).toBeVisible();await expect(page.getByPlaceholder('6-digit code')).toBeVisible();
  await expect(page.getByText('Enter the code sent to student@example.com',{exact:true}).first()).toBeVisible();
  await expect(page.getByText('Sign-in could not be completed. Try again.')).toHaveCount(0);
  assert.deepEqual(names(await page.evaluate(()=>window.calls)),['create',prepare]);
  assert.deepEqual((await page.evaluate(()=>window.calls))[1][1],{strategy:'email_code',emailAddressId:'idn_1'});
  await page.screenshot({path:path.join(out,status+'-code-step.png')});
  // Resend asks Clerk for another code and says so.
  await page.getByText('Resend code',{exact:true}).click();
  await expect(page.getByText('We sent a new code to student@example.com',{exact:true})).toBeVisible();
  assert.deepEqual(names(await page.evaluate(()=>window.calls)),['create',prepare,prepare]);
  // Short codes cannot be submitted; a wrong code shows Clerk's message and stays on the step.
  await page.getByPlaceholder('6-digit code').fill('123');await expect(page.getByText('Verify email',{exact:true})).toBeVisible();
  assert.equal((await page.evaluate(()=>window.calls)).some(([name])=>name===attempt),false);
  await page.getByPlaceholder('6-digit code').fill('111111');await page.getByText('Verify email',{exact:true}).click();
  await expect(page.getByText('Incorrect code',{exact:true})).toBeVisible();await expect(page.getByText('Check your email',{exact:true})).toBeVisible();
  assert.equal(await page.evaluate(()=>window.calls.some(([name])=>name==='activate')),false);assert.equal(await page.evaluate(()=>window.modalClosed),false);
  await page.screenshot({path:path.join(out,status+'-wrong-code.png')});
  // The right code completes sign-in: session activated, backend synced, caller notified, modal closed.
  await page.getByPlaceholder('6-digit code').fill('424242');await page.getByText('Verify email',{exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.successId)).toBe('user-1');
  const calls=await page.evaluate(()=>window.calls);assert.deepEqual(names(calls),['create',prepare,prepare,attempt,attempt,'activate']);assert.deepEqual(calls.at(-1),['activate','sess_1']);
  assert.equal(await page.evaluate(()=>window.syncs),1);await expect.poll(()=>page.evaluate(()=>window.modalClosed)).toBe(true);await expect(page.getByText('Check your email',{exact:true})).toHaveCount(0);
  assert.deepEqual(errors,[]);await page.close();
  checks.push(status+': code step renders; send, resend, wrong code and success all behave');
 }
 await writeFile(path.join(out,'result.json'),JSON.stringify({checks},null,2));console.log(JSON.stringify({checks},null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}

import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from '../../backend/node_modules/esbuild/lib/main.js';
import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import axios from 'axios';
const root=path.resolve(import.meta.dirname,'..');await mkdir(path.join(root,'.expo'),{recursive:true});
const outfile=path.join(root,'.expo/auth-request-recovery.mjs');
await build({stdin:{contents:"export * from './lib/api';export * from './lib/clerkAuth';",resolveDir:root,loader:'ts'},outfile,bundle:true,platform:'node',format:'esm',external:['axios'],plugins:[{name:'platform',setup(b){b.onResolve({filter:/^(react-native|expo-constants)$/},a=>({path:a.path,namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:"export const Platform={OS:'web'};export default {};"}));}}]});
const {api,setAuthTokenGetter,getFreshClerkToken}=await import(pathToFileURL(outfile));
const expiry=Math.floor(Date.now()/1000)+120;
const jwt=(sub,tag)=>'header.'+Buffer.from(JSON.stringify({sub,exp:expiry,tag})).toString('base64url')+'.signature';
const denied=config=>new axios.AxiosError('Unauthorized','ERR_BAD_REQUEST',config,undefined,{status:401,statusText:'Unauthorized',data:{error:{message:'Session expired'}},headers:{},config});
test('forced refresh bypasses a still-fresh but rejected cached token',async()=>{
 const calls=[];const token=await getFreshClerkToken({getToken:async options=>{calls.push(options.skipCache);return jwt('owner',options.skipCache?'fresh':'cached');}},true);
 assert.deepEqual(calls,[true]);assert.equal(token,jwt('owner','fresh'));
});
test('401 upload refreshes once and reuses the same multipart body',async()=>{
 const calls=[];const tokens=[];const form=new FormData();form.append('photos',new Blob(['photo']), 'photo.jpg');
 setAuthTokenGetter(async force=>{tokens.push(Boolean(force));return jwt('owner',force?'fresh':'cached');});
 api.defaults.adapter=async config=>{calls.push(config);if(calls.length===1)throw denied(config);return {status:200,statusText:'OK',headers:{},data:{ok:true},config};};
 await api.post('/api/listings/photos',form,{transformRequest:body=>body});
 assert.equal(calls.length,2);assert.deepEqual(tokens,[false,true]);assert.equal(calls[0].data,form);assert.equal(calls[1].data,form);assert.equal(calls[1].headers.get('Authorization'),'Bearer '+jwt('owner','fresh'));
});
test('persistent rejection stops after one retry',async()=>{
 let calls=0;setAuthTokenGetter(async()=>jwt('owner','invalid'));api.defaults.adapter=async config=>{calls++;throw denied(config);};
 await assert.rejects(()=>api.get('/api/listings/mine'));assert.equal(calls,2);
});
test('no token or changed account never replays a pending write',async()=>{
 for(const next of [null,jwt('other','fresh')]){let calls=0;setAuthTokenGetter(async force=>force?next:jwt('owner','old'));api.defaults.adapter=async config=>{calls++;throw denied(config);};
 await assert.rejects(()=>api.post('/api/listings/photos','body'));assert.equal(calls,1);}
});
test('non-auth failures never retry a write',async()=>{
 let calls=0;setAuthTokenGetter(async()=>jwt('owner','fresh'));api.defaults.adapter=async config=>{calls++;const e=denied(config);e.response.status=503;throw e;};
 await assert.rejects(()=>api.post('/api/listings/publish-units',{}));assert.equal(calls,1);
});

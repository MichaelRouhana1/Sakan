import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import path from 'node:path';
import {build} from '../../backend/node_modules/esbuild/lib/main.js';
const root=path.resolve(import.meta.dirname,'..');
async function runtime(dev,failStorage=false){
 const {outputFiles}=await build({stdin:{resolveDir:root,loader:'ts',contents:"export {readGuestRecents,writeGuestRecents} from './features/search/recentSearchStorage';export {searchDebug} from './features/search/searchDebug';"},bundle:true,write:false,format:'iife',globalName:'SearchDiagnostics',minify:true,define:{__DEV__:String(dev)},plugins:[{name:'native-storage',setup(b){
  b.onResolve({filter:/^(react-native|@react-native-async-storage\/async-storage)$/},a=>({path:a.path,namespace:'native-storage'}));
  b.onLoad({filter:/.*/,namespace:'native-storage'},a=>({contents:a.path==='react-native'?"export const Platform={OS:'ios'};":"export default {getItem:async()=>{if(globalThis.failStorage)throw new Error('read denied');return globalThis.savedRaw??null},setItem:async(key,raw)=>{if(globalThis.failStorage)throw new Error('write denied');globalThis.savedRaw=raw}};"}));
 }}]});
 const calls=[];const context=vm.createContext({failStorage,console:{log:(...args)=>calls.push(args),warn:(...args)=>calls.push(args),error:(...args)=>calls.push(args)}});
 vm.runInContext(outputFiles[0].text,context);
 return {api:context.SearchDiagnostics,context,calls,code:outputFiles[0].text};
}
test('production search diagnostics emit nothing, including storage failures',async()=>{
 for(const failStorage of [false,true]){
  const {api,context,calls,code}=await runtime(false,failStorage);
  api.searchDebug('sheet.open',{recents:[]});await api.readGuestRecents();await api.writeGuestRecents([]);
  assert.deepEqual(calls,[]);assert.equal(context.__STUDENTLY_SEARCH_TRACE__,undefined);assert.equal(context.__STUDENTLY_SEARCH_STATE__,undefined);
  assert.ok(!code.includes('[search-recents]'));
 }
});
test('development diagnostics retain storage values and error details',async()=>{
 const {api,calls}=await runtime(true);await api.writeGuestRecents([]);await api.readGuestRecents();
 const entries=calls.map(args=>JSON.parse(args[1]));assert.ok(entries.some(e=>e.event==='storage.write'&&e.key==='studently.search.recents.v1'&&e.value==='{"version":1,"items":[]}'));
 assert.ok(entries.some(e=>e.event==='storage.read'&&e.adapter==='AsyncStorage'));
 const failed=await runtime(true,true);await failed.api.readGuestRecents();await failed.api.writeGuestRecents([]);
 assert.ok(failed.calls.some(args=>JSON.parse(args[1]).event==='storage.read.error'));assert.ok(failed.calls.some(args=>JSON.parse(args[1]).event==='storage.write.error'));
});

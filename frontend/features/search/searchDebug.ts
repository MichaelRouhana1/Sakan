import {Platform} from 'react-native';
type DebugGlobal=typeof globalThis&{__STUDENTLY_SEARCH_TRACE__?:unknown[];__STUDENTLY_SEARCH_STATE__?:unknown};
export function searchDebug(event:string,data:Record<string,unknown>={}) {
 if(typeof __DEV__==='undefined'||!__DEV__)return;
 const entry={time:new Date().toISOString(),revision:'mobile-polish-20261120',platform:Platform.OS,event,...data};
 const root=globalThis as DebugGlobal;(root.__STUDENTLY_SEARCH_TRACE__??=[]).push(entry);
 if(root.__STUDENTLY_SEARCH_TRACE__!.length>300)root.__STUDENTLY_SEARCH_TRACE__!.shift();
 if(event==='provider.state'||event==='sheet.open')root.__STUDENTLY_SEARCH_STATE__=entry;
 console.log('[search-recents]',JSON.stringify(entry));
}
export function searchDebugError(error:unknown) {
 const x=error as {name?:string;message?:string;response?:{status?:number;data?:unknown};code?:string};
 return {name:x?.name,message:x?.message??String(error),code:x?.code,status:x?.response?.status,body:x?.response?.data};
}

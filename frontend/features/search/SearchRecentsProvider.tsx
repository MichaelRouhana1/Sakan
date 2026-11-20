import {searchDebug,searchDebugError} from './searchDebug';
import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { SearchRecentsContext } from './useSearchRecents';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOptionalAuthSession } from '@/features/auth/AuthSessionProvider';
import { Platform } from 'react-native';
import { api,API_BASE_URL } from '@/lib/api';
import { prependRecent, RECENT_SEARCH_KEY } from './recentSearches';
import { readGuestRecents, writeGuestRecents, guestStorageIsPersistent } from './recentSearchStorage';
import type { SearchSuggestion } from './types';
const queues=new Map<string,Promise<unknown>>();
function serial<T>(scope:string,work:()=>Promise<T>):Promise<T> {
  const next=(queues.get(scope)??Promise.resolve()).catch(()=>{}).then(work);
  queues.set(scope,next);
  void next.finally(()=>{if(queues.get(scope)===next)queues.delete(scope);}).catch(()=>{});
  return next;
}
function useSearchRecentsState() {
  const auth=useOptionalAuthSession();
  const userId=auth?.isSignedIn?(auth.user?.id??auth.session?.userId):null;
  const pending=auth?.isLoading||Boolean(auth?.hasClerkSession&&!userId);
  const scope=pending?'pending':userId?`account:${userId}`:'guest';
  const client=useQueryClient();
  const deferred=useRef<SearchSuggestion[]>([]),version=useRef(0);
  const [persistenceError,setPersistenceError]=useState(false);
  const active=useRef({scope,controller:new AbortController()});
  if(active.current.scope!==scope){active.current.controller.abort();active.current={scope,controller:new AbortController()};}
  const key=['search','recents',scope] as const;
  const query=useQuery({queryKey:key,enabled:scope!=='pending',staleTime:0,retry:false,
    queryFn:async({signal}):Promise<SearchSuggestion[]>=>{
      await (queues.get(scope)??Promise.resolve()).catch(()=>{});
      if(signal.aborted)throw new Error('Superseded recent search read');
      if(userId){searchDebug('account.GET.start',{url:API_BASE_URL+'/api/search/recents'});try {const response=await api.get<{data:SearchSuggestion[]}>('/api/search/recents',{signal});searchDebug('account.GET',{status:response.status,body:response.data});return response.data.data;}catch(error){searchDebug('account.GET.error',searchDebugError(error));throw error;}}
      const items=await readGuestRecents();
      if(active.current.scope===scope)setPersistenceError(!guestStorageIsPersistent());
      return items;
    }});
  useEffect(()=>{
    if(scope!=='guest'||Platform.OS!=='web'||typeof window==='undefined')return;
    const sync=(e:StorageEvent)=>{if(e.key===RECENT_SEARCH_KEY||e.key===null)void client.invalidateQueries({queryKey:key});};
    window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);
  },[scope,client]);
  const remember=useCallback((item:SearchSuggestion)=>{
    searchDebug('provider.remember',{scope,id:item.id,url:item.url});
    if(scope==='pending'){deferred.current=prependRecent(deferred.current,item);searchDebug('provider.deferred',{items:deferred.current});return;}
    const signal=active.current.controller.signal,selectionVersion=++version.current;
    // A slow AsyncStorage read from opening the sheet must not erase a selection.
    void client.cancelQueries({queryKey:key,exact:true},{revert:false});
    client.setQueryData<SearchSuggestion[]>(key,old=>prependRecent(old??[],item));
    void serial(scope,async()=>{
      if(signal.aborted||active.current.scope!==scope)return;
      let items:SearchSuggestion[];
      if(userId){searchDebug('account.POST.start',{url:API_BASE_URL+'/api/search/recents',body:{type:item.type,id:item.id}});try{const response=await api.post<{data:SearchSuggestion[]}>('/api/search/recents',{type:item.type,id:item.id},{signal});searchDebug('account.POST',{status:response.status,body:response.data});items=response.data.data;}catch(error){searchDebug('account.POST.error',searchDebugError(error));throw error;}}
      else {
        items=prependRecent(await readGuestRecents(),item);
        if(signal.aborted||active.current.scope!==scope)return;
        const persisted=await writeGuestRecents(items);
        if(active.current.scope===scope)setPersistenceError(!persisted);
      }
      if(!signal.aborted&&active.current.scope===scope&&version.current===selectionVersion)client.setQueryData(key,items);
    }).catch(error=>{searchDebug('provider.save.error',{scope,...searchDebugError(error)});if(active.current.scope===scope)void client.invalidateQueries({queryKey:key});});
  },[scope,userId,client]);
  useEffect(()=>{
    if(scope==='pending'||!deferred.current.length)return;
    const selections=deferred.current.slice().reverse();deferred.current=[];
    for(const item of selections)remember(item);
  },[scope,remember]);
  const clear=useCallback(()=>{
    deferred.current=[];
    if(scope==='pending')return;
    const signal=active.current.controller.signal,clearVersion=++version.current;
    void client.cancelQueries({queryKey:key,exact:true},{revert:false});
    client.setQueryData(key,[]);
    return serial(scope,async()=>{
      if(signal.aborted||active.current.scope!==scope)return;
      if(userId)await api.delete('/api/search/recents',{signal});else {const persisted=await writeGuestRecents([]);if(active.current.scope===scope)setPersistenceError(!persisted);}
      if(!signal.aborted&&active.current.scope===scope&&version.current===clearVersion)client.setQueryData(key,[]);
    });
  },[scope,userId,client]);
  useEffect(()=>{searchDebug('provider.state',{scope,pending,apiBaseUrl:API_BASE_URL,items:query.data??[],isError:query.isError,persistenceError});},[scope,pending,query.data,query.isError,persistenceError]);
  useEffect(()=>{searchDebug('provider.mount',{apiBaseUrl:API_BASE_URL});return()=>searchDebug('provider.unmount');},[]);
  return {providerReady:true,items:scope==='pending'?[]:query.data??[],remember,clear,isError:query.isError,persistenceError:scope==='guest'&&persistenceError,retry:()=>{if(scope!=='pending')return query.refetch();}};
}

/** Kept above navigation so selected destinations persist across route changes. */
export function SearchRecentsProvider({children}:{children:ReactNode}) {
  const value=useSearchRecentsState();
  return <SearchRecentsContext.Provider value={value}>{children}</SearchRecentsContext.Provider>;
}

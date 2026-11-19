import React, { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { SearchRecentsContext } from './useSearchRecents';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOptionalAuthSession } from '@/features/auth/AuthSessionProvider';
import { api } from '@/lib/api';
import { prependRecent, RECENT_SEARCH_KEY } from './recentSearches';
import { readGuestRecents, writeGuestRecents } from './recentSearchStorage';
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
  const active=useRef({scope,controller:new AbortController()});
  if(active.current.scope!==scope){active.current.controller.abort();active.current={scope,controller:new AbortController()};}
  const key=['search','recents',scope] as const;
  const query=useQuery({queryKey:key,enabled:scope!=='pending',staleTime:0,retry:false,
    queryFn:async({signal}):Promise<SearchSuggestion[]>=>userId?(await api.get<{data:SearchSuggestion[]}>('/api/search/recents',{signal})).data.data:readGuestRecents()});
  useEffect(()=>{
    if(scope!=='guest'||typeof window==='undefined')return;
    const sync=(e:StorageEvent)=>{if(e.key===RECENT_SEARCH_KEY||e.key===null)void client.invalidateQueries({queryKey:key});};
    window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);
  },[scope,client]);
  const remember=useCallback((item:SearchSuggestion)=>{
    if(scope==='pending')return;
    const signal=active.current.controller.signal;
    void serial(scope,async()=>{
      if(signal.aborted||active.current.scope!==scope)return;
      let items:SearchSuggestion[];
      if(userId)items=(await api.post<{data:SearchSuggestion[]}>('/api/search/recents',{type:item.type,id:item.id},{signal})).data.data;
      else {
        items=prependRecent(await readGuestRecents(),item);
        if(signal.aborted||active.current.scope!==scope)return;
        await writeGuestRecents(items);
      }
      if(!signal.aborted&&active.current.scope===scope)client.setQueryData(key,items);
    }).catch(()=>{if(active.current.scope===scope)void client.invalidateQueries({queryKey:key});});
  },[scope,userId,client]);
  const clear=useCallback(()=>{
    if(scope==='pending')return;
    const signal=active.current.controller.signal;
    return serial(scope,async()=>{
      if(signal.aborted||active.current.scope!==scope)return;
      if(userId)await api.delete('/api/search/recents',{signal});else await writeGuestRecents([]);
      if(!signal.aborted&&active.current.scope===scope)client.setQueryData(key,[]);
    });
  },[scope,userId,client]);
  return {items:scope==='pending'?[]:query.data??[],remember,clear,isError:query.isError,retry:()=>{if(scope!=='pending')return query.refetch();}};
}

/** Kept above navigation so selected destinations persist across route changes. */
export function SearchRecentsProvider({children}:{children:ReactNode}) {
  const value=useSearchRecentsState();
  return <SearchRecentsContext.Provider value={value}>{children}</SearchRecentsContext.Provider>;
}

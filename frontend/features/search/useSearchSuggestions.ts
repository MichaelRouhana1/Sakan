import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CanceledError } from 'axios';
import { api } from '@/lib/api';
import type { SearchSuggestResult } from './types';

export const searchKeys={all:['search'] as const,suggestions:(q:string)=>['search','suggest',q] as const};
function searchLength(value:string) {
  return [...value.normalize('NFKC').replace(/[\p{M}\u0640\u200b-\u200f\ufeff]/gu,'')].length;
}
export function useDebouncedValue<T>(value:T,delayMs:number):T {
  const [debounced,setDebounced]=useState(value);
  useEffect(()=>{const timer=setTimeout(()=>setDebounced(value),delayMs);return()=>clearTimeout(timer);},[value,delayMs]);
  return debounced;
}
export function useSearchSuggestions(query:string,enabled=true) {
  const raw=query.trim();
  const length=searchLength(raw);
  const debounced=useDebouncedValue(raw,200);
  const requestQuery=length<2 ? '' : debounced;
  const current=useRef(raw);
  current.current=raw;
  const settled=length<2 || raw===debounced;
  const result=useQuery({
    queryKey:searchKeys.suggestions(requestQuery),enabled:enabled&&settled,
    staleTime:requestQuery ? 60_000 : 300_000,retry:false,
    queryFn:async({signal}):Promise<SearchSuggestResult>=>{
      const {data}=await api.get<{data:SearchSuggestResult}>('/api/search/suggest',{params:{q:requestQuery},signal});
      const latest=searchLength(current.current)<2 ? '' : current.current;
      if(signal.aborted || requestQuery!==latest) throw new CanceledError('Superseded search');
      return data.data;
    },
  });
  return {...result,data:enabled&&settled ? result.data : undefined,
    isFetching:result.isFetching || (enabled && length>=2 && !settled)};
}

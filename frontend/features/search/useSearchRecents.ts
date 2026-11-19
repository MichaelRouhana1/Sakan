import { createContext, useContext } from 'react';
import type { SearchSuggestion } from './types';
export type SearchRecentsState = {
 items:SearchSuggestion[];remember:(item:SearchSuggestion)=>void;clear:()=>Promise<unknown>|void;
 isError:boolean;retry:()=>unknown;
};
export const SearchRecentsContext=createContext<SearchRecentsState>({items:[],remember:()=>{},clear:()=>{},isError:false,retry:()=>{}});
export function useSearchRecents(){return useContext(SearchRecentsContext);}

import {searchDebug,searchDebugError} from './searchDebug';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { RECENT_SEARCH_KEY, parseRecentSearches } from './recentSearches';
import type { SearchSuggestion } from './types';
let memory:SearchSuggestion[]=[],storageUnavailable=false;
export async function readGuestRecents() {
  if(storageUnavailable)return memory;
  try {const raw=Platform.OS==='web' ? window.localStorage.getItem(RECENT_SEARCH_KEY) : await AsyncStorage.getItem(RECENT_SEARCH_KEY);searchDebug('storage.read',{key:RECENT_SEARCH_KEY,adapter:Platform.OS==='web'?'localStorage':'AsyncStorage',value:raw});return parseRecentSearches(raw);}
  catch(error){searchDebug('storage.read.error',{key:RECENT_SEARCH_KEY,...searchDebugError(error)});storageUnavailable=true;return memory;}
}
export async function writeGuestRecents(items:SearchSuggestion[]) {
  memory=items;
  const raw=JSON.stringify({version:1,items});
  try {if(Platform.OS==='web')window.localStorage.setItem(RECENT_SEARCH_KEY,raw);
  else await AsyncStorage.setItem(RECENT_SEARCH_KEY,raw);storageUnavailable=false;searchDebug('storage.write',{key:RECENT_SEARCH_KEY,adapter:Platform.OS==='web'?'localStorage':'AsyncStorage',value:raw});return true;}
  catch(error){searchDebug('storage.write.error',{key:RECENT_SEARCH_KEY,value:raw,...searchDebugError(error)});storageUnavailable=true;return false;}
}

export const guestStorageIsPersistent=()=>!storageUnavailable;

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { RECENT_SEARCH_KEY, parseRecentSearches } from './recentSearches';
import type { SearchSuggestion } from './types';
let memory:SearchSuggestion[]=[],storageUnavailable=false;
export async function readGuestRecents() {
  if(storageUnavailable)return memory;
  try {return parseRecentSearches(Platform.OS==='web' ? window.localStorage.getItem(RECENT_SEARCH_KEY) : await AsyncStorage.getItem(RECENT_SEARCH_KEY));}
  catch{storageUnavailable=true;return memory;}
}
export async function writeGuestRecents(items:SearchSuggestion[]) {
  memory=items;
  const raw=JSON.stringify({version:1,items});
  try {if(Platform.OS==='web')window.localStorage.setItem(RECENT_SEARCH_KEY,raw);
  else await AsyncStorage.setItem(RECENT_SEARCH_KEY,raw);}
  catch {storageUnavailable=true;/* Storage may be disabled; retain this session without blocking navigation. */}
}

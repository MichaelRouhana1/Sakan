import {searchDebug} from '@/features/search/searchDebug';
import {searchDestination} from '@/features/search/selection';
import {API_BASE_URL} from '@/lib/api';
import React, { useEffect, useState } from 'react';
import { Platform, useWindowDimensions, type TextInputProps, type StyleProp, type ViewStyle } from 'react-native';
import type { SearchSuggestion } from '@/features/search/types';
import { useSearchRecents } from '@/features/search/useSearchRecents';
import { DesktopSearchAutocomplete } from './DesktopSearchAutocomplete';
import { MobileSearchAutocomplete } from './MobileSearchAutocomplete';

export type SearchAutocompleteProps = {
  /** Desktop host visibility; ignored by the mobile/native renderer. */
  desktopActive?: boolean;
  /** Closed desktop launcher label; independent of the editable draft. */
  desktopSelectionLabel?: string;
  recentSuggestions?: SearchSuggestion[];
  onOpenSearch?: () => void;
  onClearRecents?: () => void;
  recentPersistenceError?: boolean;
  recentsError?: boolean;
  onRetryRecents?: () => void;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  suggestionsEnabled?: boolean;
  onSelect: (suggestion: SearchSuggestion) => void;
  onSubmitText: (q: string) => void;
  onClear: () => void;
  autoFocus?: boolean;
  style?: TextInputProps["style"];
  containerStyle?: object;
  barStyle?: StyleProp<ViewStyle>;
  variant?: "pill" | "bar";
};

export function SearchAutocomplete(props: SearchAutocompleteProps) {
  const {width}=useWindowDimensions();
  const [desktop,setDesktop]=useState(false);
  useEffect(()=>setDesktop(Platform.OS==='web'&&width>=900),[width]);
  const recents=useSearchRecents();
  const [clearError,setClearError]=useState(false);
  const connected={...props,recentSuggestions:props.recentSuggestions??recents.items,
    onOpenSearch:()=>{searchDebug('sheet.open',{apiBaseUrl:API_BASE_URL,providerReady:!!recents.providerReady,recents:recents.items,persistenceError:recents.persistenceError});props.onOpenSearch?.();recents.retry();},
    onSelect:(item:SearchSuggestion)=>{searchDebug('select.handler',{destination:searchDestination(item),item,apiBaseUrl:API_BASE_URL,providerReady:!!recents.providerReady});recents.remember(item);searchDebug('select.navigate',{destination:searchDestination(item)});props.onSelect(item);},
    onClearRecents:()=>{setClearError(false);void Promise.resolve(recents.clear()).catch(()=>setClearError(true));},
    recentPersistenceError:recents.persistenceError,recentsError:recents.isError||clearError,onRetryRecents:()=>{setClearError(false);recents.retry();}};
  return desktop?<DesktopSearchAutocomplete {...connected}/>:<MobileSearchAutocomplete {...connected}/>;
}

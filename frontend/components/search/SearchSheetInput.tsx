import React, {forwardRef} from 'react';
import {TextInput} from 'react-native';
import {Studently} from '@/constants/theme';
import type {SearchSheetInputHandle,SearchSheetInputProps} from './SearchSheetInput.types';
export const SearchSheetInput=forwardRef<SearchSheetInputHandle,SearchSheetInputProps>(function SearchSheetInput({value,onChangeText,onSubmit,onKeyboard,arabic,onFocus,onBlur},ref){
 return <TextInput ref={ref as React.Ref<TextInput>} accessibilityLabel="Search" accessibilityRole="combobox" value={value} onChangeText={onChangeText}
 placeholder="Search city, area, university or property" placeholderTextColor="#667085" autoCorrect={false} autoCapitalize="none" spellCheck={false} returnKeyType="search"
 onFocus={onFocus} onBlur={onBlur} onKeyPress={onKeyboard} onSubmitEditing={onSubmit}
 style={{flex:1,minWidth:0,height:40,paddingHorizontal:10,paddingVertical:0,fontFamily:Studently.type.body,fontSize:14,color:'#111928',textAlign:arabic?'right':'left',writingDirection:arabic?'rtl':'ltr'}}/>;
});

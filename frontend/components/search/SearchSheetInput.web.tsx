import React, {forwardRef} from 'react';
import type {SearchSheetInputHandle,SearchSheetInputProps} from './SearchSheetInput.types';
export const SearchSheetInput=forwardRef<SearchSheetInputHandle,SearchSheetInputProps>(function SearchSheetInput({value,onChangeText,onSubmit,onKeyboard,onComposing,listId,activeId,arabic},ref){
 return <><style>{'.sms-field::placeholder{color:#667085;opacity:1}'}</style><input ref={ref as React.Ref<HTMLInputElement>} className="sms-field" aria-label="Search" role="combobox" aria-expanded="true" aria-controls={listId} aria-activedescendant={activeId} aria-autocomplete="list"
  value={value} placeholder="City, area, university or property" autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} enterKeyHint="search" dir={arabic?'rtl':'ltr'}
  onChange={event=>onChangeText(event.target.value)} onCompositionStart={()=>onComposing(true)} onCompositionEnd={()=>onComposing(false)}
  onKeyDown={event=>{onKeyboard(event);if(event.key==='Enter'&&!event.nativeEvent.isComposing){event.preventDefault();onSubmit();}}}
  style={{flex:1,minWidth:0,height:40,padding:'0 14px',fontFamily:'DMSans_400Regular, "DM Sans", sans-serif',fontSize:14,lineHeight:'20px',color:'#111928',background:'transparent',border:0,outline:0,borderRadius:24}}/></>;
});

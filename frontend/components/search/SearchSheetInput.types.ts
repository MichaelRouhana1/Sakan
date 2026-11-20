export type SearchSheetInputHandle={focus:()=>void;blur:()=>void};
export type SearchSheetInputProps={
 value:string;onChangeText:(value:string)=>void;onSubmit:()=>void;onKeyboard:(event:any)=>void;
 onComposing:(composing:boolean)=>void;onFocus?:()=>void;onBlur?:()=>void;listId:string;activeId?:string;arabic:boolean;
};

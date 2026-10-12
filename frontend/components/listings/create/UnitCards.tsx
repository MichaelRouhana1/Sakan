import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { LText } from '@/components/lister/Typography';
import { Lister } from '@/constants/listerTheme';
import { CreateListingContext, useCreateListingDraft } from '@/features/listings/create/CreateListingProvider';
import { countUnits, unitDraft } from '@/features/listings/create/unitDrafts';
import { stepFieldErrors } from '@/features/listings/create/validators';
import { PhotoPickerGrid } from '../PhotoPickerGrid';
import { CreateStepSpecs } from './CreateStepSpecs';
import { CreateStepPricing } from './CreateStepPricing';
import { CreateStepCopy } from './CreateStepCopy';

export function UnitScope({index,children}:{index:number;children:ReactNode}) {
 const parent=useCreateListingDraft();
 const draft=unitDraft(parent.draft,index);
 const errors=[2,5,6,7].flatMap(step=>stepFieldErrors(draft,step,true));
 return <CreateListingContext.Provider value={{...parent,draft,
  patch:patch=>parent.patchUnit?.(index,patch),
  setPhotos:updater=>parent.setGallery?.(index,updater),
  fieldErrors:errors,fieldInvalid:field=>parent.showValidation&&errors.includes(field),
 }}>{children}</CreateListingContext.Provider>;
}
function UnitFields(){
 const {draft,setPhotos}=useCreateListingDraft();
 return <View style={{gap:28}}>
  <CreateStepSpecs showSharedDetails={false} />
  <PhotoPickerGrid photos={draft.photos} setPhotos={setPhotos}/>
  <CreateStepPricing />
  <CreateStepCopy />
 </View>;
}
export function SharedGallery(){
 const {draft,setGallery}=useCreateListingDraft();
 if(draft.existingPlaceId)return <LText tone="muted">Shared photos are saved with this {draft.placeKind === 'building'?'building':'apartment'}.</LText>;
 return <PhotoPickerGrid shared photos={draft.sharedPhotos??[]} setPhotos={u=>setGallery?.('shared',u)}/>;
}
export function UnitCards(){
 const {draft,showValidation}=useCreateListingDraft();
 const [open,setOpen]=useState(0);
 return <View style={{gap:24}}>
  <SharedGallery/>
  {Array.from({length:countUnits(draft)},(_,index)=>{
   const unit=unitDraft(draft,index);
   const errors=[2,5,6,7].flatMap(s=>stepFieldErrors(unit,s,true));
   const label=draft.spaceType==='entire_place'?'Apartment':draft.spaceType==='private_room'?'Room':'Shared room';
   return <View key={index===0?'first':draft.additionalUnits?.[index-1]?.id} style={{borderWidth:1,borderColor:Lister.color.border,borderRadius:16,overflow:'hidden'}}>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:open===index}} onPress={()=>setOpen(open===index?-1:index)} style={{padding:20,backgroundColor:Lister.color.primaryMist,gap:5}}>
     <LText variant="subtitle">{label} {index+1}{unit.title ? ` · ${unit.title}`:''}</LText>
     <LText variant="caption">{unit.photos.length} photos · {unit.monthlyRentUsd ? `$${unit.monthlyRentUsd}/month`:'Add rent'} · {open===index?'Collapse':'Edit unit'}</LText>
     {showValidation&&errors.length>0?<LText tone="danger" variant="caption">Complete this unit’s required details.</LText>:null}
    </Pressable>
    {/* Keep upload callbacks mounted when a card closes. */}
    <View style={{padding:20,display:open===index?'flex':'none'}}><UnitScope index={index}><UnitFields/></UnitScope></View>
   </View>;
  })}
 </View>;
}

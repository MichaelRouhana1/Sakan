import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { api } from '@/lib/api';
import type { Listing } from '@/types/listing';
import { LButton } from '@/components/lister/Button';
import { LText } from '@/components/lister/Typography';
import { CreateListingContext } from '@/features/listings/create/CreateListingProvider';
import { mapListingToDraft } from '@/features/listings/edit/mapListingToDraft';
import { placeToDraft } from '@/features/listings/create/placeToDraft';
import { mapDraftToBody } from '@/features/listings/create/mapDraftToBody';
import { stepFieldErrors } from '@/features/listings/create/validators';
import { CreateStepLocation } from '../create/CreateStepLocation';
import { CreateStepAmenities } from '../create/CreateStepAmenities';
import { CreateStepRules } from '../create/CreateStepRules';
import { PhotoPickerGrid } from '../PhotoPickerGrid';

export function PlaceEditor({listing,onClose}:{listing:Listing;onClose:()=>void}){
 const queryClient=useQueryClient();
 const query=useQuery({queryKey:['owner-place',listing.placeId],queryFn:async()=>{const {data}=await api.get(`/api/listings/places/${listing.placeId}`);return data.data;}});
 const [draft,setDraft]=useState(()=>mapListingToDraft(listing));
 const [expectedUpdatedAt,setExpectedUpdatedAt]=useState<string>();
 const [loaded,setLoaded]=useState(false);const [saving,setSaving]=useState(false);const [error,setError]=useState<string|null>(null);
 useEffect(()=>{if(query.data&&!query.isFetching&&!loaded){setDraft({...mapListingToDraft(listing),...placeToDraft(query.data)});setExpectedUpdatedAt(query.data.updatedAt);setLoaded(true);}},[query.data,query.isFetching,loaded,listing]);
 async function reload(){
  const result=await query.refetch();
  if(result.data&&!result.error){setDraft({...mapListingToDraft(listing),...placeToDraft(result.data)});setExpectedUpdatedAt(result.data.updatedAt);setError(null);}
 }
 const errors=[1,3].flatMap(s=>stepFieldErrors(draft,s,true));
 const photos=draft.sharedPhotos??[];
 async function save(){
  setError(null);setSaving(true);
  try{await api.patch(`/api/listings/places/${listing.placeId}`,{details:mapDraftToBody(draft),photos:photos.map(p=>({url:p.url??p.uri,caption:p.caption??''})),expectedUpdatedAt});
   await queryClient.invalidateQueries({queryKey:['listings']});await queryClient.invalidateQueries({queryKey:['owner-place']});onClose();
  }catch(e){setError(axios.isAxiosError(e)?e.response?.data?.error?.message??'Could not save shared details.':String(e));}finally{setSaving(false);}
 }
 return <View style={{gap:24}}>
  <LButton label="Close shared details" variant="secondary" onPress={onClose}/>
  <LText variant="title">{draft.placeKind==='building'?'Building details':'Apartment details'}</LText>
  <LText tone="muted">Changes apply to units using the shared details. Electricity set differently in a unit stays as you set it there.</LText>
  {query.isError?<><LText tone="danger">Could not load shared details.</LText><LButton label="Retry" onPress={()=>void query.refetch()}/></>:!loaded?<LText>Loading…</LText>:
  <CreateListingContext.Provider value={{draft,patch:p=>setDraft(d=>({...d,...p})),setPhotos:u=>setDraft(d=>({...d,photos:typeof u==='function'?u(d.photos):u})),
   committedStep:8,setStep:()=>{},goNext:()=>false,goBack:()=>{},saveAndExit:async()=>{},reset:async()=>{},showValidation:true,fieldErrors:errors,fieldInvalid:f=>errors.includes(f),setShowValidation:()=>{},
   formChrome:'edit',lockedFields:new Set(['genderRestriction']),isLocked:f=>f==='genderRestriction'}}>
   <CreateStepLocation/><CreateStepAmenities/><CreateStepRules sharedOnly/>
   <PhotoPickerGrid shared photos={photos} setPhotos={u=>setDraft(d=>({...d,sharedPhotos:typeof u==='function'?u(d.sharedPhotos??[]):u}))}/>
   {error?<><LText tone="danger" accessibilityRole="alert">{error}</LText><LButton label="Reload saved shared details" variant="secondary" onPress={()=>void reload()} loading={query.isFetching}/></>:null}
   <LButton label="Save shared details" onPress={()=>void save()} loading={saving} disabled={errors.length>0||photos.some(p=>p.status!=='ready')}/>
  </CreateListingContext.Provider>}
 </View>;
}

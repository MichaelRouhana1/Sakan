import { View } from 'react-native';
import { LText } from '@/components/lister/Typography';
import { SegmentedPills } from '../create/SegmentedPills';
import { useCreateListingDraft } from '@/features/listings/create/CreateListingProvider';
import { SHARED_GROUPS } from '@/features/listings/create/unitDrafts';
import type { CreateListingDraft } from '@/features/listings/create/draft';

export const utilityKeys=[...SHARED_GROUPS.electricity,...SHARED_GROUPS.water,...SHARED_GROUPS.comforts];
export function SharedDetailsChoice({fields=utilityKeys}:{fields?:readonly string[]}){
 const {draft,patch}=useCreateListingDraft();
 if(!draft.sharedValues)return null;
 const different=fields.some(k=>draft.differentFields?.includes(k));
 return <View style={{gap:10,marginBottom:18}}>
  <LText variant="subtitle">{draft.placeKind==='building'?'Building':'Apartment'} details</LText>
  <SegmentedPills options={[{value:'same',label:'Same as building'},{value:'different',label:'Different for this apartment'}]}
    value={different?'different':'same'} onChange={value=>{
      const other=(draft.differentFields??[]).filter(k=>!fields.includes(k));
      const restored=value==='same'?Object.fromEntries(fields.map(k=>[k,draft.sharedValues![k as keyof CreateListingDraft]])):{};
      patch({...restored,differentFields:value==='same'?other:[...other,...fields]});
    }}/>
  {!different?<LText tone="muted">Uses the shared details. Choose “Different for this apartment” to change them here.</LText>:null}
 </View>;
}

import { router } from 'expo-router';
import { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import type { Listing } from '@/types/listing';
import { HostListingGridCard } from './HostListingGridCard';
import { HostListingListView } from './HostListingListView';
import { openListingEdit } from '@/features/listings/edit/openListingEdit';
import { PlaceEditor } from '@/components/listings/edit/PlaceEditor';
import { Lister } from '@/constants/listerTheme';

export function groupHostUnits(listings:Listing[]){
 const groups=new Map<string,Listing[]>();
 for(const unit of listings){const key=unit.placeId ?? unit.id;groups.set(key,[...(groups.get(key)??[]),unit]);}
 return [...groups].map(([id,units])=>({id,units}));
}
export function HostPlaceGroups({listings,layout,compact,onPress}:{listings:Listing[];layout:'grid'|'list';compact:boolean;onPress:(l:Listing)=>void}){
 const [editing,setEditing]=useState<Listing|null>(null);
 return <View style={{gap:32}}>
  {groupHostUnits(listings).map(({id,units})=>{
   const first=units[0];const kind=first.placeKind==='building'?'Building':'Apartment';
   return <View key={id} style={{gap:16}}>
    <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:12,paddingTop:12,borderTopWidth:1,borderColor:Lister.color.border}}>
     <View style={{flexShrink:1,gap:4}}><Text style={{fontFamily:Lister.type.bodySemi,fontSize:20,color:Lister.color.ink}}>{first.buildingName || `${kind} in ${first.area}`}</Text>
      <Text>{kind} · {units.length} unit{units.length===1?'':'s'}</Text></View>
     {first.placeId?<View style={{flexDirection:'row',flexWrap:'wrap',gap:16}}>
      <Pressable accessibilityRole="button" onPress={()=>setEditing(first)} style={{paddingVertical:12}}><Text style={{color:Lister.color.primary}}>Edit shared details</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/(poster)/create',params:{new:'1',placeId:first.placeId}})} style={{paddingVertical:12}}><Text style={{color:Lister.color.primary}}>Add a unit</Text></Pressable>
     </View>:null}
    </View>
    {layout==='list'?<HostListingListView rows={units.map(listing=>({kind:'listing' as const,listing}))} compact={compact}
     onDraftPress={row=>{if(row.kind==='listing')onPress(row.listing);}} onListingPress={onPress} onEditListing={l=>openListingEdit(router,l.id)}/>
     :<View style={{flexDirection:'row',flexWrap:'wrap',gap:16}}>{units.map(unit=><View key={unit.id} style={{width:compact?'100%':240,gap:8}}>
      <HostListingGridCard listing={unit} onPress={()=>onPress(unit)} onEdit={unit.status==='active'?()=>openListingEdit(router,unit.id):undefined}/>
      <Text style={{fontFamily:Lister.type.body,fontSize:13,color:Lister.color.inkMuted}}>{unit.viewCount??0} views · {unit.contactTapCount??0} contact taps</Text>
     </View>)}</View>}
   </View>;
  })}
  <Modal visible={Boolean(editing)} animationType="slide" onRequestClose={()=>setEditing(null)}>
   <ScrollView contentContainerStyle={{padding:24,paddingTop:48,maxWidth:820,width:'100%',alignSelf:'center'}}>
    {editing?<PlaceEditor listing={editing} onClose={()=>setEditing(null)}/>:null}
   </ScrollView>
  </Modal>
 </View>;
}

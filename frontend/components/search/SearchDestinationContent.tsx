import React, {useEffect,useState} from 'react';
import {Image,StyleSheet,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {Studently} from '@/constants/theme';
import {resolveMediaUrl} from '@/lib/mediaUrl';
import type {SearchSuggestion} from '@/features/search/types';
import {searchChipLabel} from './searchDisplay';

/** Shared non-interactive row content: mobile defaults/recents and desktop recents. */
export function SearchDestinationContent({item,recent=false,scale=1}:{item:SearchSuggestion;recent?:boolean;scale?:number}) {
 const location=item.type==='area'||item.type==='city';
 const uri=item.type==='campus'||(location&&item.thumbnailSource!=='curated')?null:resolveMediaUrl(item.thumbnailUrl);
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[uri]);
 const campus=item.type==='campus';
 const count=item.eligibleUnitCount;
 const title=campus?item.label.en.split(/\s+[\u2014\u2013]\s+/)[0]:searchChipLabel(item);
 const subtitle=campus?(Number.isSafeInteger(count)&&Number(count)>0?`${count} place${count===1?'':'s'} nearby`:'No places yet'):recent?item.context.en:count===0?'No places yet':Number.isSafeInteger(count)?`${count} place${count===1?'':'s'}`:'View places';
 const size=56*scale;
 return <View style={[styles.content,{gap:8*scale}]}>
  <View style={[styles.thumbnail,{width:size,height:size,borderRadius:10*scale},campus&&styles.campus]}>
   {uri&&!failed?<Image source={{uri}} resizeMode="cover" onError={()=>setFailed(true)} accessibilityIgnoresInvertColors style={StyleSheet.absoluteFill}/>:<Ionicons name={campus?'school-outline':item.type==='place'?'business-outline':'location-outline'} size={28*scale} color={campus?'#667085':'#c64a56'}/>}
  </View>
  <View style={styles.body}>
   <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.name,{fontSize:16*scale,lineHeight:20*scale}]}>{title}</Text>
   <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.subtitle,{fontSize:14*scale,lineHeight:20*scale}]}>{subtitle}</Text>
  </View>
 </View>;
}
const styles=StyleSheet.create({
 content:{flexDirection:'row',alignItems:'center',width:'100%'},thumbnail:{flexShrink:0,overflow:'hidden',backgroundColor:'#fff1f2',alignItems:'center',justifyContent:'center'},campus:{backgroundColor:'#f3f4f6'},body:{flex:1,minWidth:0,gap:2},
 name:{fontFamily:Studently.type.bodySemi,color:'#182230'},subtitle:{fontFamily:Studently.type.body,color:'#667085'},
});

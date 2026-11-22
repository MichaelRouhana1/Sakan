import {searchDebug} from '@/features/search/searchDebug';
import React, { useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Studently } from '@/constants/theme';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useSearchSuggestions } from '@/features/search/useSearchSuggestions';
import { recentKey } from '@/features/search/recentSearches';
import type { SearchSuggestion } from '@/features/search/types';
import type { SearchAutocompleteProps } from './SearchAutocomplete';
import { SearchDestinationContent } from './SearchDestinationContent';
import { SearchSheetInput } from './SearchSheetInput';
import type { SearchSheetInputHandle } from './SearchSheetInput.types';
import { isNearby, nearbyCountLabel, OSM_ATTRIBUTION, SEARCH_TYPE_LABEL } from './searchDisplay';
const web=Platform.OS==='web';
const icons={city:'location-outline',area:'location-outline',campus:'school-outline',place:'business-outline',street:'trail-sign-outline',hood:'location-outline'} as const;
const words=['City','University','Property'];
function useWord(enabled:boolean,reduced:boolean) {
 const [frame,setFrame]=useState({word:0,count:0,deleting:false});
 useEffect(()=>{
  if(!enabled||reduced)return;
  const text=words[frame.word];
  const delay=frame.deleting?(frame.count?28:400):(frame.count===text.length?2000:55);
  const timer=setTimeout(()=>setFrame(x=>x.deleting?(x.count?{...x,count:x.count-1}:{word:(x.word+1)%words.length,count:0,deleting:false}):(x.count===words[x.word].length?{...x,deleting:true}:{...x,count:x.count+1})),delay);
  return()=>clearTimeout(timer);
 },[enabled,reduced,frame]);
 return reduced?'city, area or university':words[frame.word].slice(0,frame.count);
}
export function MobileSearchAutocomplete({value:launchValue,onSelect,onSubmitText,variant='bar',containerStyle,barStyle,autoFocus,recentSuggestions=[],onClearRecents,recentsError,recentPersistenceError,onRetryRecents,onOpenSearch,suggestionsEnabled=true}:SearchAutocompleteProps) {
 const [value,setValue]=useState('');
 const dimensions=useWindowDimensions(),insets=useContext(SafeAreaInsetsContext)??{top:0,bottom:0,left:0,right:0};
 const [focused,setFocused]=useState(false),[visible,setVisible]=useState(false),[composing,setComposing]=useState(false),[active,setActive]=useState(-1);
 const [viewport,setViewport]=useState({height:dimensions.height,top:0});
 const input=useRef<SearchSheetInputHandle>(null),trigger=useRef<View>(null),scroll=useRef<ScrollView>(null);
 const offset=useRef(new Animated.Value(0)).current,veil=useRef(new Animated.Value(0)).current,closing=useRef(false),historyOwned=useRef(false);
 const grids=useRef<Record<string,ScrollView|null>>({}),gridTargets=useRef<Record<number,{group:string;x:number}>>({}),rowRefs=useRef<Record<number,View|null>>({}),scrollY=useRef(0);
 const reduced=useReducedMotion();
 const id=useId().replace(/[^a-zA-Z0-9_-]/g,'');
 const listId=`mobile-search-${id}`;
 const query=useSearchSuggestions(value,visible&&!composing&&suggestionsEnabled);
 const typed=[...value.trim().normalize('NFKC').replace(/[\p{M}\u0640\u200b-\u200f\ufeff]/gu,'')].length>=2;
 const arabic=/[\u0600-\u06ff]/.test(value);
 const areas=(query.data?.sections.topAreas??[]);
 const campuses=(query.data?.sections.topCampuses??[]);
 const freshDefaults=[...areas,...campuses];
 const recents=recentSuggestions.slice(0,8).map(item=>freshDefaults.find(fresh=>recentKey(fresh)===recentKey(item))??item);
 const items=useMemo(()=>typed?query.data?.results??[]:[...recents,...areas,...campuses],[typed,query.data,recentSuggestions]);
 const word=useWord(!visible&&!launchValue,reduced);
 const open=()=>{closing.current=false;setValue('');setComposing(false);setActive(-1);setVisible(true);onOpenSearch?.();};
 const close=useCallback((after?:()=>void,fromHistory=false)=>{
  if(closing.current)return;closing.current=true;
  Keyboard.dismiss();input.current?.blur();
  let animationDone=false,historyDone=true,completed=false;
  const finish=()=>{
   if(!animationDone||!historyDone||completed)return;completed=true;
   setVisible(false);setFocused(false);setComposing(false);setActive(-1);closing.current=false;
   // Let the router consume popstate before applying a new search destination.
   if(after){if(web)requestAnimationFrame(after);else after();}
   else if(web)setTimeout(()=>{(trigger.current as unknown as HTMLElement)?.focus?.({preventScroll:true});},0);
  };
  if(web&&historyOwned.current&&!fromHistory&&window.history.state?.studentlySearchSheet===id){
   historyDone=false;historyOwned.current=false;
   window.addEventListener('popstate',()=>{historyDone=true;finish();},{once:true});window.history.back();
  }
  Animated.parallel([Animated.timing(offset,{toValue:1,duration:reduced?0:200,easing:Easing.linear,useNativeDriver:!web}),Animated.timing(veil,{toValue:0,duration:reduced?0:300,easing:Easing.inOut(Easing.ease),useNativeDriver:!web})]).start(()=>{animationDone=true;finish();});
 },[reduced,id,offset,veil]);
 const select=(item:SearchSuggestion)=>{searchDebug('select.begin',{id:item.id,closing:closing.current});if(!closing.current)close(()=>{searchDebug('select.afterClose',{id:item.id});onSelect(item);});};
 const submit=()=>{
  if(composing||closing.current)return;
  if(items.length&&(active>=0||typed))select(items[Math.max(0,active)]);
  else close(()=>onSubmitText(value.trim()));
 };
 useEffect(()=>{if(autoFocus)open();},[]);
 useEffect(()=>{setActive(-1);scrollY.current=0;scroll.current?.scrollTo({y:0,animated:false});},[value,query.data,recentSuggestions]);
 useEffect(()=>{
  if(!visible)return;
  offset.setValue(reduced?0:1);veil.setValue(reduced?1:0);
  Animated.timing(veil,{toValue:1,duration:reduced?0:300,easing:Easing.inOut(Easing.ease),useNativeDriver:!web}).start();
  Animated.timing(offset,{toValue:0,duration:reduced?0:200,easing:Easing.linear,useNativeDriver:!web}).start();
  if(!web)return;
  const owner=document.getElementById('studently-web-shell');
  const saved={body:document.body.style.overflow,html:document.documentElement.style.overflow,owner:owner?.style.overflow??''};
  document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden';if(owner)owner.style.overflow='hidden';
  window.history.pushState({...window.history.state,studentlySearchSheet:id},'');historyOwned.current=true;
  const back=()=>{if(window.history.state?.studentlySearchSheet!==id){historyOwned.current=false;close(undefined,true);}};
  const resize=()=>setViewport({height:window.visualViewport?.height??window.innerHeight,top:window.visualViewport?.offsetTop??0});
  resize();window.addEventListener('popstate',back);window.visualViewport?.addEventListener('resize',resize);window.visualViewport?.addEventListener('scroll',resize);
  return()=>{
   document.body.style.overflow=saved.body;document.documentElement.style.overflow=saved.html;if(owner)owner.style.overflow=saved.owner;
   window.removeEventListener('popstate',back);window.visualViewport?.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('scroll',resize);
   if(historyOwned.current&&window.history.state?.studentlySearchSheet===id){historyOwned.current=false;window.history.back();}
  };
 },[visible]);
 useEffect(()=>{
  if(active<0)return;
  if(web){document.getElementById(`${listId}-${active}`)?.scrollIntoView({block:'nearest'});return;}
  const target=gridTargets.current[active];if(target)grids.current[target.group]?.scrollTo({x:target.x,animated:!reduced});
  rowRefs.current[active]?.measureInWindow((_x,y,_w,h)=>scroll.current?.getNativeScrollRef()?.measureInWindow((_sx,sy,_sw,sh)=>{
   const delta=y<sy?y-sy-12:y+h>sy+sh?y+h-sy-sh+12:0;
   if(delta)scroll.current?.scrollTo({y:Math.max(0,scrollY.current+delta),animated:!reduced});
  }));
 },[active,reduced,listId]);
 function keyboard(event:any) {
  const key=event.nativeEvent.key;
  if(composing||event.nativeEvent.isComposing)return;
  if(['ArrowDown','ArrowUp','Home','End','Escape'].includes(key))event.preventDefault?.();
  if(key==='ArrowDown'&&items.length)setActive(x=>Math.min(items.length-1,x+1));
  if(key==='ArrowUp'&&items.length)setActive(x=>Math.max(0,x-1));
  if(key==='Home'&&active>=0)setActive(0);
  if(key==='End'&&active>=0)setActive(items.length-1);
  // Match Amber: Escape resets the phone selection; Back closes the sheet.
  if(key==='Escape'){setActive(-1);input.current?.blur();}
 }
 const option=(item:SearchSuggestion,mode:'typed'|'recent'|'area'|'campus',index:number)=>{
  const selected=index===active;
  return <Pressable key={recentKey(item)} nativeID={`${listId}-${index}`} accessibilityRole="button" accessibilityLabel={`${item.label.en}, ${item.context.en}, ${SEARCH_TYPE_LABEL[item.type]}`} accessibilityState={{selected}}
   {...(web?{'role':'option','aria-selected':selected,dataSet:{searchType:item.type}}:{} as object)}
   ref={node=>{rowRefs.current[index]=node;}}
   onPress={()=>{searchDebug('option.onPress',{type:item.type,id:item.id,url:item.url});select(item);}} style={({pressed})=>[mode==='typed'?styles.row:mode==='recent'?styles.recentRow:styles.gridRow,(pressed||selected)&&styles.selected]}>
    {mode!=='typed'?<SearchDestinationContent item={item} recent={mode==='recent'}/>:<>
     <View style={styles.iconTile}><Ionicons name={icons[item.type]} size={22} color={selected?'#ea3f4a':'#667085'}/></View>
     <View style={styles.rowBody}>
      <Text style={[styles.rowTitle,arabic&&styles.rtl]}>{arabic?item.label.ar:item.label.en}</Text>
      <Text style={[styles.translation,!arabic&&styles.rtl]}>{arabic?item.label.en:item.label.ar}</Text>
      <Text style={styles.context}>{item.context.en} · {item.context.ar}{isNearby(item)?` · ${nearbyCountLabel(item)}`:''}</Text>
     </View>
     <Text style={styles.badge}>{SEARCH_TYPE_LABEL[item.type]}</Text>
    </>}
  </Pressable>;
 };
 function section(title:string,entries:SearchSuggestion[],mode:'recent'|'area'|'campus',start:number) {
  if(!entries.length)return null;
  const half=Math.ceil(entries.length/2),columnWidth=Math.round((dimensions.width-32)*.48);
  return <View style={styles.section} accessibilityLabel={title} {...(web?{role:'group'}:{} as object)}>
   <View style={styles.sectionHead}><Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
    {mode==='recent'&&onClearRecents&&<Pressable accessibilityRole="button" accessibilityLabel="Clear recent searches" onPress={onClearRecents} hitSlop={6} style={styles.clearRecents}><Text style={styles.link}>Clear all</Text></Pressable>}
   </View>
   {mode==='recent'?<View style={styles.recentList}>{entries.map((item,index)=>option(item,mode,start+index))}</View>:
    <ScrollView ref={node=>{grids.current[mode]=node;}} horizontal style={styles.horizontalGrid} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" nestedScrollEnabled directionalLockEnabled contentContainerStyle={styles.gridContent}
     {...(web?{dataSet:{searchGrid:mode}}:{} as object)}>
     {Array.from({length:half},(_,column)=><View key={column} style={{width:columnWidth,gap:12}}>
      {[column,column+half].filter(index=>index<entries.length).map(index=>{gridTargets.current[start+index]={group:mode,x:column*(columnWidth+8)};return option(entries[index],mode,start+index);})}
     </View>)}
    </ScrollView>}
  </View>;
 }
 gridTargets.current={};
 return <>
  <Pressable ref={trigger as any} accessibilityRole="button" accessibilityLabel="Open search" onPress={open} style={[styles.launcher,variant==='pill'?styles.hero:styles.compact,containerStyle,barStyle]}
   {...(web?{dataSet:{mobileSearchLauncher:variant}}:{} as object)}>
   <Text style={[styles.launcherText,variant==='pill'&&styles.heroText]} numberOfLines={1}>{launchValue||(variant==='pill'?`Search by ${word}`:'Search city, area or university')}</Text>
   <View style={[styles.searchAction,variant==='pill'&&styles.heroAction]}><Ionicons name="search" size={variant==='pill'?22:18} color="#fff"/></View>
  </Pressable>
  <Modal accessibilityLabel="Search Lebanon" visible={visible} transparent animationType="none" onRequestClose={()=>{if(web){setActive(-1);input.current?.blur();}else close();}} onShow={()=>{if(autoFocus)input.current?.focus();}} statusBarTranslucent navigationBarTranslucent>
   <View style={styles.backdrop}>
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'rgba(0,0,0,.4)',opacity:veil}]}/>
    <Animated.View accessibilityViewIsModal accessibilityLabel="Search Lebanon" {...(web?{dataSet:{mobileSearchSheet:'true'}}:{} as object)}
     style={[styles.sheet,{paddingTop:insets.top,paddingBottom:insets.bottom,transform:[{translateY:offset.interpolate({inputRange:[0,1],outputRange:[0,(web?viewport.height:dimensions.height)*.9]})}]},web?{height:viewport.height,top:viewport.top}:styles.nativeFill]}>
     <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS==='ios'?'padding':undefined}>
      <View style={styles.header}>
       <Pressable accessibilityRole="button" accessibilityLabel="Back from search" onPress={()=>close()} hitSlop={5} style={styles.back}><Ionicons name="chevron-back" size={25} color="#263244"/></Pressable>
       <View style={[styles.inputWrap,focused&&styles.inputFocused]}>
        <Ionicons name="search" size={20} color="#98a2b3" style={{marginLeft:14}}/>
        <SearchSheetInput ref={input} value={value} onChangeText={setValue} onSubmit={submit} onKeyboard={keyboard} onComposing={setComposing}
         listId={listId} activeId={active>=0?`${listId}-${active}`:undefined} arabic={arabic} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}/>
        {value?<Pressable accessibilityLabel="Clear search" accessibilityRole="button" onPress={()=>{setValue('');input.current?.focus();}} hitSlop={4} style={styles.clear}><Ionicons name="close-circle" size={20} color="#98a2b3"/></Pressable>:null}
       </View>
      </View>
      <ScrollView ref={scroll} onScroll={event=>{scrollY.current=event.nativeEvent.contentOffset.y;}} scrollEventThrottle={16} style={styles.flex} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
       {typed&&<View style={styles.locationHeading}><Text style={styles.locationLabel}>Suggested places</Text></View>}
       <View nativeID={listId} {...(web?{role:'listbox','aria-label':'Search suggestions','aria-busy':query.isFetching}:{} as object)}>
        {typed?<>
         {(query.isFetching||composing)?<View style={styles.loading}><Text style={styles.context}>Searching Lebanon...</Text>{[0,1,2].map(x=><View key={x} style={styles.skeleton}/>)}</View>:
          query.isError?<View style={styles.empty}><Text style={styles.emptyTitle}>Search is unavailable</Text><Pressable onPress={()=>query.refetch()} style={styles.retry}><Text style={styles.link}>Try again</Text></Pressable></View>:
          items.length?items.map((item,index)=>option(item,'typed',index)):<View style={styles.empty}><Ionicons name="search-outline" size={30} color="#98a2b3"/><Text style={styles.emptyTitle}>No places found.</Text><Text style={styles.emptyText}>Try another spelling, city, area or university.</Text></View>}
        </>:<>
         {recentsError&&<View style={styles.historyError}><Text style={styles.context}>Recent searches unavailable.</Text><Pressable onPress={onRetryRecents} hitSlop={8}><Text style={styles.link}>Retry</Text></Pressable></View>}
         {recentPersistenceError&&<Text style={styles.historyError}>Recent searches are saved for this session only.</Text>}{section('Recently searched',recents,'recent',0)}
         {section('Top areas',areas,'area',recents.length)}
         {section('Top universities',campuses,'campus',recents.length+areas.length)}
         {query.isFetching&&<View style={styles.loading}><Text style={styles.context}>Loading popular locations...</Text></View>}
         {query.isError&&<View style={styles.empty}><Text style={styles.context}>Popular locations are unavailable.</Text><Pressable onPress={()=>query.refetch()} style={styles.retry}><Text style={styles.link}>Try again</Text></Pressable></View>}
        </>}
       </View>
       {typed&&<Pressable accessibilityRole="button" onPress={()=>close(()=>onSubmitText(value.trim()))} style={styles.searchAll}><Ionicons name="search-outline" size={17} color="#ea3f4a"/><Text style={styles.link}>Search all for “{value.trim()}”</Text><Ionicons name="arrow-forward" size={17} color="#ea3f4a"/></Pressable>}
       {typed&&items.some(isNearby)&&<Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(OSM_ATTRIBUTION.url)} hitSlop={8} style={styles.attribution}><Text style={styles.attributionText}>{OSM_ATTRIBUTION.text}</Text></Pressable>}
      </ScrollView>
      <Text accessibilityLiveRegion="polite" {...(web?{role:'status'}:{} as object)} style={styles.sr}>{query.isFetching?'Searching':typed?`${items.length} suggestions available`:'Popular locations and campuses'}</Text>
     </KeyboardAvoidingView>
    </Animated.View>
   </View>
  </Modal>
 </>;
}
const styles=StyleSheet.create({
 flex:{flex:1,minHeight:0},nativeFill:{height:'100%'},backdrop:{flex:1},sheet:{position:'absolute',left:0,right:0,backgroundColor:'#fff',maxWidth:'100%'},
 launcher:{flexDirection:'row',alignItems:'center',backgroundColor:'#fff',borderColor:'#e5e7eb',borderWidth:1,borderRadius:999,gap:8},hero:{height:62,paddingLeft:22,paddingRight:6,borderWidth:2,borderColor:'#ea3f4a'},compact:{minHeight:44,paddingVertical:5,paddingLeft:16,paddingRight:4},launcherText:{fontFamily:Studently.type.body,fontSize:13,color:'#667085',flex:1},heroText:{fontSize:15},searchAction:{width:32,height:32,borderRadius:99,backgroundColor:'#ea3f4a',alignItems:'center',justifyContent:'center'},heroAction:{width:46,height:46},
 header:{flexDirection:'row',alignItems:'center',paddingVertical:5,paddingRight:12,paddingLeft:4,gap:2,borderBottomWidth:0,minHeight:68,backgroundColor:'#fff'},back:{width:40,height:44,alignItems:'center',justifyContent:'center'},inputWrap:{flex:1,flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:'transparent',borderRadius:28,backgroundColor:'#fff',height:48,boxShadow:'0 3px 14px rgba(16,24,40,0.10)'},clear:{height:40,width:36,alignItems:'center',justifyContent:'center'},
 listContent:{paddingBottom:24},locationHeading:{paddingHorizontal:16,paddingVertical:16,gap:8,flexDirection:'row',alignItems:'center',borderBottomColor:'#f2f4f7',borderBottomWidth:1},locationLabel:{fontFamily:Studently.type.bodyMedium,fontSize:12,color:'#344054'},section:{paddingBottom:16,borderBottomWidth:1,borderBottomColor:'#f0f1f4'},sectionHead:{paddingTop:16,paddingHorizontal:16,paddingBottom:10,flexDirection:'row',alignItems:'center',gap:6},sectionTitle:{fontFamily:Studently.type.bodyMedium,fontSize:15,color:'#667085',flex:1},clearRecents:{minHeight:44,minWidth:44,paddingVertical:4,paddingLeft:8,alignItems:'flex-end',justifyContent:'center'},horizontalGrid:{flexGrow:0,flexShrink:0,minHeight:140},gridContent:{paddingHorizontal:16,gap:8},gridRow:{width:'100%',height:64,paddingVertical:4,borderRadius:10},recentList:{paddingHorizontal:16,gap:8},recentRow:{height:64,width:'100%',paddingVertical:4,borderRadius:10},inputFocused:{borderColor:'#ea3f4a'},
 row:{flexDirection:'row',alignItems:'center',padding:16,gap:12,borderBottomColor:'#f2f4f7',borderBottomWidth:1,minHeight:88},selected:{backgroundColor:'#fff1f2',borderColor:'#f9b5ba'},iconTile:{width:34,height:34,borderRadius:9,backgroundColor:'#f3f4f6',alignItems:'center',justifyContent:'center'},rowBody:{flex:1,minWidth:0,gap:3},rowTitle:{fontFamily:Studently.type.bodyMedium,fontSize:14,lineHeight:21,color:'#111928'},translation:{fontSize:12,lineHeight:19,color:'#667085'},context:{fontFamily:Studently.type.body,fontSize:12,lineHeight:19,color:'#667085'},badge:{fontFamily:Studently.type.bodyMedium,fontSize:10,color:'#667085',borderColor:'#e4e7ec',borderWidth:1,borderRadius:5,paddingHorizontal:5,paddingVertical:2},rtl:{writingDirection:'rtl',textAlign:'right'},
 loading:{padding:20,gap:16},skeleton:{height:38,borderRadius:8,backgroundColor:'#f3f4f6'},empty:{paddingHorizontal:28,paddingVertical:48,alignItems:'center',gap:12},emptyTitle:{fontFamily:Studently.type.bodySemi,fontSize:16,color:'#344054'},emptyText:{fontFamily:Studently.type.body,fontSize:14,lineHeight:22,color:'#667085',textAlign:'center'},retry:{padding:12},link:{fontFamily:Studently.type.bodyMedium,fontSize:14,color:'#ea3f4a'},searchAll:{margin:16,paddingVertical:15,paddingHorizontal:14,borderRadius:12,borderWidth:1,borderColor:'#fbd5d8',backgroundColor:'#fff8f8',flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},historyError:{padding:16,flexDirection:'row',gap:12,alignItems:'center'},attribution:{alignSelf:'center',paddingVertical:4,paddingHorizontal:8},attributionText:{fontFamily:Studently.type.body,fontSize:11,color:'#98a2b3'},sr:{position:'absolute',height:1,width:1,overflow:'hidden',opacity:0},
});

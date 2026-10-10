import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { api } from '@/lib/api';
import type { Listing } from '@/types/listing';

type Session={id:string;expires:number};
let session:Session|null=null;
let loading:Promise<Session>|null=null;
const journeys=new Map<string,{token:string;sessionId:string;expires:number}>();
const impressions=new Set<string>();
export function eventId() {
  if(typeof crypto!=='undefined' && typeof crypto.randomUUID==='function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const n=Math.floor(Math.random()*16);return(c==='x'?n:(n&3)|8).toString(16);});
}
export async function promotionSession():Promise<Session> {
  if(session && session.expires>Date.now()) return session;
  if(loading) return loading;
  loading=(async()=>{
    try {const saved=JSON.parse(await AsyncStorage.getItem('skoun.promotionSession')||'null');if(saved?.expires>Date.now() && typeof saved.id==='string') session=saved;}catch{}
    if(!session || session.expires<=Date.now()) {
      session={id:eventId(),expires:Date.now()+30*60_000};
      try{await AsyncStorage.setItem('skoun.promotionSession',JSON.stringify(session));}catch{}
    }
    return session!;
  })();
  try{return await loading;}finally{loading=null;}
}
export function rememberPlacement(listing:Listing) {
  const p=listing.promotion;
  if(!p || Date.parse(p.endsAt)<=Date.now()) {journeys.delete(listing.id); if(Platform.OS==='web') try{sessionStorage.removeItem(`skoun.journey.${listing.id}`);}catch{} return;}
  const journey={token:p.token,sessionId:p.sessionId,expires:Date.now()+30*60_000};
  journeys.set(listing.id,journey);
  // sessionStorage carries a web card-click journey into a newly opened detail tab/navigation.
  if(Platform.OS==='web' && typeof sessionStorage!=='undefined') try{sessionStorage.setItem(`skoun.journey.${listing.id}`,JSON.stringify(journey));}catch{}
}
export async function activityBody(listingId:string,id=eventId()) {
  let journey=journeys.get(listingId);
  if(!journey && Platform.OS==='web' && typeof sessionStorage!=='undefined') try{journey=JSON.parse(sessionStorage.getItem(`skoun.journey.${listingId}`)||'null')??undefined;}catch{}
  if(journey && journey.expires<=Date.now()) {journeys.delete(listingId);journey=undefined;}
  const current=await promotionSession();
  return {eventId:id,sessionId:journey?.sessionId??current.id,platform:Platform.OS==='web'?'web':Platform.OS==='ios'?'ios':'android',placementToken:journey?.token};
}
export async function recordFeaturedImpression(listing:Listing,measurement:'web_viewable'|'expo_viewport') {
  const p=listing.promotion;
  if(p?.type!=='featured'||Date.parse(p.endsAt)<=Date.now()) return;
  const key=`${p.campaignId}:${listing.id}:${p.sessionId}`;
  if(impressions.has(key)) return;
  impressions.add(key);
  try {await api.post('/api/listing-activity/impressions',{eventId:eventId(),listingId:listing.id,sessionId:p.sessionId,placementToken:p.token,platform:Platform.OS==='web'?'web':Platform.OS==='ios'?'ios':'android',measurement});}
  catch {impressions.delete(key);}
}

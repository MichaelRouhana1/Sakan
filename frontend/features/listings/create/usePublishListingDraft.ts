import axios from 'axios';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { HOST_LISTINGS_PATH } from '@/constants/hostRoutes';
import { useAuthSession } from '@/features/auth/AuthSessionProvider';
import { mapDraftToBody } from './mapDraftToBody';
import { useCreateListingDraft } from './CreateListingProvider';
import { wizardPublishIssues } from './validators';
import { countUnits, placeKind, unitDrafts } from './unitDrafts';

export type PublishQuote={units:{index:number;credits:number}[];total:number;balance:number};
export function usePublishQuote(count:number){
 return useQuery({queryKey:['publish-quote',count],queryFn:async()=>{
  const {data}=await api.get<{data:PublishQuote}>('/api/listings/publish-quote',{params:{count}});return data.data;
 },staleTime:0});
}
export function usePublishListingDraft(){
 const {draft,reset,setStep,persistDraft}=useCreateListingDraft();
 const {refreshUser,session}=useAuthSession();
 const queryClient=useQueryClient();
 const quote=usePublishQuote(countUnits(draft));
 const [published,setPublished]=useState(false);
 const [err,setErr]=useState<string|null>(null);
 const finishing=useRef(false);
 const receipt=useQuery({queryKey:['published-batch',session?.userId,draft.publishRequestId],enabled:Boolean(draft.publishRequestId),
  queryFn:async()=>{const {data}=await api.get<{data:{listingIds:string[]}|null}>(`/api/listings/publish-units/${draft.publishRequestId}`);return data.data;},staleTime:0});
 const finish=useCallback(async(result:{listingIds:string[]})=>{
  if(finishing.current)return;
  finishing.current=true;setPublished(true);
  await Promise.all([queryClient.invalidateQueries({queryKey:['listings']}),queryClient.invalidateQueries({queryKey:['credits']}),queryClient.invalidateQueries({queryKey:['publish-quote']})]);
  await reset();
  void refreshUser();
  if(result.listingIds.length===1)router.replace({pathname:'/hosting/listing/[id]/promote',params:{id:result.listingIds[0],published:'1'}});
  else router.replace(HOST_LISTINGS_PATH as never);
 },[queryClient,reset,refreshUser]);
 // A completed batch can be recovered even when its charges emptied the wallet.
 useEffect(()=>{if(receipt.data?.listingIds.length)void finish(receipt.data);},[receipt.data,finish]);
 const publishIssues=useMemo(()=>wizardPublishIssues(draft),[draft]);
 const canAfford=Boolean(quote.data && quote.data.balance>=quote.data.total);
 const create=useMutation({mutationFn:async()=>{
  if(!quote.data || !draft.publishRequestId)throw new Error('Wait for the publishing total, then try again.');
  // Save the retry identity before any server write; a lost response cannot charge twice.
  await persistDraft?.();
  const bodies=unitDrafts(draft).map(unit=>({details:mapDraftToBody(unit),differentFields:unit.differentFields??[],
   bathroomPrivacy:unit.bathroomPrivacy,bedsAvailable:unit.spaceType==='shared_room'?unit.bedsAvailable:undefined}));
  const {data}=await api.post('/api/listings/publish-units',{
   requestId:draft.publishRequestId,expectedTotal:quote.data.total,placeId:draft.existingPlaceId,kind:placeKind(draft),
   shared:mapDraftToBody(draft),sharedPhotos:(draft.sharedPhotos??[]).map(p=>({url:p.url??p.uri,caption:p.caption??''})),units:bodies,
  });return data.data as {listingIds:string[]};
 },onSuccess:finish,onError:error=>{
  setErr(axios.isAxiosError(error)?error.response?.data?.error?.message ?? 'Could not publish. Your draft is saved; try again.':error instanceof Error?error.message:'Publish failed.');
  void quote.refetch();
  void receipt.refetch();
 }});
 return {publish:()=>{setErr(null);if(!publishIssues.length&&canAfford&&!create.isPending)create.mutate();},
  canPublish:canAfford&&!quote.isError&&publishIssues.length===0,canAfford,needsCredit:(quote.data?.total??0)>0,
  postCredits:quote.data?.balance??0,costLine:quote.isError?'Could not load the credit total. Retry.':quote.data?`Total: ${quote.data.total} post credit${quote.data.total===1?'':'s'} for ${countUnits(draft)} unit${countUnits(draft)===1?'':'s'}.`:'Checking credit total…',
  publishIssues,err,published,createPending:create.isPending,setStep};
}

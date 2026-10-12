import type { CreateListingDraft } from './draft';
import { SHARED_GROUPS } from './unitDrafts';
import { resolveMediaUrl } from '@/lib/mediaUrl';

export function placeToDraft(place:Record<string,any>):Partial<CreateListingDraft> {
 const fields = Object.values(SHARED_GROUPS).flat();
 const shared=Object.fromEntries(fields.map(key=>[key,place[key]]));
 return {...shared,placeKind:place.kind,area:place.area,addressLine:place.addressLine ?? '',buildingName:place.buildingName ?? '',
  primaryCampusId:place.primaryCampusId,landmark:place.landmark ?? '',
  pin:{lng:Number(place.lng),lat:Number(place.lat),confirmed:true,source:'pin',landmarkId:null,landmarkLabel:place.landmark??''},
  electricityCutWindows:place.electricityCutWindows ?? [],electricityCutsStart:place.electricityCutsStart??'',electricityCutsEnd:place.electricityCutsEnd??'',
  sharedPhotos:(place.photos??[]).map((p:any)=>({localId:p.id,url:p.url,uri:resolveMediaUrl(p.url)??p.url,caption:p.caption??'',status:'ready'})),
 };
}

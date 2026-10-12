import { INITIAL_DRAFT, type CreateListingDraft } from './draft';

export const SHARED_GROUPS = {
 electricity:['electricity','electricityCutsStart','electricityCutsEnd','electricityHoursOn','electricityCutWindows','generatorAmperes','hasSolar','generatorIncluded'],
 water:['water','waterBillIncluded'],
 comforts:['wifiIncluded','routerUps','hasElevator','elevator24_7','conciergeIncluded','cookingGasIncluded','buildingFeesIncluded','parkingIncludedInRent','amenities'],
 rules:['smokingPolicy','petsPolicy','guestsPolicy','quietHours','targetAudience'],
} as const;
export function countUnits(d:CreateListingDraft){return d.unitCount ?? 1;}
export function placeKind(d:CreateListingDraft){return d.placeKind ?? (countUnits(d)>1 && d.spaceType==='entire_place'?'building':'apartment');}
export function unitDraft(d:CreateListingDraft,index:number):CreateListingDraft {
 const data=index===0?{}:d.additionalUnits?.[index-1]?.data ?? {};
 const next={...d,...data,unitCount:1,additionalUnits:[]};
 // Extra units only store their own fields; shared values remain live.
 return next;
}
export function unitDrafts(d:CreateListingDraft){return Array.from({length:countUnits(d)},(_,i)=>unitDraft(d,i));}
export function resizeUnits(d:CreateListingDraft,count:number):Partial<CreateListingDraft> {
 const existing=d.additionalUnits ?? [];
 // Retain cards beyond the selected count so changing the answer never loses uploads.
 const units=[...existing];
 while(units.length<count-1)units.push({id:`unit-${Date.now()}-${units.length}`,data:{
  photos:[],title:'',description:'',monthlyRentUsd:'',areaSqm:'',furnishingType:null,
  bathroomPrivacy:undefined,bedsAvailable:null,beds:1,bedrooms:1,bathrooms:1,maxOccupancy:1,
  floorNumber:0,depositPreset:INITIAL_DRAFT.depositPreset,cardBadges:null,
  genderRestriction:INITIAL_DRAFT.genderRestriction,securityDepositUsd:'',
  leaseTerm:INITIAL_DRAFT.leaseTerm,availableImmediate:true,availableFrom:'',
  paymentModality:INITIAL_DRAFT.paymentModality,highlightTags:[],
 }});
 return {unitCount:count,additionalUnits:units,placeKind:d.existingPlaceId?d.placeKind:undefined};
}
export function wizardStepOrder(d:CreateListingDraft):number[]{
 if(d.existingPlaceId)return [0,5,8,9];
 return countUnits(d)>1?[0,1,3,4,5,8,9]:[0,1,2,3,4,5,6,7,8,9];
}
export function adjacentStep(d:CreateListingDraft,direction:1|-1){
 const steps=wizardStepOrder(d);
 return direction===1?steps.find(s=>s>d.step) ?? 9:[...steps].reverse().find(s=>s<d.step) ?? 0;
}

import { randomUUID } from 'node:crypto';
export const photoNames = ['086ae7ac-9857-4762-a016-956fac30e32e.jpg','55dc5662-57a1-46c1-b654-1c7ca22c4cd9.jpg','01d81545-c0b6-4159-bfb9-971ee5048773.jpg'];
export const photos = (api, prefix) => photoNames.map((name,i) => ({localId:`${prefix}-${i}`,uri:`${api}/uploads/listings/${name}`,url:`${api}/uploads/listings/${name}`,caption:['Bedroom','Kitchen','Living room'][i],status:'ready'}));
export function fixture(model, campusId, api) {
  const p = model.newWizard(randomUUID());
  p.place = {kind:'building',data:{area:'Hamra',buildingName:'Cedar House',addressLine:'Hamra Street, Beirut',primaryCampusId:campusId,
    pin:{lat:33.899,lng:35.482,confirmed:true,source:'pin',landmarkId:null,landmarkLabel:''},electricity:'solar',water:'state_well_24_7',hasElevator:true,elevator24_7:true,wifiIncluded:true,amenities:['study_desk','balcony']},photos:[]};
  p.units[0].data = {...p.units[0].data,spaceType:'entire_place',propertyType:'apartment',furnishingType:'furnished',bathroomPrivacy:'private',bedrooms:1,beds:1,bathrooms:1,maxOccupancy:2,floorNumber:2,areaSqm:'65',monthlyRentUsd:'650',title:'Sunny apartment near campus',description:'A furnished apartment with a quiet bedroom, a balcony and a desk for studying. Close to campus, shops and everyday essentials.',photos:photos(api,p.units[0].id)};
  p.contact = {listingPosterRole:'landlord',contactName:'Acceptance Host',contactNumbers:[{kind:'mobile',prefix:'71',subscriber:'123456',calls:true,whatsapp:true}]};
  return p;
}

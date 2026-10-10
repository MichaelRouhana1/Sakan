import { isAxiosError } from 'axios';
import { api } from '@/lib/api';
import type { AdminListing, ListingActionKind, ListingEditPatch, ListListingsParams, ListListingsResult } from './types';
const base='/api/admin/inventory/listings';
export async function listAdminListings(params:ListListingsParams={}):Promise<ListListingsResult>{
 const {data}=await api.get<{data:ListListingsResult}>(base,{params});return data.data;
}
export async function getAdminListing(id:string):Promise<AdminListing>{
 const {data}=await api.get<{data:AdminListing}>(base+'/'+encodeURIComponent(id));return data.data;
}
async function action(id:string,body:unknown):Promise<AdminListing>{
 const {data}=await api.post<{data:AdminListing}>(base+'/'+encodeURIComponent(id)+'/actions',body);return data.data;
}
export const archiveAdminListing=(id:string,adminNote:string)=>action(id,{kind:'archive',adminNote});
export const removeAdminListing=(id:string,adminNote:string)=>action(id,{kind:'remove',adminNote});
export const restoreAdminListing=(id:string,adminNote:string)=>action(id,{kind:'restore',adminNote});
export const dismissAdminListingReports=(id:string,adminNote:string)=>action(id,{kind:'dismiss_reports',adminNote});
export const updateAdminListing=(id:string,patch:ListingEditPatch,adminNote='Updated listing details')=>action(id,{kind:'edit',patch,adminNote});
export const setAdminListingPhotoFlag=(id:string,photoId:string,flagged:boolean,adminNote:string)=>action(id,{kind:'photo',photoId,flagged,adminNote});
export type InventoryPatch={expectedVersion:number;hidden?:boolean;availability?:'available'|'pending'|'rented';bedsTotal?:number;bedsAvailable?:number};
export const updateAdminInventory=(id:string,inventory:InventoryPatch,adminNote:string)=>action(id,{kind:'inventory',inventory,adminNote});
export async function bulkAdminListingAction(ids:string[],kind:Extract<ListingActionKind,'archive'|'remove'|'dismiss_reports'>,adminNote:string):Promise<AdminListing[]>{
 const {data}=await api.post<{data:AdminListing[]}>(base+'/bulk',{ids,kind,adminNote});return data.data;
}

export function adminListingError(error: unknown): string {
 if (isAxiosError(error)) return error.response?.data?.error?.message ?? error.message;
 return error instanceof Error ? error.message : 'Request failed';
}

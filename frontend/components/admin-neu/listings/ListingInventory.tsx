import { useState } from 'react';
import { H } from '../h';
import { NeuButton, NeuSurface } from '../NeuPrimitives';
import { adminListingError, updateAdminInventory } from './listingsSource';
import type { AdminListing } from './types';

export function ListingInventory({listing,onSaved}:{listing:AdminListing;onSaved:(row:AdminListing)=>void}) {
 const [hidden,setHidden]=useState(Boolean(listing.hidden));
 const [availability,setAvailability]=useState(listing.availability??'available');
 const [total,setTotal]=useState(String(listing.bedsTotal??''));
 const [available,setAvailable]=useState(String(listing.bedsAvailable??''));
 const [note,setNote]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const shared=listing.unitType==='shared_bed';
 const bedsChanged=shared&&(total!==String(listing.bedsTotal??'')||available!==String(listing.bedsAvailable??''));
 const visibilityChanged=hidden!==Boolean(listing.hidden);
 const availabilityChanged=availability!==(listing.availability??'available');
 const changed=bedsChanged||visibilityChanged||availabilityChanged;
 async function save() {
  setBusy(true);setError('');
  try {
   if(bedsChanged && (total.trim()==='' || available.trim()==='' || !Number.isInteger(Number(total)) || !Number.isInteger(Number(available)))) throw new Error('Enter total and available beds.');
   const updated=await updateAdminInventory(listing.id,{expectedVersion:listing.inventoryVersion!,...(visibilityChanged?{hidden}:{}),...(availabilityChanged?{availability}:{}),...(bedsChanged?{bedsTotal:Number(total),bedsAvailable:Number(available)}:{})},note);
   onSaved(updated);
  } catch(e) {setError(adminListingError(e));}
  finally {setBusy(false)}
 }
 return <NeuSurface inset className="space-y-3 px-4 py-3">
  <H as="h3" className="font-semibold">Unit inventory</H>
  <H className="text-xs text-clay-700">{listing.hiddenReason?({unit_hidden:'Hidden by host or staff',place_hidden:'Building hidden',confirm_beds:'Confirm bed availability',no_beds:'No beds available',occupied_alternative:'Another offer in this apartment is occupied'}[listing.hiddenReason]??'Hidden'):'Visible when live and available'}</H>
  <H as="label" className="flex items-center gap-2"><H as="input" type="checkbox" className="h-4 w-4" style={{appearance:'auto',accentColor:'var(--admin-moss)'}} checked={hidden} disabled={busy} onChange={(e:{target:{checked:boolean}})=>setHidden(e.target.checked)}/>Hide this unit</H>
  <H as="label" className="block">Availability<H as="select" className="mt-1 block w-full rounded-neu-md bg-clay-100 px-3 py-2 shadow-neu-in-sm" aria-label="Unit availability" value={availability} disabled={busy} onChange={(e:{target:{value:string}})=>{const next=e.target.value as typeof availability;setAvailability(next);if(shared&&next==='rented')setAvailable('0')}}>
   <H as="option" value="available">Available</H><H as="option" value="pending">Under offer</H><H as="option" value="rented">Rented</H>
  </H></H>
  {shared?<H className="flex gap-3">
   <H as="label" className="min-w-0 flex-1">Total beds<H as="input" className="mt-1 block w-full rounded-neu-md bg-clay-100 px-3 py-2 shadow-neu-in-sm" aria-label="Total beds" type="number" min={1} step={1} value={total} disabled={busy} onChange={(e:{target:{value:string}})=>setTotal(e.target.value)}/></H>
   <H as="label" className="min-w-0 flex-1">Available beds<H as="input" className="mt-1 block w-full rounded-neu-md bg-clay-100 px-3 py-2 shadow-neu-in-sm" aria-label="Available beds" type="number" min={0} step={1} value={available} disabled={busy} onChange={(e:{target:{value:string}})=>{setAvailable(e.target.value);setAvailability(Number(e.target.value)===0?'rented':'available')}}/></H>
  </H>:null}
  <H as="input" className="mt-1 block w-full rounded-neu-md bg-clay-100 px-3 py-2 shadow-neu-in-sm" aria-label="Inventory change note" placeholder="Reason for this change" value={note} disabled={busy} onChange={(e:{target:{value:string}})=>setNote(e.target.value)}/>
  {error?<H role="alert">{error}</H>:null}
  <NeuButton disabled={busy||!changed||!note.trim()||listing.inventoryVersion===undefined} onClick={()=>void save()}>{busy?'Saving…':'Save inventory'}</NeuButton>
 </NeuSurface>;
}

import { api } from '@/lib/api';
import type { GenderRestriction, ListingAvailability, ListingStatus } from '@/types/listing';

export type UnitInventory = {
  id: string;
  title: string | null;
  status: ListingStatus;
  placeId: string;
  unitType: 'whole_apartment' | 'private_room' | 'shared_bed';
  hidden: boolean;
  placeHidden: boolean;
  hiddenReason: string | null;
  availability: ListingAvailability;
  bedsTotal: number | null;
  bedsAvailable: number | null;
  inventoryNeedsConfirmation: boolean;
  inventoryVersion: number;
  genderRestriction: GenderRestriction;
  blockers: { id: string; title: string; inventoryNeedsConfirmation: boolean }[];
};
export type InventoryChange = {
  hidden?: boolean;
  availability?: ListingAvailability;
  bedsTotal?: number;
  bedsAvailable?: number;
  bedAction?: 'rent_one' | 'free_one';
  genderRestriction?: GenderRestriction;
};
export const inventoryKey = (id: string) => ['host-inventory', id] as const;
export async function fetchInventory(id: string): Promise<UnitInventory> {
  return (await api.get<{data: UnitInventory}>(`/api/listings/${id}/inventory`)).data.data;
}
export async function saveInventory(row: UnitInventory, change: InventoryChange): Promise<UnitInventory> {
  return (await api.patch<{data: UnitInventory}>(`/api/listings/${row.id}/inventory`, {
    expectedVersion: row.inventoryVersion, ...change,
  })).data.data;
}
export async function setPlaceVisibility(placeId: string, hidden: boolean) {
  await api.patch(`/api/listings/places/${placeId}/visibility`, { hidden });
}
export function inventoryMessage(row: UnitInventory): string | null {
  if (row.hidden) return 'Hidden by you or staff';
  if (row.placeHidden) return 'Hidden because this place is hidden';
  if (row.inventoryNeedsConfirmation) return 'Hidden until you confirm available beds';
  if (row.availability === 'rented') return row.unitType === 'shared_bed' ? 'Hidden because all beds are rented' : 'Hidden because this unit is rented';
  if (row.blockers.length) return row.blockers.map(b => b.inventoryNeedsConfirmation
    ? `Hidden until available beds in ${b.title} are confirmed`
    : `Hidden because ${b.title} is rented`).join('. ');
  return null;
}
export function inventoryError(error: unknown): string {
  const e = error as {response?: {data?: {error?: {message?: string}}}};
  return e.response?.data?.error?.message ?? 'Could not save. Refresh inventory before trying again.';
}

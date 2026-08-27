/**
 * API-shaped listings source.
 * Today: in-memory mock store + delay.
 * Later: swap bodies to api.get/post `/api/admin/listings*` — keep these signatures.
 */
import {
  applyStatusAction,
  bulkInStore,
  dismissReportsInStore,
  getFromStore,
  listFromStore,
  setPhotoFlagInStore,
  updateInStore,
} from "./mockStore";
import type {
  AdminListing,
  ListingActionKind,
  ListingEditPatch,
  ListListingsParams,
  ListListingsResult,
} from "./types";

const MOCK_DELAY_MS = 150;

async function delay(ms = MOCK_DELAY_MS): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function listAdminListings(
  params: ListListingsParams = {},
): Promise<ListListingsResult> {
  await delay();
  return listFromStore(params);
}

export async function getAdminListing(id: string): Promise<AdminListing> {
  await delay();
  return getFromStore(id);
}

export async function archiveAdminListing(
  id: string,
  adminNote: string,
): Promise<AdminListing> {
  await delay();
  return structuredClone(applyStatusAction(id, "archive", adminNote));
}

export async function removeAdminListing(
  id: string,
  adminNote: string,
): Promise<AdminListing> {
  await delay();
  return structuredClone(applyStatusAction(id, "remove", adminNote));
}

export async function restoreAdminListing(
  id: string,
  adminNote: string,
): Promise<AdminListing> {
  await delay();
  return structuredClone(applyStatusAction(id, "restore", adminNote));
}

export async function dismissAdminListingReports(
  id: string,
  adminNote: string,
): Promise<AdminListing> {
  await delay();
  return structuredClone(dismissReportsInStore(id, adminNote));
}

export async function updateAdminListing(
  id: string,
  patch: ListingEditPatch,
  adminNote = "Updated listing details",
): Promise<AdminListing> {
  await delay();
  return structuredClone(updateInStore(id, patch, adminNote));
}

export async function setAdminListingPhotoFlag(
  listingId: string,
  photoId: string,
  flagged: boolean,
  adminNote: string,
): Promise<AdminListing> {
  await delay();
  return structuredClone(
    setPhotoFlagInStore(listingId, photoId, flagged, adminNote),
  );
}

export async function bulkAdminListingAction(
  ids: string[],
  kind: Extract<ListingActionKind, "archive" | "remove" | "dismiss_reports">,
  adminNote: string,
): Promise<AdminListing[]> {
  await delay();
  return bulkInStore(ids, kind, adminNote).map((row) => structuredClone(row));
}

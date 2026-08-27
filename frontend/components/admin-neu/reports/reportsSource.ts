/**
 * API-shaped reports source (per-ticket).
 * Today: in-memory mock store + delay.
 *
 * Mapping to current backend:
 * - pending + in_review ≈ open (claim is staff overlay; DB has no claim yet)
 * - resolved ≈ actioned
 * - dismissed ≈ dismissed
 * - dismissReport(id) = future ticket API
 * - dismissListingReports(listingId) ≈ POST /api/admin/reports/listings/:id/dismiss
 * - Groups endpoint (GET /reports) optional later; UI stays ticket-first
 */
import {
  banInStore,
  bulkInStore,
  claimInStore,
  dismissInStore,
  dismissListingInStore,
  findByListingId,
  getFromStore,
  listFromStore,
  relatedFromStore,
  removeInStore,
  reopenInStore,
  restrictInStore,
  unclaimInStore,
  warnInStore,
} from "./mockStore";
import type {
  AdminReport,
  ListReportsParams,
  ListReportsResult,
  ReportActionKind,
} from "./types";

const MOCK_DELAY_MS = 150;

async function delay(ms = MOCK_DELAY_MS): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function listAdminReports(
  params: ListReportsParams = {},
): Promise<ListReportsResult> {
  await delay();
  return listFromStore(params);
}

export async function getAdminReport(id: string): Promise<AdminReport> {
  await delay();
  return getFromStore(id);
}

export async function getRelatedReports(
  listingId: string,
  excludeId: string,
): Promise<AdminReport[]> {
  await delay();
  return relatedFromStore(listingId, excludeId);
}

export async function findReportByListing(
  listingId: string,
): Promise<AdminReport | null> {
  await delay();
  return findByListingId(listingId);
}

export async function claimAdminReport(
  id: string,
  adminNote = "",
): Promise<AdminReport> {
  await delay();
  return structuredClone(claimInStore(id, adminNote));
}

export async function unclaimAdminReport(
  id: string,
  adminNote = "",
): Promise<AdminReport> {
  await delay();
  return structuredClone(unclaimInStore(id, adminNote));
}

export async function dismissAdminReport(
  id: string,
  adminNote: string,
): Promise<AdminReport> {
  await delay();
  return structuredClone(dismissInStore(id, adminNote));
}

export async function dismissListingReports(
  listingId: string,
  adminNote: string,
  focusId?: string,
): Promise<AdminReport[]> {
  await delay();
  return dismissListingInStore(listingId, adminNote, focusId).map((row) =>
    structuredClone(row),
  );
}

export async function removeListingFromReport(
  id: string,
  adminNote: string,
): Promise<AdminReport> {
  await delay();
  return structuredClone(removeInStore(id, adminNote));
}

export async function warnPosterFromReport(
  id: string,
  adminNote: string,
): Promise<AdminReport> {
  await delay();
  return structuredClone(warnInStore(id, adminNote));
}

export async function restrictPosterFromReport(
  id: string,
  adminNote: string,
): Promise<AdminReport> {
  await delay();
  return structuredClone(restrictInStore(id, adminNote));
}

export async function banPosterFromReport(
  id: string,
  adminNote: string,
): Promise<AdminReport> {
  await delay();
  return structuredClone(banInStore(id, adminNote));
}

export async function reopenAdminReport(
  id: string,
  adminNote: string,
): Promise<AdminReport> {
  await delay();
  return structuredClone(reopenInStore(id, adminNote));
}

export async function bulkReportAction(
  ids: string[],
  kind: Extract<ReportActionKind, "claim" | "dismiss" | "remove">,
  adminNote: string,
): Promise<AdminReport[]> {
  await delay();
  return bulkInStore(ids, kind, adminNote).map((row) => structuredClone(row));
}

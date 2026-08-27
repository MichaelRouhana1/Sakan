/**
 * API-shaped trust source.
 * Today: in-memory mock store + 150ms delay.
 *
 * Mapping to current backend (honest):
 * - No KYC / documents / scam-alert tables exist. This desk is a
 *   **manual poster badge** tray, not Veriff. Veriff webhook is TODO.
 * - warn / restrict ≈ future PATCH /api/admin/users/:id/status
 *   (demo does not write the Users mock store).
 * - Domain list is not the institutions table (no email column there).
 *   Overlap is copy + a link to /admin/universities only.
 * Future swap:
 * - listKyc / getKyc ≈ GET /api/admin/kyc
 * - grant/revoke/reject/reopen ≈ PATCH /api/admin/kyc/:id
 * - listAlerts / warn/restrict/review/clear ≈ GET/PATCH /api/admin/alerts
 * - domains ≈ GET/POST/DELETE /api/admin/student-domains
 */
import {
  addDomainInStore,
  clearAlertInStore,
  getAlertFromStore,
  getKycFromStore,
  grantBadgeInStore,
  listAlertsFromStore,
  listDomainsFromStore,
  listKycFromStore,
  overviewFromStore,
  rejectKycInStore,
  removeDomainInStore,
  reopenKycInStore,
  restrictAlertInStore,
  reviewAlertInStore,
  revokeBadgeInStore,
  warnAlertInStore,
} from "./mockStore";
import type {
  AcademicDomain,
  KycCase,
  ListAlertsParams,
  ListAlertsResult,
  ListKycParams,
  ListKycResult,
  ScamAlert,
  TrustOverview,
} from "./types";

const MOCK_DELAY_MS = 150;

async function delay(ms = MOCK_DELAY_MS): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function listAdminKyc(
  params: ListKycParams = {},
): Promise<ListKycResult> {
  await delay();
  return listKycFromStore(params);
}

export async function getAdminKyc(id: string): Promise<KycCase> {
  await delay();
  return getKycFromStore(id);
}

export async function grantAdminKyc(
  id: string,
  note: string,
): Promise<KycCase> {
  await delay();
  return structuredClone(grantBadgeInStore(id, note));
}

export async function revokeAdminKyc(
  id: string,
  note: string,
): Promise<KycCase> {
  await delay();
  return structuredClone(revokeBadgeInStore(id, note));
}

export async function rejectAdminKyc(
  id: string,
  note: string,
): Promise<KycCase> {
  await delay();
  return structuredClone(rejectKycInStore(id, note));
}

export async function reopenAdminKyc(
  id: string,
  note: string,
): Promise<KycCase> {
  await delay();
  return structuredClone(reopenKycInStore(id, note));
}

export async function listAdminAlerts(
  params: ListAlertsParams = {},
): Promise<ListAlertsResult> {
  await delay();
  return listAlertsFromStore(params);
}

export async function getAdminAlert(id: string): Promise<ScamAlert> {
  await delay();
  return getAlertFromStore(id);
}

export async function warnAdminAlert(
  id: string,
  note: string,
): Promise<ScamAlert> {
  await delay();
  return structuredClone(warnAlertInStore(id, note));
}

export async function restrictAdminAlert(
  id: string,
  note: string,
): Promise<ScamAlert> {
  await delay();
  return structuredClone(restrictAlertInStore(id, note));
}

export async function reviewAdminAlert(id: string): Promise<ScamAlert> {
  await delay();
  return structuredClone(reviewAlertInStore(id));
}

export async function clearAdminAlert(
  id: string,
  note: string,
): Promise<ScamAlert> {
  await delay();
  return structuredClone(clearAlertInStore(id, note));
}

export async function listAdminDomains(): Promise<AcademicDomain[]> {
  await delay();
  return listDomainsFromStore();
}

export async function addAdminDomain(domain: string): Promise<AcademicDomain> {
  await delay();
  return structuredClone(addDomainInStore(domain));
}

export async function removeAdminDomain(
  id: string,
  note: string,
): Promise<AcademicDomain> {
  await delay();
  return structuredClone(removeDomainInStore(id, note));
}

export async function getTrustOverview(): Promise<TrustOverview> {
  await delay();
  return overviewFromStore();
}

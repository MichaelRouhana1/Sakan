/**
 * API-shaped payments source.
 * Today: in-memory mock store + 150ms delay.
 *
 * Mapping to current backend (honest):
 * - GET /api/admin/transactions exists (pending/history). This UI is not wired.
 * - POST /api/credits/purchase now auto-approves (demo gateway).
 * - Listing spend is users.postCredits-- — no credit_transactions spend row.
 * - Refund / dispute / adjust ≈ future PATCH /api/admin/transactions/:id
 */
import {
  adjustInStore,
  getPaymentFromStore,
  listGrantTargets,
  listPaymentsFromStore,
  overviewFromStore,
  refundInStore,
} from "./mockStore";
import type {
  AdjustmentDraft,
  LedgerTx,
  LedgerUser,
  ListPaymentsParams,
  ListPaymentsResult,
  PaymentsOverview,
} from "./types";

const MOCK_DELAY_MS = 150;

async function delay(ms = MOCK_DELAY_MS): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function listAdminPayments(
  params: ListPaymentsParams = {},
): Promise<ListPaymentsResult> {
  await delay();
  return listPaymentsFromStore(params);
}

export async function getAdminPayment(id: string): Promise<LedgerTx> {
  await delay();
  return getPaymentFromStore(id);
}

export async function refundAdminPayment(
  id: string,
  note: string,
): Promise<LedgerTx> {
  await delay();
  return structuredClone(refundInStore(id, note));
}

export async function adjustAdminCredits(
  draft: AdjustmentDraft,
): Promise<LedgerTx> {
  await delay();
  return structuredClone(adjustInStore(draft));
}

export async function listPaymentGrantTargets(): Promise<LedgerUser[]> {
  await delay();
  return listGrantTargets();
}

export async function getPaymentsOverview(): Promise<PaymentsOverview> {
  await delay();
  return overviewFromStore();
}

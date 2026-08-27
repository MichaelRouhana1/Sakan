export type TxKind = "purchase" | "spend" | "grant" | "refund" | "adjustment";
export type TxStatus = "completed" | "refunded" | "disputed" | "failed";
export type CreditChannel = "whish" | "omt" | "staff" | "listing";
export type CreditBundle = "starter" | "bundle_5" | "boost_pack" | "custom";
export type DateRangeId = "7d" | "30d" | "all";

export type PaymentsActionKind = "refund" | "adjust";

export type LedgerUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type LedgerTx = {
  id: string;
  referenceId: string;
  kind: TxKind;
  status: TxStatus;
  channel: CreditChannel;
  bundleType: CreditBundle;
  amountUsdCents: number;
  postCredits: number;
  boostCredits: number;
  createdAt: string;
  note: string | null;
  user: LedgerUser;
  listingId: string | null;
};

export type AdjustmentDraft = {
  userId: string;
  postCredits: string;
  boostCredits: string;
  note: string;
};

export type PaymentsOverview = {
  revenueCents: number;
  creditsPurchased: number;
  creditsSpent: number;
  completed: number;
  failed: number;
  refunded: number;
  disputed: number;
};

export type ListPaymentsParams = {
  q?: string;
  kind?: TxKind | "all";
  status?: TxStatus | "all";
  channel?: CreditChannel | "all";
  range?: DateRangeId;
  page?: number;
  pageSize?: number;
};

export type ListPaymentsResult = {
  items: LedgerTx[];
  total: number;
  page: number;
  pageSize: number;
  overview: PaymentsOverview;
};

export const ANCHOR_ISO = "2026-08-25T12:00:00.000Z";

export const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

export const KIND_FILTERS: (TxKind | "all")[] = [
  "all",
  "purchase",
  "spend",
  "grant",
  "refund",
  "adjustment",
];

export const STATUS_FILTERS: (TxStatus | "all")[] = [
  "all",
  "completed",
  "refunded",
  "disputed",
  "failed",
];

export const CHANNEL_FILTERS: (CreditChannel | "all")[] = [
  "all",
  "whish",
  "omt",
  "staff",
  "listing",
];

export const RANGE_FILTERS: DateRangeId[] = ["7d", "30d", "all"];

export function personName(user: LedgerUser): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function initials(user: LedgerUser): string {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatUsd(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function creditsLabel(tx: LedgerTx): string {
  const parts = [];
  if (tx.postCredits) {
    parts.push(`${tx.postCredits > 0 ? "+" : ""}${tx.postCredits} post`);
  }
  if (tx.boostCredits) {
    parts.push(`${tx.boostCredits > 0 ? "+" : ""}${tx.boostCredits} boost`);
  }
  return parts.length ? parts.join(" · ") : "—";
}

export function statusLabel(status: TxStatus): string {
  if (status === "completed") return "Completed";
  if (status === "refunded") return "Refunded";
  if (status === "disputed") return "Disputed";
  return "Failed";
}

export function kindLabel(kind: TxKind): string {
  if (kind === "purchase") return "Purchase";
  if (kind === "spend") return "Listing spend";
  if (kind === "grant") return "Grant";
  if (kind === "refund") return "Refund";
  return "Adjustment";
}

export function channelLabel(channel: CreditChannel): string {
  if (channel === "whish") return "Whish";
  if (channel === "omt") return "OMT";
  if (channel === "listing") return "Listing";
  return "Staff";
}

export function bundleLabel(bundle: CreditBundle): string {
  if (bundle === "starter") return "Starter";
  if (bundle === "bundle_5") return "5-pack";
  if (bundle === "boost_pack") return "Boost pack";
  return "Custom";
}

export function rangeLabel(range: DateRangeId): string {
  if (range === "7d") return "7 days";
  if (range === "30d") return "30 days";
  return "All time";
}

export function emptyOverview(): PaymentsOverview {
  return {
    revenueCents: 0,
    creditsPurchased: 0,
    creditsSpent: 0,
    completed: 0,
    failed: 0,
    refunded: 0,
    disputed: 0,
  };
}

export function canRefund(tx: LedgerTx): boolean {
  return tx.kind === "purchase" && tx.status === "completed";
}

export function actionNeedsNote(kind: PaymentsActionKind): boolean {
  return kind === "refund" || kind === "adjust";
}

export function actionLabel(kind: PaymentsActionKind): string {
  return kind === "refund" ? "Refunded" : "Adjusted";
}

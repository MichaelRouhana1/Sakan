export type TxKind = "purchased" | "granted";
export type TxStatus = "success" | "pending" | "failed";
export type CreditChannel = "whish" | "omt" | "staff";
export type CreditBundle = "starter" | "bundle_5" | "boost_pack" | "custom";

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
};

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
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function creditsLabel(tx: LedgerTx): string {
  const parts = [];
  if (tx.postCredits) parts.push(`${tx.postCredits} post`);
  if (tx.boostCredits) parts.push(`${tx.boostCredits} boost`);
  return parts.length ? parts.join(" · ") : "—";
}

export function statusLabel(status: TxStatus): string {
  if (status === "success") return "Success";
  if (status === "pending") return "Pending";
  return "Failed";
}

export function kindLabel(kind: TxKind): string {
  return kind === "purchased" ? "Purchased" : "Granted";
}

export function channelLabel(channel: CreditChannel): string {
  if (channel === "whish") return "Whish";
  if (channel === "omt") return "OMT";
  return "Staff";
}

export function bundleLabel(bundle: CreditBundle): string {
  if (bundle === "starter") return "Starter";
  if (bundle === "bundle_5") return "5-pack";
  if (bundle === "boost_pack") return "Boost pack";
  return "Custom";
}

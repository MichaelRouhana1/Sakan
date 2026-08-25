export type PackageId = "basic" | "bulk" | "pro";
export type CatalogType = "starter" | "bundle_5" | "boost_pack";
export type PromoStatus = "active" | "scheduled" | "paused" | "expired";
export type PromoFilter = PromoStatus | "all";
export type DiscountKind = "percent" | "amount";
export type LbpRound = 0 | 10000 | 50000;

export type CreditPackage = {
  id: PackageId;
  catalogType: CatalogType;
  name: string;
  tagline: string;
  basePostCredits: number;
  baseBoostCredits: number;
  bonusPct: number;
  priceUsd: number;
  featured?: boolean;
};

export type PricingEngine = {
  postCreditUsd: number;
  boostCreditUsd: number;
  marketLbp: number;
  officialLbp: number;
  bufferPct: number;
  roundTo: LbpRound;
};

export type PromoApplies = "all" | PackageId;

export type PromoCode = {
  id: string;
  code: string;
  name: string;
  kind: DiscountKind;
  value: number;
  usageLimit: number;
  usageCount: number;
  startsAt: string;
  expiresAt: string;
  status: PromoStatus;
  appliesTo: PromoApplies;
};

export type PromoDraft = {
  name: string;
  code: string;
  kind: DiscountKind;
  value: string;
  usageLimit: string;
  startsAt: string;
  expiresAt: string;
  appliesTo: PromoApplies;
};

export const EMPTY_PROMO_DRAFT: PromoDraft = {
  name: "",
  code: "",
  kind: "percent",
  value: "15",
  usageLimit: "100",
  startsAt: "",
  expiresAt: "",
  appliesTo: "all",
};

export function packageLabel(id: PackageId): string {
  if (id === "basic") return "Basic";
  if (id === "bulk") return "Bulk";
  return "Pro Manager";
}

export function appliesLabel(applies: PromoApplies): string {
  return applies === "all" ? "All packs" : packageLabel(applies);
}

export function statusLabel(status: PromoStatus): string {
  if (status === "active") return "Active";
  if (status === "scheduled") return "Scheduled";
  if (status === "paused") return "Paused";
  return "Expired";
}

export function bonusCredits(base: number, bonusPct: number): number {
  return Math.floor((base * bonusPct) / 100);
}

export function awardedCredits(pack: CreditPackage): {
  post: number;
  boost: number;
} {
  return {
    post: pack.basePostCredits + bonusCredits(pack.basePostCredits, pack.bonusPct),
    boost: pack.baseBoostCredits + bonusCredits(pack.baseBoostCredits, pack.bonusPct),
  };
}

export function totalAwarded(pack: CreditPackage): number {
  const next = awardedCredits(pack);
  return next.post + next.boost;
}

export function usdPerCredit(pack: CreditPackage): number {
  const total = totalAwarded(pack);
  if (total <= 0) return 0;
  return pack.priceUsd / total;
}

export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatLbp(amount: number): string {
  return `${Math.round(amount).toLocaleString("en-US")} LBP`;
}

export function lbpQuote(usd: number, engine: PricingEngine): number {
  const raw = usd * engine.marketLbp * (1 + engine.bufferPct / 100);
  if (engine.roundTo <= 0) return Math.round(raw);
  return Math.round(raw / engine.roundTo) * engine.roundTo;
}

export function formatDay(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function usageRatio(promo: PromoCode): number {
  if (promo.usageLimit <= 0) return 0;
  return Math.min(1, promo.usageCount / promo.usageLimit);
}

export function discountLabel(promo: PromoCode): string {
  if (promo.kind === "percent") return `${promo.value}% off`;
  return `${formatUsd(promo.value)} off`;
}

export function suggestCode(name: string): string {
  const stem = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 10);
  return stem ? `${stem}26` : "SKN26";
}

export function deriveStatus(
  promo: Pick<PromoCode, "startsAt" | "expiresAt" | "status">,
  now = new Date(),
): PromoStatus {
  if (promo.status === "paused") return "paused";
  const start = new Date(`${promo.startsAt}T00:00:00`);
  const end = new Date(`${promo.expiresAt}T23:59:59`);
  if (now < start) return "scheduled";
  if (now > end) return "expired";
  return "active";
}

export type CatalogType = "starter" | "bundle_5" | "boost_pack";
export type PromoStatus = "active" | "scheduled" | "paused" | "expired";
export type PromoFilter = PromoStatus | "all";
export type DiscountKind = "percent" | "amount";
export type PromoActionKind = "copy" | "pause" | "resume" | "expire";
export type LbpRound = 0 | 10000 | 50000;

export const CATALOG_TYPES: CatalogType[] = [
  "starter",
  "bundle_5",
  "boost_pack",
];

export type CreditPackage = {
  id: CatalogType;
  name: string;
  tagline: string;
  basePostCredits: number;
  baseBoostCredits: number;
  bonusPct: number;
  priceUsd: number;
  active: boolean;
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

export type PromoApplies = "all" | CatalogType;

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

export type PricingSnapshot = {
  engine: PricingEngine;
  packages: CreditPackage[];
  promos: PromoCode[];
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

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function defaultPromoDraft(): PromoDraft {
  const start = todayIso();
  const end = new Date();
  end.setDate(end.getDate() + 21);
  return {
    ...EMPTY_PROMO_DRAFT,
    startsAt: start,
    expiresAt: end.toISOString().slice(0, 10),
  };
}

export function packLabel(id: CatalogType): string {
  if (id === "starter") return "Starter";
  if (id === "bundle_5") return "5-pack";
  return "Boost Pack";
}

export function skuChip(id: CatalogType): string {
  if (id === "starter") return "Starter SKU";
  if (id === "bundle_5") return "Volume SKU";
  return "Boost SKU";
}

export function appliesLabel(applies: PromoApplies): string {
  return applies === "all" ? "All packs" : packLabel(applies);
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

export function usdPerPostCredit(pack: CreditPackage): number {
  const next = awardedCredits(pack);
  if (next.post <= 0) return 0;
  return pack.priceUsd / next.post;
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

export function isUsageCapped(promo: Pick<PromoCode, "usageCount" | "usageLimit">): boolean {
  return promo.usageLimit > 0 && promo.usageCount >= promo.usageLimit;
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
  promo: Pick<
    PromoCode,
    "startsAt" | "expiresAt" | "status" | "usageCount" | "usageLimit"
  >,
  now = new Date(),
): PromoStatus {
  if (promo.status === "paused") return "paused";
  if (promo.status === "expired") return "expired";
  if (isUsageCapped(promo)) return "expired";
  const start = new Date(`${promo.startsAt}T00:00:00`);
  const end = new Date(`${promo.expiresAt}T23:59:59`);
  if (now < start) return "scheduled";
  if (now > end) return "expired";
  return "active";
}

export function maxAmountOff(
  packages: CreditPackage[],
  appliesTo: PromoApplies,
): number {
  const rows = packages.filter(
    (pack) => pack.active && (appliesTo === "all" || pack.id === appliesTo),
  );
  if (rows.length === 0) return 0;
  return Math.max(...rows.map((pack) => pack.priceUsd));
}

export function starterPack(packages: CreditPackage[]): CreditPackage | undefined {
  return packages.find((pack) => pack.id === "starter");
}

export function cheapestPostUsd(packages: CreditPackage[]): number {
  return packages.reduce((best, pack) => {
    const unit = usdPerPostCredit(pack);
    return unit > 0 && unit < best ? unit : best;
  }, Number.POSITIVE_INFINITY);
}

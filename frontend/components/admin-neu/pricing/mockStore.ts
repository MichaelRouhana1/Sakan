import { DEFAULT_ENGINE, MOCK_PACKAGES, MOCK_PROMOS } from "./mockPricing";
import {
  deriveStatus,
  formatUsd,
  maxAmountOff,
  todayIso,
  type CatalogType,
  type CreditPackage,
  type PricingEngine,
  type PricingSnapshot,
  type PromoCode,
  type PromoDraft,
} from "./types";

function clone<T>(value: T): T {
  return structuredClone(value);
}

type Store = {
  engine: PricingEngine;
  packages: CreditPackage[];
  promos: PromoCode[];
};

let store: Store = {
  engine: clone(DEFAULT_ENGINE),
  packages: clone(MOCK_PACKAGES),
  promos: clone(MOCK_PROMOS),
};

export function resetPricingMockStore(): void {
  store = {
    engine: clone(DEFAULT_ENGINE),
    packages: clone(MOCK_PACKAGES),
    promos: clone(MOCK_PROMOS),
  };
}

export function getPricingFromStore(): PricingSnapshot {
  return clone(store);
}

function normalizePackages(packages: CreditPackage[]): CreditPackage[] {
  const featuredId = [...packages].reverse().find((pack) => pack.featured)?.id;
  return packages.map((pack) => ({
    ...pack,
    featured: pack.id === featuredId,
  }));
}

export function putPricingConfigInStore(
  engine: PricingEngine,
  packages: CreditPackage[],
): PricingSnapshot {
  store.engine = clone(engine);
  store.packages = clone(normalizePackages(packages));
  return getPricingFromStore();
}

export function setPackageActiveInStore(
  id: CatalogType,
  active: boolean,
): CreditPackage {
  const row = store.packages.find((pack) => pack.id === id);
  if (!row) throw new Error(`Package not found: ${id}`);
  const next = { ...row, active };
  store.packages = store.packages.map((pack) => (pack.id === id ? next : pack));
  return clone(next);
}

export function setFeaturedInStore(id: CatalogType): CreditPackage {
  const row = store.packages.find((pack) => pack.id === id);
  if (!row) throw new Error(`Package not found: ${id}`);
  store.packages = store.packages.map((pack) => ({
    ...pack,
    featured: pack.id === id,
  }));
  const next = store.packages.find((pack) => pack.id === id);
  if (!next) throw new Error(`Package not found: ${id}`);
  return clone(next);
}

function findPromoOrThrow(id: string): PromoCode {
  const row = store.promos.find((item) => item.id === id);
  if (!row) throw new Error(`Promo not found: ${id}`);
  return row;
}

function replacePromo(id: string, next: PromoCode): PromoCode {
  store.promos = store.promos.map((row) => (row.id === id ? next : row));
  return next;
}

export function issuePromoInStore(draft: PromoDraft): PromoCode {
  const code = draft.code.trim().toUpperCase();
  if (code.length < 4) throw new Error("Code must be at least 4 characters");
  if (store.promos.some((row) => row.code === code)) {
    throw new Error(`Code ${code} already exists`);
  }
  const name = draft.name.trim();
  if (name.length < 3) throw new Error("Name must be at least 3 characters");
  const value = Number(draft.value);
  const cap = Math.floor(Number(draft.usageLimit));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Discount must be greater than 0");
  }
  if (draft.kind === "percent" && value > 80) {
    throw new Error("Percent off cannot exceed 80");
  }
  if (draft.kind === "amount") {
    const max = maxAmountOff(store.packages, draft.appliesTo);
    if (value > max) {
      throw new Error(`USD off cannot exceed ${formatUsd(max)}`);
    }
  }
  if (!Number.isFinite(cap) || cap < 1) {
    throw new Error("Usage limit must be at least 1");
  }
  if (!draft.startsAt || !draft.expiresAt || draft.expiresAt < draft.startsAt) {
    throw new Error("Expiry must be on or after start");
  }

  const next: PromoCode = {
    id: `promo-${Date.now()}`,
    code,
    name,
    kind: draft.kind,
    value,
    usageLimit: cap,
    usageCount: 0,
    startsAt: draft.startsAt,
    expiresAt: draft.expiresAt,
    status: "active",
    appliesTo: draft.appliesTo,
  };
  next.status = deriveStatus(next);
  store.promos = [next, ...store.promos];
  return clone(next);
}

export function pausePromoInStore(id: string): PromoCode {
  const row = findPromoOrThrow(id);
  const live = deriveStatus(row);
  if (live === "expired") {
    throw new Error("Cannot pause an expired campaign");
  }
  return clone(replacePromo(id, { ...row, status: "paused" }));
}

export function resumePromoInStore(id: string): PromoCode {
  const row = findPromoOrThrow(id);
  if (row.status !== "paused") {
    throw new Error("Only paused campaigns can resume");
  }
  const next: PromoCode = { ...row, status: "active" };
  next.status = deriveStatus(next);
  return clone(replacePromo(id, next));
}

export function endPromoInStore(id: string): PromoCode {
  const row = findPromoOrThrow(id);
  if (deriveStatus(row) === "expired" && row.status === "expired") {
    throw new Error("Campaign already ended");
  }
  return clone(
    replacePromo(id, {
      ...row,
      status: "expired",
      expiresAt: todayIso(),
    }),
  );
}

/**
 * API-shaped pricing source.
 * Today: in-memory mock store + 150ms delay.
 *
 * Mapping to current backend (honest):
 * - No admin pricing module. Catalog is hardcoded BUNDLE_CATALOG
 *   in backend/src/modules/credits/credits.schemas.ts.
 * - Poster buy screen still reads frontend/constants/bundles.ts.
 * - POST /api/credits/purchase ignores this UI; amounts come from BUNDLE_CATALOG.
 * - No promo_codes table or discount on checkout.
 *
 * Later, keep these signatures and swap bodies to:
 * - GET    /api/admin/pricing
 * - PUT    /api/admin/pricing/engine
 * - PATCH  /api/admin/pricing/packages/:bundleType
 * - GET/POST /api/admin/promos
 * - POST   /api/admin/promos/:id/pause|resume|end
 * - Later public GET /api/credits/catalog (poster + admin share)
 */
import {
  endPromoInStore,
  getPricingFromStore,
  issuePromoInStore,
  pausePromoInStore,
  putPricingConfigInStore,
  resumePromoInStore,
} from "./mockStore";
import type {
  CreditPackage,
  PricingEngine,
  PricingSnapshot,
  PromoCode,
  PromoDraft,
} from "./types";

const MOCK_DELAY_MS = 150;

async function delay(ms = MOCK_DELAY_MS): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getAdminPricing(): Promise<PricingSnapshot> {
  await delay();
  return getPricingFromStore();
}

export async function putAdminPricingConfig(
  engine: PricingEngine,
  packages: CreditPackage[],
): Promise<PricingSnapshot> {
  await delay();
  return putPricingConfigInStore(engine, packages);
}

export async function createAdminPromo(draft: PromoDraft): Promise<PromoCode> {
  await delay();
  return issuePromoInStore(draft);
}

export async function pauseAdminPromo(id: string): Promise<PromoCode> {
  await delay();
  return pausePromoInStore(id);
}

export async function resumeAdminPromo(id: string): Promise<PromoCode> {
  await delay();
  return resumePromoInStore(id);
}

export async function endAdminPromo(id: string): Promise<PromoCode> {
  await delay();
  return endPromoInStore(id);
}

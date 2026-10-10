import { z } from "zod";

export const PROMOTION_CREDIT_SCALE = 100;

const productSchema = z.object({
  id: z.string().regex(/^(featured|bump)_\d+$/),
  type: z.enum(["featured", "bump"]),
  durationDays: z.number().int().positive(),
  creditUnits: z.number().int().positive().max(100_000_000),
  pausable: z.boolean(),
  priceStatus: z.enum(["tbd", "published"]),
}).strict();

const promotionPackSchema = z.object({
  id: z.string().regex(/^promotion_[a-z0-9_]+$/),
  title: z.string().min(1).max(80),
  creditUnits: z.number().int().positive().max(100_000_000),
  amountUsdCents: z.number().int().positive().nullable(),
  priceStatus: z.enum(["tbd", "published"]),
}).strict();

export const promotionCatalogConfigSchema = z.object({
  version: z.string().min(1).max(80),
  salesEnabled: z.boolean(),
  capacity: z.number().int().min(1).max(3).default(3),
  undoMinutes: z.number().int().min(1).max(60).default(15),
  products: z.array(productSchema).length(6),
  packs: z.array(promotionPackSchema).min(1).max(10),
}).strict().superRefine((catalog, ctx) => {
  const required = ["featured_3", "featured_7", "featured_14", "featured_30", "bump_3", "bump_7"];
  if (new Set(catalog.products.map((p) => p.id)).size !== 6 || required.some((id) => !catalog.products.some((p) => p.id === id))) {
    ctx.addIssue({ code: "custom", message: "All six promotion durations must be configured once" });
  }
  for (const product of catalog.products) {
    if (product.id !== `${product.type}_${product.durationDays}` || product.pausable !== (product.type === "featured" && product.durationDays >= 14)) {
      ctx.addIssue({ code: "custom", message: "Invalid product duration or pause configuration" });
    }
  }
  if (new Set(catalog.packs.map((p) => p.id)).size !== catalog.packs.length) {
    ctx.addIssue({ code: "custom", message: "Pack identifiers must be unique" });
  }
  if (catalog.packs.some((p) => p.priceStatus === "published" && p.amountUsdCents == null)) {
    ctx.addIssue({ code: "custom", message: "Published packs require a cash price" });
  }
  if (catalog.salesEnabled && (catalog.products.some((p) => p.priceStatus !== "published") || catalog.packs.some((p) => p.priceStatus !== "published"))) {
    ctx.addIssue({ code: "custom", message: "Publish real prices before enabling promotion sales" });
  }
  for (const type of ["featured", "bump"] as const) {
    const products = catalog.products.filter((p) => p.type === type).sort((a, b) => a.durationDays - b.durationDays);
    if (products.some((p, i) => i > 0 && p.creditUnits / p.durationDays >= products[i - 1]!.creditUnits / products[i - 1]!.durationDays)) {
      ctx.addIssue({ code: "custom", message: "Longer runs must cost less per day" });
    }
  }
  const packs = catalog.packs.filter((p) => p.priceStatus === "published" && p.amountUsdCents != null).sort((a, b) => a.creditUnits - b.creditUnits);
  if (packs.some((p, i) => i > 0 && p.amountUsdCents! / p.creditUnits >= packs[i - 1]!.amountUsdCents! / packs[i - 1]!.creditUnits)) {
    ctx.addIssue({ code: "custom", message: "Bulk packs must cost less per credit" });
  }
});

export type PromotionCatalogConfig = z.infer<typeof promotionCatalogConfigSchema>;

/** Development placeholders only. Set PROMOTION_CATALOG_JSON to publish an owner-approved version. */
export const DEFAULT_PROMOTION_CATALOG: PromotionCatalogConfig = {
  version: "promotions-v1-tbd",
  salesEnabled: false,
  capacity: 3,
  undoMinutes: 15,
  products: [
    { id: "featured_3", type: "featured", durationDays: 3, creditUnits: 600, pausable: false, priceStatus: "tbd" },
    { id: "featured_7", type: "featured", durationDays: 7, creditUnits: 1200, pausable: false, priceStatus: "tbd" },
    { id: "featured_14", type: "featured", durationDays: 14, creditUnits: 2100, pausable: true, priceStatus: "tbd" },
    { id: "featured_30", type: "featured", durationDays: 30, creditUnits: 3600, pausable: true, priceStatus: "tbd" },
    { id: "bump_3", type: "bump", durationDays: 3, creditUnits: 100, pausable: false, priceStatus: "tbd" },
    { id: "bump_7", type: "bump", durationDays: 7, creditUnits: 200, pausable: false, priceStatus: "tbd" },
  ],
  packs: [
    { id: "promotion_12", title: "Promotion credits", creditUnits: 1200, amountUsdCents: null, priceStatus: "tbd" },
    { id: "promotion_60", title: "Host pack", creditUnits: 6000, amountUsdCents: null, priceStatus: "tbd" },
    { id: "promotion_150", title: "Dorm & broker pack", creditUnits: 15000, amountUsdCents: null, priceStatus: "tbd" },
  ],
};

export function getPromotionCatalog(raw = process.env.PROMOTION_CATALOG_JSON) {
  const config = promotionCatalogConfigSchema.parse(raw ? JSON.parse(raw) : DEFAULT_PROMOTION_CATALOG);
  return { ...config, salesEnabled: config.salesEnabled && process.env.PROMOTION_PLACEMENT_ENABLED === 'true', products: config.products.map((p) => ({ ...p, credits: p.creditUnits / PROMOTION_CREDIT_SCALE })) };
}

export function getPromotionProduct(id: string) {
  return getPromotionCatalog().products.find((product) => product.id === id);
}

export function getCreditCatalog() {
  const promotions = getPromotionCatalog();
  const promotionPacks = promotions.packs.map((pack) => ({
    ...pack, kind: "promotion" as const, postCredits: 0,
    boostCredits: pack.creditUnits / PROMOTION_CREDIT_SCALE,
    enabled: promotions.salesEnabled && pack.priceStatus === "published",
    description: "Use for Featured or Bump on an eligible listing.",
  }));
  const published = promotionPacks.filter((p) => p.enabled && p.amountUsdCents != null).sort((a, b) => a.creditUnits - b.creditUnits);
  const baseRate = published[0] ? published[0].amountUsdCents! / published[0].boostCredits : null;
  return {
    version: promotions.version,
    promotions,
    autoRenewDefault: false,
    packs: [
      { id: "starter", title: "Starter", kind: "post" as const, description: "One additional listing, live for 30 days.", postCredits: 1, boostCredits: 0, creditUnits: 0, amountUsdCents: 1000, priceStatus: "published" as const, enabled: true, savingsPercent: 0 },
      { id: "bundle_5", title: "Five posts", kind: "post" as const, description: "Five additional listings, live for 30 days each.", postCredits: 5, boostCredits: 0, creditUnits: 0, amountUsdCents: 1500, priceStatus: "published" as const, enabled: true, savingsPercent: 70 },
      ...promotionPacks.map((p) => ({ ...p, savingsPercent: baseRate && p.amountUsdCents != null ? Math.max(0, Math.round((1 - p.amountUsdCents / p.boostCredits / baseRate) * 100)) : 0 })),
    ],
  };
}

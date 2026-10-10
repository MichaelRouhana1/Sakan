import type { PromotionCampaign, PromotionMarket, PromotionProduct, PromotionStatus } from "../../types/promotions";

export const OPEN_PROMOTION_STATUSES: PromotionStatus[] = ["active", "queued", "paused", "action_needed"];

export const PROMOTION_STATUS_LABELS: Record<PromotionStatus, string> = {
  active: "Active", queued: "In the queue", paused: "Paused", action_needed: "Action needed",
  completed: "Completed", stopped: "Stopped", refunded: "Refunded", cancelled: "Cancelled",
};

export function formatPromotionCredits(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function promotionMode(product: PromotionProduct, market?: PromotionMarket): "start" | "queue" {
  return product.type === "featured" && (!market || market.availableSlots <= 0 || market.queueLength > 0) ? "queue" : "start";
}

export function canUndoPromotion(campaign: PromotionCampaign, now = Date.now()): boolean {
  return campaign.spentUnits > campaign.refundedUnits && campaign.undoUntil != null && new Date(campaign.undoUntil).getTime() > now;
}

export function promotionPriceSaving(product: PromotionProduct, products: PromotionProduct[]): number {
  const shortest = products.filter((item) => item.type === product.type).sort((a, b) => a.durationDays - b.durationDays)[0];
  if (!shortest || shortest.durationDays === product.durationDays || shortest.credits <= 0) return 0;
  return Math.max(0, Math.round((1 - (product.credits / product.durationDays) / (shortest.credits / shortest.durationDays)) * 100));
}

export function promotionRemainingLabel(seconds: number): string {
  if (seconds <= 0) return "No paid time left";
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} min of paid time left`;
  if (seconds < 86400) return `${Math.ceil(seconds / 3600)} hours of paid time left`;
  return `${(seconds / 86400).toLocaleString("en-US", { maximumFractionDigits: 1 })} days of paid time left`;
}

export function promotionDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", { timeZone: "Asia/Beirut", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function promotionExpiresDuringRun(expiresAt: string | null, days: number, now = Date.now()): boolean {
  return expiresAt != null && new Date(expiresAt).getTime() < now + days * 86400_000;
}

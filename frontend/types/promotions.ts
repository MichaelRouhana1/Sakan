export type PromotionType = "featured" | "bump";
export type PromotionStatus = "queued" | "active" | "paused" | "action_needed" | "completed" | "stopped" | "refunded" | "cancelled";

export type PromotionProduct = {
  id: string;
  type: PromotionType;
  durationDays: number;
  creditUnits: number;
  credits: number;
  pausable: boolean;
  priceStatus: "tbd" | "published";
};

export type PromotionCatalog = {
  version: string;
  salesEnabled: boolean;
  undoMinutes: number;
  products: PromotionProduct[];
};

export type PromotionMarket = {
  key: string;
  kind: "area" | "campus";
  label: string;
  availableSlots: number;
  capacity: number;
  queueLength: number;
  nextOpeningAt: string | null;
};

export type PromotionCampaign = {
  id: string;
  listingId: string | null;
  listingTitle: string;
  type: PromotionType;
  productId: string;
  durationDays: number;
  pausable: boolean;
  marketKey: string | null;
  marketLabel: string | null;
  status: PromotionStatus;
  creditUnits: number;
  credits: number;
  spentUnits: number;
  spentCredits: number;
  refundedUnits: number;
  refundedCredits: number;
  remainingSeconds: number;
  startedAt: string | null;
  endsAt: string | null;
  undoUntil: string | null;
  lastBumpedAt: string | null;
  nextBumpAt: string | null;
  queuedAt: string | null;
  queuePosition: number | null;
  autoRenew: boolean;
  stopReason: string | null;
  createdAt: string;
};

export type PromotionOptions = {
  listingId: string;
  listingTitle: string;
  eligible: boolean;
  reasons: string[];
  markets: PromotionMarket[];
  balanceCredits: number;
  balanceUnits: number;
  expiresAt: string | null;
  currentCampaign: PromotionCampaign | null;
};

export type CreatePromotionInput = {
  listingId: string;
  productId: string;
  marketKey?: string;
  mode: "start" | "queue";
  autoRenew: boolean;
  catalogVersion: string;
  idempotencyKey: string;
};

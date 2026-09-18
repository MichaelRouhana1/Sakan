import type { ReactNode } from "react";
import type { CardBadgeDropTarget } from "@/lib/cardBadgeSelection";
import type { ListingAmberPill } from "@/lib/listingCardBadges";

export type BadgeDragSource = "card" | "pool";
export type CardBadgeDragOptions = {
  pills: ListingAmberPill[];
  onDrop: (key: string, target: CardBadgeDropTarget) => void;
};
export type CardBadgeDrag = {
  activeKey: string | null;
  target: CardBadgeDropTarget;
  zoneProps: (zone: BadgeDragSource) => Record<string, unknown>;
  badgeProps: (key: string, source: BadgeDragSource) => Record<string, unknown>;
  overlay: ReactNode;
};

import type { CardBadgeDrag, CardBadgeDragOptions } from "./useCardBadgeDrag.types";

/** Native apps use the same editor's tap and accessible reorder controls. */
export function useCardBadgeDrag(_options: CardBadgeDragOptions): CardBadgeDrag {
  return {
    activeKey: null,
    target: null,
    zoneProps: () => ({}),
    badgeProps: () => ({}),
    markerProps: () => ({}),
    handleProps: () => ({}),
    overlay: null,
  };
}

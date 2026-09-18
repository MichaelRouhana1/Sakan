export const GRID_TAG_LIMIT = 6;

export const CARD_BADGE_FULL_MESSAGE = "Remove a badge before adding another.";

export type CardBadgeDropTarget =
  | { zone: "card"; index: number }
  | { zone: "pool" }
  | null;

/** Index is an insertion boundary in the current (pre-drag) card order. */
export function applyCardBadgeDrop(
  keys: string[],
  key: string,
  target: CardBadgeDropTarget,
): { keys: string[]; full: boolean } {
  if (!target) return { keys, full: false };
  if (target.zone === "pool") {
    return { keys: keys.filter((value) => value !== key), full: false };
  }
  const from = keys.indexOf(key);
  if (from < 0 && keys.length >= GRID_TAG_LIMIT) return { keys, full: true };
  const next = keys.filter((value) => value !== key);
  const index = Math.max(0, Math.min(
    next.length,
    target.index - (from >= 0 && from < target.index ? 1 : 0),
  ));
  next.splice(index, 0, key);
  return { keys: next, full: false };
}

/** Keep eligibility, uniqueness and order; preserve an explicitly empty choice. */
export function normalizeCardBadgeSelection(
  keys: string[] | null | undefined,
  defaults: string[],
  eligible: string[],
): string[] {
  const allowed = new Set(eligible);
  return [...new Set(keys ?? defaults)]
    .filter((key) => allowed.has(key))
    .slice(0, GRID_TAG_LIMIT);
}

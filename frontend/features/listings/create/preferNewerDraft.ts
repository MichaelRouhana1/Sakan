import type { DraftCheckpoint } from "./draft";

/** Tie goes to `left`, so pass the device copy first. */
export function preferNewerDraft(
  left: DraftCheckpoint | null,
  right: DraftCheckpoint | null,
): DraftCheckpoint | null {
  if (!left) return right;
  if (!right) return left;
  return left.savedAt >= right.savedAt ? left : right;
}

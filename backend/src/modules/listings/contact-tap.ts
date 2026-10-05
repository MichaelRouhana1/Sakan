/** Collapse double-taps. Short enough that a shared campus IP rarely merges two people. */
export const CONTACT_TAP_DEDUPE_MS = 15_000;

export function contactTapActorKey(
  listingId: string,
  actor: { userId?: string | null; ip?: string | null },
): string | null {
  const userId = actor.userId?.trim();
  if (userId) return `${listingId}:user:${userId}`;
  const ip = actor.ip?.trim();
  if (ip) return `${listingId}:ip:${ip}`;
  return null;
}

/**
 * Active listings increment. Anything else keeps the stored lifetime total.
 * A recent tap from the same user or IP does not increment again.
 */
export function planContactTap(input: {
  found: boolean;
  status: string;
  leadCount: number;
  withinDedupeWindow: boolean;
}):
  | { type: "not_found" }
  | { type: "unchanged"; leadCount: number }
  | { type: "increment" } {
  if (!input.found) return { type: "not_found" };
  const leadCount = Number.isFinite(input.leadCount)
    ? Math.max(0, Math.floor(input.leadCount))
    : 0;
  if (input.status !== "active" || input.withinDedupeWindow) {
    return { type: "unchanged", leadCount };
  }
  return { type: "increment" };
}

/** In-memory window. A restart forgets it; the lifetime total in Postgres does not. */
export class ContactTapWindow {
  private last = new Map<string, number>();

  constructor(
    private readonly windowMs = CONTACT_TAP_DEDUPE_MS,
    private readonly now: () => number = Date.now,
  ) {}

  /** True when this tap should add to the lifetime total. */
  claim(key: string | null): boolean {
    if (!key) return true;
    const now = this.now();
    const prev = this.last.get(key);
    if (prev != null && now - prev < this.windowMs) return false;
    this.last.set(key, now);
    this.prune(now);
    return true;
  }

  release(key: string | null) {
    if (!key) return;
    this.last.delete(key);
  }

  private prune(now: number) {
    if (this.last.size < 400) return;
    for (const [key, at] of this.last) {
      if (now - at >= this.windowMs) this.last.delete(key);
    }
  }
}

export const contactTapWindow = new ContactTapWindow();

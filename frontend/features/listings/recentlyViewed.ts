export const RECENTLY_VIEWED_LIMIT = 12;
export const RECENTLY_VIEWED_KEY_PREFIX = "studently.recentlyViewedListings.v1";

export type RecentlyViewedEntry = {
  id: string;
  viewedAt: number;
};

export function recentlyViewedStorageKey(scope: string): string {
  return `${RECENTLY_VIEWED_KEY_PREFIX}:${scope}`;
}

export function parseRecentlyViewed(raw: string | null): RecentlyViewedEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    const list =
      Array.isArray(parsed)
        ? parsed
        : parsed &&
            typeof parsed === "object" &&
            Array.isArray((parsed as { items?: unknown }).items)
          ? (parsed as { items: unknown[] }).items
          : [];
    const seen = new Set<string>();
    const out: RecentlyViewedEntry[] = [];
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const id = (item as { id?: unknown }).id;
      const viewedAt = (item as { viewedAt?: unknown }).viewedAt;
      if (typeof id !== "string" || !id.trim() || seen.has(id)) continue;
      seen.add(id);
      out.push({
        id: id.trim(),
        viewedAt:
          typeof viewedAt === "number" && Number.isFinite(viewedAt)
            ? viewedAt
            : 0,
      });
      if (out.length >= RECENTLY_VIEWED_LIMIT) break;
    }
    return out;
  } catch {
    return [];
  }
}

export function prependRecentlyViewed(
  entries: readonly RecentlyViewedEntry[],
  id: string,
  now = Date.now(),
): RecentlyViewedEntry[] {
  const cleanId = id.trim();
  if (!cleanId) return [...entries].slice(0, RECENTLY_VIEWED_LIMIT);
  const next: RecentlyViewedEntry[] = [{ id: cleanId, viewedAt: now }];
  for (const entry of entries) {
    if (entry.id === cleanId) continue;
    next.push(entry);
    if (next.length >= RECENTLY_VIEWED_LIMIT) break;
  }
  return next;
}

export function visibleRecentlyViewedIds(
  entries: readonly RecentlyViewedEntry[],
  excludeListingId?: string,
): string[] {
  return entries
    .map((entry) => entry.id)
    .filter((id) => Boolean(id) && id !== excludeListingId)
    .slice(0, RECENTLY_VIEWED_LIMIT);
}

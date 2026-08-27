import { MOCK_LISTINGS } from "./mockListings";
import {
  countByQueue,
  listingQueue,
  posterName,
  type AdminListing,
  type ListingActionKind,
  type ListingEditPatch,
  type ListingQueue,
  type ListingSort,
  type ListListingsParams,
  type ListListingsResult,
  type ModerationHistoryEntry,
} from "./types";

function cloneListings(seed: AdminListing[]): AdminListing[] {
  return structuredClone(seed);
}

let store: AdminListing[] = cloneListings(MOCK_LISTINGS);

export function resetMockStore(): void {
  store = cloneListings(MOCK_LISTINGS);
}

export function getStoreSnapshot(): AdminListing[] {
  return store;
}

function nowIso(): string {
  return new Date().toISOString();
}

function historyEntry(
  kind: ModerationHistoryEntry["kind"],
  note: string,
): ModerationHistoryEntry {
  return {
    id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind,
    note,
    at: nowIso(),
    actor: "You",
  };
}

function findOrThrow(id: string): AdminListing {
  const row = store.find((item) => item.id === id);
  if (!row) throw new Error(`Listing not found: ${id}`);
  return row;
}

function replace(id: string, next: AdminListing): AdminListing {
  store = store.map((row) => (row.id === id ? next : row));
  return next;
}

function matchesQuery(row: AdminListing, needle: string): boolean {
  if (!needle) return true;
  const hay =
    `${row.title} ${row.area} ${row.landmark} ${posterName(row)} ${row.poster.email} ${row.id}`.toLowerCase();
  return hay.includes(needle);
}

function sortListings(rows: AdminListing[], sort: ListingSort): AdminListing[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sort === "rent") return b.monthlyRentUsd - a.monthlyRentUsd;
    if (sort === "flags") return b.openReports.length - a.openReports.length;
    if (sort === "expiresAt") {
      const ae = a.expiresAt ? new Date(a.expiresAt).getTime() : Number.POSITIVE_INFINITY;
      const be = b.expiresAt ? new Date(b.expiresAt).getTime() : Number.POSITIVE_INFINITY;
      return ae - be;
    }
    const ap = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bp = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bp - ap;
  });
  return copy;
}

export function listFromStore(params: ListListingsParams = {}): ListListingsResult {
  const queue: ListingQueue = params.queue ?? "all";
  const sort: ListingSort = params.sort ?? "publishedAt";
  const pageSize = params.pageSize ?? 10;
  const page = Math.max(1, params.page ?? 1);
  const needle = params.q?.trim().toLowerCase() ?? "";

  const counts = countByQueue(store);
  const filtered = sortListings(
    store.filter((row) => {
      if (queue !== "all" && listingQueue(row) !== queue) return false;
      return matchesQuery(row, needle);
    }),
    sort,
  );
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return { items, total, page, pageSize, counts };
}

export function getFromStore(id: string): AdminListing {
  return structuredClone(findOrThrow(id));
}

export function applyStatusAction(
  id: string,
  kind: Extract<ListingActionKind, "archive" | "remove" | "restore">,
  note: string,
): AdminListing {
  const row = findOrThrow(id);

  if (kind === "archive") {
    if (row.status !== "active") {
      throw new Error("Listing is not active");
    }
    return replace(id, {
      ...row,
      status: "archived",
      openReports: [],
      moderationHistory: [...row.moderationHistory, historyEntry("archive", note)],
    });
  }

  if (kind === "remove") {
    if (row.status === "draft") {
      throw new Error("Draft listings cannot be removed");
    }
    if (row.status === "removed") {
      return structuredClone(row);
    }
    return replace(id, {
      ...row,
      status: "removed",
      openReports: [],
      moderationHistory: [...row.moderationHistory, historyEntry("remove", note)],
    });
  }

  if (row.status !== "archived") {
    throw new Error("Only archived listings can be restored");
  }
  return replace(id, {
    ...row,
    status: "active",
    moderationHistory: [...row.moderationHistory, historyEntry("restore", note)],
  });
}

export function dismissReportsInStore(id: string, note: string): AdminListing {
  const row = findOrThrow(id);
  return replace(id, {
    ...row,
    openReports: [],
    moderationHistory: [
      ...row.moderationHistory,
      historyEntry("dismiss_reports", note),
    ],
  });
}

export function updateInStore(id: string, patch: ListingEditPatch, note: string): AdminListing {
  const row = findOrThrow(id);
  if (row.status === "removed") {
    throw new Error("Removed listings cannot be edited");
  }
  return replace(id, {
    ...row,
    title: patch.title,
    description: patch.description,
    area: patch.area,
    landmark: patch.landmark,
    monthlyRentUsd: patch.monthlyRentUsd,
    listingType: patch.listingType,
    contactName: patch.contactName,
    contactPhone: patch.contactPhone,
    whatsappNumber: patch.whatsappNumber,
    electricity: patch.electricity,
    water: patch.water,
    wifiIncluded: patch.wifiIncluded,
    bedrooms: patch.bedrooms,
    bathrooms: patch.bathrooms,
    moderationHistory: [
      ...row.moderationHistory,
      historyEntry("edit", note || "Updated listing details"),
    ],
  });
}

export function setPhotoFlagInStore(
  listingId: string,
  photoId: string,
  flagged: boolean,
  note: string,
): AdminListing {
  const row = findOrThrow(listingId);
  if (row.status === "removed") {
    throw new Error("Removed listings cannot be edited");
  }
  const photos = row.photos.map((photo) =>
    photo.id === photoId ? { ...photo, flagged } : photo,
  );
  return replace(listingId, {
    ...row,
    photos,
    moderationHistory: [
      ...row.moderationHistory,
      historyEntry(flagged ? "flag_photo" : "clear_photo_flag", note),
    ],
  });
}

export function bulkInStore(
  ids: string[],
  kind: Extract<ListingActionKind, "archive" | "remove" | "dismiss_reports">,
  note: string,
): AdminListing[] {
  const results: AdminListing[] = [];
  for (const id of ids) {
    try {
      if (kind === "dismiss_reports") {
        results.push(dismissReportsInStore(id, note));
      } else {
        results.push(applyStatusAction(id, kind, note));
      }
    } catch {
      // Skip rows that cannot accept this action (e.g. archive on non-active).
    }
  }
  return results;
}

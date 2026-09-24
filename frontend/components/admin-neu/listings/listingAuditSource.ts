import { api } from "@/lib/api";

export const LISTING_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLiveListingId(id: string): boolean {
  return LISTING_UUID_RE.test(id);
}

export type ListingAuditActorKind = "poster" | "admin" | "system";
export type ListingEditClass = "soft" | "hard" | "mixed";
export type ListingUpdateAuditChannel = "host_patch" | "admin_patch";

export type ListingUpdateAuditPayload = {
  channel: ListingUpdateAuditChannel;
  editClass: ListingEditClass;
  withinStructuralWindow: boolean;
  changedKeys: string[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  publishedAt: string | null;
};

export type ListingAuditEvent = {
  id: string;
  actorKind: ListingAuditActorKind;
  actorClerkId: string | null;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  payload: ListingUpdateAuditPayload;
  createdAt: string;
};

export type ListingAuditPage = {
  data: ListingAuditEvent[];
  nextOffset: number | null;
};

export async function listListingAudit(
  listingId: string,
  params: { limit?: number; offset?: number } = {},
): Promise<ListingAuditPage> {
  const { data } = await api.get<ListingAuditPage>(
    `/api/admin/listings/${encodeURIComponent(listingId)}/audit`,
    { params },
  );
  return data;
}

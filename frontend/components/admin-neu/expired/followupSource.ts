import { api } from "@/lib/api";
import type { ExpiryFollowup } from "./followupTypes";

type FollowupsResponse = { data: ExpiryFollowup[] };
type FollowupResponse = { data: ExpiryFollowup | null };

export async function listExpiryFollowups() {
  const { data } = await api.get<FollowupsResponse>("/api/admin/expiry-followups");
  return data.data;
}

export async function markExpiryFollowupContacted(row: ExpiryFollowup) {
  const { data } = await api.post<FollowupResponse>(
    `/api/admin/expiry-followups/${encodeURIComponent(row.listingId)}/contacted`,
    {
      cycleExpiresAt: row.cycleExpiresAt,
      adminNote: "Contacted personally by staff",
    },
  );
  return data.data;
}

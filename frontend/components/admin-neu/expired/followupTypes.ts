export type FollowupQueue = "all" | "awaiting_host" | "renewal_stalled" | "resolved";

export type DeliveryHistoryItem = {
  kind: "pre_expiry" | "expiry_prompt" | "admin_escalation";
  channel: "push" | "email" | "admin_inbox";
  status: "pending" | "sent" | "skipped" | "failed";
  attempts: number;
  sentAt: string | null;
  error: string | null;
};

export type ContactNumber = { e164?: string; whatsapp?: boolean };

export type ExpiryFollowup = {
  id: string;
  listingId: string;
  cycleExpiresAt: string;
  escalatedAt: string;
  title: string;
  area: string;
  monthlyRentUsd: number;
  listingStatus: string;
  contactName: string;
  whatsappNumber: string | null;
  contactPhone: string | null;
  contactNumbers: ContactNumber[] | null;
  posterId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  coverUrl: string | null;
  intent: "renew_intent" | "improve_intent" | null;
  outcome: "rented" | "renewed" | "archived" | "unknown" | null;
  deliveryHistory: DeliveryHistoryItem[];
  contacted: boolean;
  queue: Exclude<FollowupQueue, "all">;
};

export function hostName(row: ExpiryFollowup) {
  return [row.firstName, row.lastName].filter(Boolean).join(" ") || row.contactName;
}

export function whatsappContact(row: ExpiryFollowup) {
  const fromArray = row.contactNumbers?.find((number) => number.whatsapp)?.e164;
  return row.whatsappNumber || fromArray || row.contactPhone || null;
}

export function queueLabel(queue: FollowupQueue) {
  if (queue === "all") return "All";
  if (queue === "awaiting_host") return "Awaiting host";
  if (queue === "renewal_stalled") return "Renewal stalled";
  return "Resolved";
}

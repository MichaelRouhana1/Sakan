export type BroadcastChannel = "in_app" | "email";
export type BroadcastAudience = "all" | "renters" | "posters" | "unverified";

export type NudgeChannel = "in_app" | "email" | "both";

export type FeedbackCategory = "feature" | "bug" | "general";
export type FeedbackQueue = "unread" | "read" | "archived";
export type FeedbackActionKind = "reply" | "read" | "archive";

export type LifecycleNudge = {
  id: string;
  title: string;
  trigger: string;
  channel: NudgeChannel;
  audience: string;
  enabled: boolean;
  lastFiredAt: string | null;
  sent30d: number;
};

export type FeedbackItem = {
  id: string;
  category: FeedbackCategory;
  queue: FeedbackQueue;
  message: string;
  createdAt: string;
  repliedAt: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    campus: string;
  };
};

export const AUDIENCE_OPTIONS: { id: BroadcastAudience; label: string; hint: string }[] = [
  { id: "all", label: "All users", hint: "Every account on Skoun" },
  { id: "renters", label: "Renters only", hint: "Seeking a place" },
  { id: "posters", label: "Posters only", hint: "Listing hosts" },
  { id: "unverified", label: "Unverified email", hint: "Campus domain pending" },
];

export function personName(item: FeedbackItem): string {
  return `${item.user.firstName} ${item.user.lastName}`.trim();
}

export function initials(item: FeedbackItem): string {
  return `${item.user.firstName.charAt(0)}${item.user.lastName.charAt(0)}`.toUpperCase();
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function categoryLabel(category: FeedbackCategory): string {
  if (category === "feature") return "Feature";
  if (category === "bug") return "Bug";
  return "General";
}

export function queueLabel(queue: FeedbackQueue): string {
  if (queue === "unread") return "Unread";
  if (queue === "read") return "Read";
  return "Archived";
}

export function channelLabel(channel: NudgeChannel | BroadcastChannel): string {
  if (channel === "in_app") return "In-app";
  if (channel === "email") return "Email";
  return "In-app + email";
}

export function previewText(message: string, max = 72): string {
  const compact = message.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max).trim()}…`;
}

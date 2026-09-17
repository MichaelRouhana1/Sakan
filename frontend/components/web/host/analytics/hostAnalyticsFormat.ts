import type { HostAnalyticsListing } from "@/features/listings/hostAnalytics";

export function formatAnalyticsDaysLeft(daysLeft: number | null): string {
  if (daysLeft == null) return "—";
  if (daysLeft < 0) return "Expired";
  if (daysLeft === 0) return "Expires today";
  if (daysLeft === 1) return "1 day left";
  return `${daysLeft} days left`;
}

export function formatAnalyticsAvgViews(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

export function formatAnalyticsViews(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatAnalyticsDate(iso: string | Date | null): string {
  if (iso == null || iso === "") return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const LIVE_RANK = 0;
const OTHER_RANK = 1;

export function sortHostAnalyticsListings(
  listings: HostAnalyticsListing[],
): HostAnalyticsListing[] {
  return [...listings].sort((a, b) => {
    const aLive = a.status === "active" ? LIVE_RANK : OTHER_RANK;
    const bLive = b.status === "active" ? LIVE_RANK : OTHER_RANK;
    if (aLive !== bLive) return aLive - bLive;
    if (b.viewCount !== a.viewCount) return b.viewCount - a.viewCount;
    return a.title.localeCompare(b.title);
  });
}

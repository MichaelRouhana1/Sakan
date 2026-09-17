import type { ListingStatus } from "@/types/listing";

export type HostAnalyticsListing = {
  id: string;
  title: string;
  area: string;
  status: ListingStatus;
  viewCount: number;
  expiresAt: string | null;
  daysLeft: number | null;
  coverUrl: string | null;
  createdAt: string;
  publishedAt: string | null;
  updatedAt: string;
};

export type HostAnalyticsTotals = {
  totalViews: number;
  liveCount: number;
  endingIn7Days: number;
  avgViewsPerLive?: number;
};

export type HostAnalyticsOverview = {
  totals: HostAnalyticsTotals;
  listings: HostAnalyticsListing[];
};

import { useEffect, useState } from "react";
import { useRecentlyViewedListings } from "@/features/listings/useRecentlyViewedListings";
import {
  SIMILAR_MIN_RESULTS,
  useSimilarListings,
} from "@/features/listings/useSimilarListings";

export type DiscoveryTab = "similar" | "recent";

export function useListingDetailDiscovery(listingId: string) {
  const similar = useSimilarListings(listingId, {
    enabled: Boolean(listingId),
  });
  const recent = useRecentlyViewedListings(listingId);
  const [tab, setTab] = useState<DiscoveryTab>("similar");

  useEffect(() => {
    setTab("similar");
  }, [listingId]);

  const similarListings = similar.data ?? [];
  const recentListings = recent.listings;
  const hasSimilar = similarListings.length >= SIMILAR_MIN_RESULTS;
  const hasRecent = recentListings.length > 0;
  const settled = !similar.isLoading;
  const visible = settled && (hasSimilar || hasRecent);
  const showToggle = hasSimilar;
  const activeTab: DiscoveryTab = hasSimilar ? tab : "recent";
  const activeListings =
    activeTab === "similar" ? similarListings : recentListings;

  return {
    visible,
    settled,
    hasSimilar,
    hasRecent,
    showToggle,
    activeTab,
    setTab,
    activeListings,
    similar,
    recent,
  };
}

import { StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import {
  listingDetailChrome as chrome,
  type ListingDetailVariant,
} from "@/components/listings/detail/listingDetailChrome";
import { RubberSegment } from "@/components/ui/RubberSegment";
import { HomePropertyRail } from "@/components/web/home/HomePropertyRail";
import {
  useListingDetailDiscovery,
  type DiscoveryTab,
} from "./useListingDetailDiscovery";

type Props = {
  listingId: string;
  variant?: ListingDetailVariant;
};

const TOGGLE_ITEMS: readonly { value: DiscoveryTab; label: string }[] = [
  { value: "similar", label: "Similar places" },
  { value: "recent", label: "Recently viewed" },
];

export function ListingDetailDiscoverySection({
  listingId,
  variant = "web",
}: Props) {
  const {
    visible,
    showToggle,
    activeTab,
    setTab,
    activeListings,
    recent,
  } = useListingDetailDiscovery(listingId);

  if (!visible) return null;

  const web = variant === "web";
  const heading =
    activeTab === "similar" ? "Similar places" : "Recently viewed";
  const subtitle =
    activeTab === "similar"
      ? "Comparable stays nearby in area, budget, and setup"
      : "Places you checked out recently";

  const status =
    activeTab === "recent" && recent.isLoading ? (
      <LText variant="caption" tone="muted" style={styles.empty}>
        Loading recently viewed places…
      </LText>
    ) : activeTab === "recent" && activeListings.length === 0 ? (
      <LText variant="caption" tone="muted" style={styles.empty}>
        Places you view will appear here so you can jump back quickly.
      </LText>
    ) : undefined;

  return (
    <View
      testID="listing-discovery-section"
      style={[web ? chrome.web : chrome.card, styles.wrap, !web && styles.cardClip]}
    >
      <View style={styles.head}>
        <LText
          variant="title"
          accessibilityRole="header"
          style={web ? chrome.webHeading : chrome.cardHeading}
        >
          {heading}
        </LText>
        <LText variant="caption" tone="muted">
          {subtitle}
        </LText>
      </View>

      <HomePropertyRail
        listings={activeListings}
        area={`${listingId}:${activeTab}`}
        ariaLabel={heading}
        gutter={web ? 24 : 16}
        reveal={false}
        detail
        testIdPrefix="detail-discovery-listing"
        filters={
          showToggle ? (
            <RubberSegment
              items={TOGGLE_ITEMS}
              value={activeTab}
              onChange={setTab}
              ariaLabel="Browse similar or recently viewed places"
            />
          ) : undefined
        }
        status={status}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  cardClip: {
    overflow: "hidden",
  },
  head: {
    gap: 3,
  },
  empty: {
    paddingVertical: 14,
  },
});

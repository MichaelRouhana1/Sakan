import { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { LText } from "@/components/lister/Typography";
import {
  listingDetailChrome as chrome,
  type ListingDetailVariant,
} from "@/components/listings/detail/listingDetailChrome";
import { RubberSegment } from "@/components/ui/RubberSegment";
import { HomePropertyCardNative } from "./HomePropertyCardNative";
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
  variant = "card",
}: Props) {
  const {
    visible,
    showToggle,
    activeTab,
    setTab,
    activeListings,
    recent,
  } = useListingDetailDiscovery(listingId);
  const railRef = useRef<ScrollView>(null);

  useEffect(() => {
    railRef.current?.scrollTo({ x: 0, animated: false });
  }, [listingId, activeTab]);

  if (!visible) return null;

  const heading =
    activeTab === "similar" ? "Similar places" : "Recently viewed";
  const subtitle =
    activeTab === "similar"
      ? "Comparable stays nearby in area, budget, and setup"
      : "Places you checked out recently";

  return (
    <View
      testID="listing-discovery-section"
      style={[variant === "web" ? chrome.web : chrome.card, styles.wrap]}
    >
      <View style={styles.head}>
        <LText
          variant="title"
          accessibilityRole="header"
          style={variant === "web" ? chrome.webHeading : chrome.cardHeading}
        >
          {heading}
        </LText>
        <LText variant="caption" tone="muted">
          {subtitle}
        </LText>
      </View>

      {showToggle ? (
        <RubberSegment
          items={TOGGLE_ITEMS}
          value={activeTab}
          onChange={setTab}
          ariaLabel="Browse similar or recently viewed places"
        />
      ) : null}

      {activeTab === "recent" && recent.isLoading ? (
        <LText variant="caption" tone="muted" style={styles.empty}>
          Loading recently viewed places…
        </LText>
      ) : activeTab === "recent" && activeListings.length === 0 ? (
        <LText variant="caption" tone="muted" style={styles.empty}>
          Places you view will appear here so you can jump back quickly.
        </LText>
      ) : (
        <ScrollView
          ref={railRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rail}
          style={styles.railBleed}
        >
          {activeListings.map((item) => (
            <HomePropertyCardNative
              key={item.id}
              listing={item}
              testID={`detail-discovery-listing-${item.id}`}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
    overflow: "hidden",
  },
  head: {
    gap: 3,
  },
  railBleed: {
    marginHorizontal: -16,
  },
  rail: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  empty: {
    paddingVertical: 14,
  },
});

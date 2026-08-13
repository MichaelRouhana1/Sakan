import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import {
  ListingMapCarouselCard,
  MAP_CAROUSEL_BODY_H,
} from "@/components/listings/ListingMapCarouselCard";
import { Skoun } from "@/constants/theme";
import { agentDebugLog } from "@/lib/agentDebugLog";
import type { Listing } from "@/types/listing";

export const MAP_CAROUSEL_CLOSE_H = 40;
export const MAP_CAROUSEL_GAP = 10;
export const MAP_CAROUSEL_WIDTH_RATIO = 0.86;

type Props = {
  listings: Listing[];
  selectedId: string;
  onIndexChange: (listingId: string) => void;
  onDismiss: () => void;
  onPressCard: (listing: Listing) => void;
  bottomInset?: number;
};

export function mapCarouselCardWidth(viewportWidth: number): number {
  return Math.round(viewportWidth * MAP_CAROUSEL_WIDTH_RATIO);
}

/** Close row + 16:10 image + body. Used to pad the map camera. */
export function mapCarouselOverlayHeight(viewportWidth: number): number {
  const cardW = mapCarouselCardWidth(viewportWidth);
  return MAP_CAROUSEL_CLOSE_H + cardW * (10 / 16) + MAP_CAROUSEL_BODY_H;
}

export function ListingMapCarousel({
  listings,
  selectedId,
  onIndexChange,
  onDismiss,
  onPressCard,
  bottomInset = 12,
}: Props) {
  const listRef = useRef<FlatList<Listing>>(null);
  const fromSwipe = useRef(false);
  const viewportWidth = Dimensions.get("window").width;
  const cardWidth = mapCarouselCardWidth(viewportWidth);
  const interval = cardWidth + MAP_CAROUSEL_GAP;
  const sidePad = (viewportWidth - cardWidth) / 2;

  useEffect(() => {
    // #region agent log
    agentDebugLog("H6", "ListingMapCarousel.tsx:inset", "carousel inset", { bottomInset, listingCount: listings.length });
    // #endregion
  }, [bottomInset, listings.length]);

  const selectedIndex = useMemo(() => {
    const i = listings.findIndex((l) => l.id === selectedId);
    return i < 0 ? 0 : i;
  }, [listings, selectedId]);

  const snapOffsets = useMemo(
    () => listings.map((_, i) => i * interval),
    [listings, interval],
  );

  useEffect(() => {
    if (fromSwipe.current) {
      fromSwipe.current = false;
      return;
    }
    if (listings.length === 0) return;
    listRef.current?.scrollToOffset({
      offset: selectedIndex * interval,
      animated: false,
    });
  }, [selectedId, selectedIndex, interval, listings.length]);

  const emitIndex = useCallback(
    (offsetX: number) => {
      if (listings.length === 0) return;
      const next = Math.max(
        0,
        Math.min(listings.length - 1, Math.round(offsetX / interval)),
      );
      const listing = listings[next];
      if (!listing || listing.id === selectedId) return;
      fromSwipe.current = true;
      // #region agent log
      agentDebugLog("H1", "ListingMapCarousel.tsx:emitIndex", "carousel index from swipe", { fromId: selectedId, toId: listing.id, next, offsetX });
      // #endregion
      onIndexChange(listing.id);
    },
    [interval, listings, onIndexChange, selectedId],
  );

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      emitIndex(e.nativeEvent.contentOffset.x);
    },
    [emitIndex],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: interval,
      offset: interval * index,
      index,
    }),
    [interval],
  );

  const renderItem = useCallback(
    ({ item }: { item: Listing }) => (
      <View
        style={[styles.item, { width: interval }]}
      >
        <ListingMapCarouselCard
          listing={item}
          width={cardWidth}
          onPress={() => onPressCard(item)}
        />
      </View>
    ),
    [cardWidth, interval, onPressCard],
  );

  const closeRight = sidePad + 4;

  return (
    <View
      style={[styles.wrap, { paddingBottom: bottomInset }]}
      pointerEvents="box-none"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss preview"
        onPress={onDismiss}
        hitSlop={10}
        style={[styles.close, { right: closeRight }]}
      >
        <Ionicons name="close" size={18} color={Skoun.color.inkMuted} />
      </Pressable>

      <FlatList
        ref={listRef}
        data={listings}
        keyExtractor={(item) => item.id}
        horizontal
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        showsHorizontalScrollIndicator={false}
        snapToOffsets={snapOffsets}
        decelerationRate="fast"
        disableIntervalMomentum
        bounces={listings.length > 1}
        scrollEnabled={listings.length > 1}
        contentContainerStyle={{ paddingHorizontal: sidePad }}
        onMomentumScrollEnd={onMomentumEnd}
        initialScrollIndex={selectedIndex}
        windowSize={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    paddingTop: MAP_CAROUSEL_CLOSE_H,
  },
  item: {
    justifyContent: "flex-end",
  },
  close: {
    position: "absolute",
    top: 0,
    zIndex: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: Skoun.color.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#121826",
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});

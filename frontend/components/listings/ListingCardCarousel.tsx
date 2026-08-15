import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useCarouselListScroll } from "@/components/listings/carouselListScroll";
import { useCoarsePointer } from "@/lib/useCoarsePointer";

const MAX_PHOTOS = 5;

type Props = {
  urls: string[];
  style?: StyleProp<ViewStyle>;
  /** Always show chevrons on Web. Mobile hides arrows and uses native finger swiping. */
  alwaysShowArrows?: boolean;
  onPressCard?: () => void;
};

function stopCardNav(e?: GestureResponderEvent) {
  e?.preventDefault?.();
  e?.stopPropagation?.();
}

function webPanXStyles(coarsePointer: boolean): ViewStyle | null {
  if (Platform.OS !== "web" || !coarsePointer) return null;
  return {
    touchAction: "pan-x",
    overflowX: "auto",
    overflowY: "hidden",
    overscrollBehavior: "contain",
    WebkitOverflowScrolling: "touch",
    scrollSnapType: "x mandatory",
  } as ViewStyle;
}

export function ListingCardCarousel({
  urls,
  style,
  alwaysShowArrows = false,
  onPressCard,
}: Props) {
  const photos = urls.filter(Boolean).slice(0, MAX_PHOTOS);
  const [index, setIndex] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const [hovered, setHovered] = useState(false);
  const count = photos.length;
  const isWeb = Platform.OS === "web";
  const coarsePointer = useCoarsePointer();
  const webPanX = webPanXStyles(coarsePointer);
  const scrollRef = useRef<ScrollView>(null);
  const lockedRef = useRef(false);
  const draggingRef = useRef(false);
  const indexRef = useRef(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const { lockListScroll, unlockListScroll } = useCarouselListScroll();
  indexRef.current = index;

  const setParentLocked = (next: boolean) => {
    if (lockedRef.current === next) return;
    lockedRef.current = next;
    if (next) lockListScroll();
    else unlockListScroll();
  };

  useEffect(
    () => () => {
      if (lockedRef.current) {
        lockedRef.current = false;
        unlockListScroll();
      }
    },
    [unlockListScroll],
  );

  useEffect(() => {
    if (cardWidth <= 0) return;
    scrollRef.current?.scrollTo({
      x: indexRef.current * cardWidth,
      animated: false,
    });
  }, [cardWidth]);

  const go = (delta: number) => {
    if (count < 2 || cardWidth <= 0) return;
    const next = Math.max(0, Math.min(count - 1, index + delta));
    setIndex(next);
    scrollRef.current?.scrollTo({ x: next * cardWidth, animated: true });
  };

  const syncIndex = (x: number) => {
    if (cardWidth <= 0) return;
    setIndex(Math.max(0, Math.min(count - 1, Math.round(x / cardWidth))));
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    syncIndex(e.nativeEvent.contentOffset.x);
    setParentLocked(false);
  };

  const onTouchStart = (e: GestureResponderEvent) => {
    if (count < 2) return;
    const t = e.nativeEvent.touches[0] ?? e.nativeEvent;
    startX.current = t.pageX;
    startY.current = t.pageY;
  };

  const onTouchMove = (e: GestureResponderEvent) => {
    if (count < 2 || lockedRef.current) return;
    const t = e.nativeEvent.touches[0] ?? e.nativeEvent;
    const dx = Math.abs(t.pageX - startX.current);
    const dy = Math.abs(t.pageY - startY.current);
    if (dx > 8 && dx > dy) setParentLocked(true);
  };

  const arrowsVisible = isWeb && count > 1 && (alwaysShowArrows || hovered);

  const webHoverHandlers = isWeb
    ? {
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
        onPointerEnter: () => setHovered(true),
        onPointerLeave: () => setHovered(false),
      }
    : {};

  return (
    <View
      collapsable={false}
      style={[
        styles.root,
        isWeb && coarsePointer ? ({ touchAction: "pan-x" } as ViewStyle) : null,
        style,
      ]}
      onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
      {...webHoverHandlers}
    >
      {count > 0 && cardWidth > 0 ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          directionalLockEnabled
          disableIntervalMomentum
          decelerationRate="fast"
          bounces={count > 1}
          scrollEnabled={count > 1}
          showsHorizontalScrollIndicator={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
          style={[StyleSheet.absoluteFillObject, webPanX]}
          contentContainerStyle={count > 1 ? undefined : styles.singleContent}
          onScrollBeginDrag={() => {
            if (count < 2) return;
            draggingRef.current = true;
            setParentLocked(true);
          }}
          onScrollEndDrag={(e) => {
            draggingRef.current = false;
            onScrollEnd(e);
          }}
          onMomentumScrollEnd={(e) => {
            draggingRef.current = false;
            onScrollEnd(e);
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={() => {
            if (!draggingRef.current) setParentLocked(false);
          }}
          onTouchCancel={() => {
            draggingRef.current = false;
            setParentLocked(false);
          }}
        >
          {photos.map((url, i) => (
            <Pressable
              key={`${url}-${i}`}
              onPress={onPressCard}
              style={[
                { width: cardWidth, height: "100%" },
                isWeb ? ({ scrollSnapAlign: "start" } as ViewStyle) : null,
              ]}
            >
              <Image
                pointerEvents="none"
                source={{ uri: url }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
              />
            </Pressable>
          ))}
        </ScrollView>
      ) : count > 0 ? (
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onPressCard}>
          <Image
            pointerEvents="none"
            source={{ uri: photos[0] }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
        </Pressable>
      ) : (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, styles.fallback]}
        />
      )}

      <View style={styles.overlay} pointerEvents="box-none">
        {arrowsVisible ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous photo"
              hitSlop={8}
              onPress={(e) => {
                stopCardNav(e);
                go(-1);
              }}
              onPressIn={stopCardNav}
              style={({ hovered: arrowHover, pressed }) => [
                styles.arrow,
                styles.arrowLeft,
                styles.arrowMotion,
                {
                  opacity: 1,
                  transform: [{ scale: pressed ? 0.95 : arrowHover ? 1.05 : 1 }],
                },
              ]}
            >
              <Ionicons name="chevron-back" size={18} color="#121826" />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next photo"
              hitSlop={8}
              onPress={(e) => {
                stopCardNav(e);
                go(1);
              }}
              onPressIn={stopCardNav}
              style={({ hovered: arrowHover, pressed }) => [
                styles.arrow,
                styles.arrowRight,
                styles.arrowMotion,
                {
                  opacity: 1,
                  transform: [{ scale: pressed ? 0.95 : arrowHover ? 1.05 : 1 }],
                },
              ]}
            >
              <Ionicons name="chevron-forward" size={18} color="#121826" />
            </Pressable>
          </>
        ) : null}

        {count > 1 ? (
          <View style={styles.dots} pointerEvents="none">
            {photos.map((_, i) => {
              const active = i === index;
              return (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    isWeb ? styles.dotMotion : null,
                    active ? styles.dotActive : styles.dotIdle,
                  ]}
                />
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const webTransition = (property: string): ViewStyle =>
  Platform.OS === "web"
    ? ({
        transitionProperty: property,
        transitionDuration: "200ms",
        transitionTimingFunction: "ease",
      } as ViewStyle)
    : {};

const styles = StyleSheet.create({
  root: {
    position: "relative",
    flex: 1,
    alignSelf: "stretch",
    width: "100%",
    height: "100%",
    minHeight: "100%",
    backgroundColor: "#E8EEF6",
    overflow: "hidden",
  },
  singleContent: {
    flexGrow: 1,
  },
  fallback: {
    backgroundColor: "#E2E8F0",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  arrow: {
    position: "absolute",
    top: "50%",
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#121826",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  arrowMotion: webTransition("opacity, transform"),
  arrowLeft: { left: 8 },
  arrowRight: { right: 8 },
  dots: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  dotMotion: webTransition("width"),
  dotIdle: {
    width: 6,
  },
  dotActive: {
    width: 18,
  },
});

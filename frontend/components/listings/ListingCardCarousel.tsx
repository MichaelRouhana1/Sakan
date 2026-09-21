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
import { resolveMediaUrls } from "@/lib/mediaUrl";
import { skounShadow } from "@/lib/skounShadow";

const MAX_PHOTOS = 5;
const PHOTO_ASPECT = 16 / 10;

type Props = {
  urls: string[];
  style?: StyleProp<ViewStyle>;
  /** Always show chevrons on Web. Mobile hides arrows and uses native finger swiping. */
  alwaysShowArrows?: boolean;
  onPressCard?: () => void;
  /** Floor height for list/side cards. Grid uses 16/10 from measured width. */
  minHeight?: number;
  /** Stretch to the parent column (list cards whose body can grow). */
  fill?: boolean;
};

function stopCardNav(e?: GestureResponderEvent) {
  e?.preventDefault?.();
  e?.stopPropagation?.();
}

export function ListingCardCarousel({
  urls,
  style,
  alwaysShowArrows = false,
  onPressCard,
  minHeight = 0,
  fill = false,
}: Props) {
  const photos = resolveMediaUrls(urls).slice(0, MAX_PHOTOS);
  const [index, setIndex] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const [cardHeight, setCardHeight] = useState(0);
  const [hovered, setHovered] = useState(false);
  const count = photos.length;
  const isWeb = Platform.OS === "web";
  const coarsePointer = useCoarsePointer();
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
    if (count < 2) return;
    const next = Math.max(0, Math.min(count - 1, index + delta));
    setIndex(next);
    if (!isWeb && cardWidth > 0) {
      scrollRef.current?.scrollTo({ x: next * cardWidth, animated: true });
    }
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
        fill
          ? styles.fill
          : cardHeight > 0
            ? { height: cardHeight }
            : { aspectRatio: PHOTO_ASPECT },
        !fill && minHeight > 0 ? { minHeight } : null,
        style,
      ]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width <= 0) return;
        // Integer px so slides match the clip. Fractional CSS widths otherwise
        // leave a 1px strip of the next photo on the right.
        const nextW = Math.max(1, Math.ceil(width - 1e-6));
        const nextH = Math.round(
          fill
            ? Math.max(height, minHeight)
            : Math.max(nextW / PHOTO_ASPECT, minHeight),
        );
        if (nextW !== cardWidth) setCardWidth(nextW);
        if (nextH !== cardHeight) setCardHeight(nextH);
      }}
      {...webHoverHandlers}
    >
      {isWeb && count > 0 ? (
        <View
          style={styles.viewport}
          onTouchStart={onTouchStart}
          onTouchEnd={(e) => {
            if (count < 2) return;
            const t =
              e.nativeEvent.changedTouches?.[0] ?? e.nativeEvent;
            const dx = t.pageX - startX.current;
            if (dx > 40) go(-1);
            else if (dx < -40) go(1);
          }}
        >
          <View
            style={[
              styles.webTrack,
              count > 1
                ? {
                    width: `${count * 100}%`,
                    transform: [
                      { translateX: `${-((index * 100) / count)}%` },
                    ],
                  }
                : styles.webTrackSingle,
            ]}
          >
            {photos.map((url, i) => (
              <Pressable
                key={`${url}-${i}`}
                onPress={onPressCard}
                style={[
                  styles.webSlide,
                  { width: count > 1 ? `${100 / count}%` : "100%" },
                ]}
              >
                <Image
                  source={{ uri: url }}
                  style={styles.webImage}
                  contentFit="cover"
                />
              </Pressable>
            ))}
          </View>
        </View>
      ) : count > 0 && cardWidth > 0 && cardHeight > 0 ? (
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
          style={[StyleSheet.absoluteFillObject, styles.scroller]}
          contentContainerStyle={
            count > 1 ? styles.track : styles.singleContent
          }
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
                styles.slide,
                { width: cardWidth, height: cardHeight },
                isWeb ? ({ scrollSnapAlign: "start" } as ViewStyle) : null,
              ]}
            >
              <Image
                source={{ uri: url }}
                style={{
                  width: cardWidth,
                  height: cardHeight,
                  pointerEvents: "none",
                }}
                contentFit="cover"
              />
            </Pressable>
          ))}
        </ScrollView>
      ) : count > 0 ? (
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onPressCard}>
          <Image
            source={{ uri: photos[0] }}
            style={[
              cardWidth > 0 && cardHeight > 0
                ? { width: cardWidth, height: cardHeight }
                : StyleSheet.absoluteFillObject,
              { pointerEvents: "none" },
            ]}
            contentFit="cover"
          />
        </Pressable>
      ) : (
        <View
          style={[StyleSheet.absoluteFillObject, styles.fallback, { pointerEvents: "none" }]}
        />
      )}

      <View style={[styles.overlay, { pointerEvents: "box-none" }]}>
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
          <View style={[styles.dots, { pointerEvents: "none" }]}>
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
  // In-flow width + computed height. absoluteFill collapsed to 0 on RN 0.86
  // when the parent only had absolutely positioned children.
  root: {
    width: "100%",
    maxWidth: "100%",
    position: "relative",
    backgroundColor: "#E8EEF6",
    overflow: "hidden",
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  viewport: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    ...(Platform.OS === "web"
      ? ({
          clipPath: "inset(0)",
          WebkitClipPath: "inset(0)",
        } as ViewStyle)
      : null),
  },
  webTrack: {
    height: "100%",
    flexDirection: "row",
    ...(Platform.OS === "web"
      ? ({
          transitionProperty: "transform",
          transitionDuration: "220ms",
          transitionTimingFunction: "ease",
        } as ViewStyle)
      : null),
  },
  webTrackSingle: {
    width: "100%",
    height: "100%",
  },
  webSlide: {
    height: "100%",
    overflow: "hidden",
    flexGrow: 0,
    flexShrink: 0,
  },
  webImage: {
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  },
  scroller: {
    overflow: "hidden",
  },
  track: {
    flexDirection: "row",
    flexGrow: 0,
  },
  slide: {
    flexGrow: 0,
    flexShrink: 0,
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
    ...skounShadow({ y: 2, blur: 6, opacity: 0.18, elevation: 3 }),
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
    ...skounShadow({ color: "#000000", y: 1, blur: 2, opacity: 0.35, elevation: 2 }),
  },
  dotMotion: webTransition("width"),
  dotIdle: {
    width: 6,
  },
  dotActive: {
    width: 18,
  },
});

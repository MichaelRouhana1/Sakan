import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

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
  const safeIndex = count > 0 ? Math.max(0, Math.min(count - 1, index)) : 0;
  const isWeb = Platform.OS === "web";

  // ALWAYS KEEP REFS FRESH TO PREVENT STALE CLOSURES
  const safeIndexRef = useRef(safeIndex);
  safeIndexRef.current = safeIndex;

  const cardWidthRef = useRef(cardWidth);
  cardWidthRef.current = cardWidth;

  const countRef = useRef(count);
  countRef.current = count;

  const onPressCardRef = useRef(onPressCard);
  onPressCardRef.current = onPressCard;

  // Track active drag & spring transition
  const isSlidingRef = useRef(false);

  // Animated offset for the horizontal side-by-side reel track
  const trackAnim = useRef(new Animated.Value(0)).current;

  // Keep trackAnim synchronized with safeIndex
  useEffect(() => {
    if (cardWidth > 0) {
      Animated.spring(trackAnim, {
        toValue: -safeIndex * cardWidth,
        useNativeDriver: true,
        tension: 220,
        friction: 18,
      }).start();
    }
  }, [safeIndex, cardWidth]);

  const go = (delta: number) => {
    if (count < 2) return;
    setIndex((i) => Math.max(0, Math.min(count - 1, i + delta)));
  };

  const panResponder = useRef(
    PanResponder.create({
      // CLAIM TOUCH RESPONDER INSTANTLY ON TOUCH DOWN TO BLOCK VERTICAL PAGE SCROLL
      onStartShouldSetPanResponderCapture: () => countRef.current > 1,
      onStartShouldSetPanResponder: () => countRef.current > 1,
      onMoveShouldSetPanResponderCapture: () => countRef.current > 1,
      onMoveShouldSetPanResponder: () => countRef.current > 1,
      // Hard-lock: NEVER allow vertical page scroll to steal responder
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        isSlidingRef.current = true;
      },
      onPanResponderMove: (_, gestureState) => {
        isSlidingRef.current = true;
        const { dx } = gestureState;
        const curIdx = safeIndexRef.current;
        const width = cardWidthRef.current;
        const total = countRef.current;
        const baseOffset = -curIdx * width;
        let effectiveDx = dx;

        // HEAVY ELASTIC RESISTANCE AT BOUNDARIES (Photo #0 & Last Photo)
        if (curIdx === 0 && dx > 0) {
          // Pulling right past photo #0 -> 88% heavy resistance
          effectiveDx = Math.pow(dx, 0.55) * 2;
        } else if (curIdx === total - 1 && dx < 0) {
          // Pulling left past last photo -> 88% heavy resistance
          effectiveDx = -Math.pow(Math.abs(dx), 0.55) * 2;
        }

        trackAnim.setValue(baseOffset + effectiveDx);
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx, dy } = gestureState;
        const curIdx = safeIndexRef.current;
        const width = cardWidthRef.current;
        const total = countRef.current;
        const threshold = 15;

        // Tap Detection: If finger moved less than 8px, handle tap to open details
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
          isSlidingRef.current = false;
          onPressCardRef.current?.();
          return;
        }

        isSlidingRef.current = true;

        const animateTo = (targetIdx: number) => {
          setIndex(targetIdx);
          Animated.spring(trackAnim, {
            toValue: -targetIdx * width,
            useNativeDriver: true,
            tension: 220,
            friction: 18,
          }).start(() => {
            isSlidingRef.current = false;
          });
        };

        if (dx < -threshold && curIdx < total - 1) {
          // Swipe left -> advance to next photo
          animateTo(curIdx + 1);
        } else if (dx > threshold && curIdx > 0) {
          // Swipe right -> go back to previous photo
          animateTo(curIdx - 1);
        } else {
          // Snap back to current photo
          animateTo(curIdx);
        }
      },
      onPanResponderTerminate: (_, gestureState) => {
        const { dx, dy } = gestureState;
        const curIdx = safeIndexRef.current;
        const width = cardWidthRef.current;
        const total = countRef.current;
        const threshold = 15;

        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
          isSlidingRef.current = false;
          return;
        }

        isSlidingRef.current = true;

        const animateTo = (targetIdx: number) => {
          setIndex(targetIdx);
          Animated.spring(trackAnim, {
            toValue: -targetIdx * width,
            useNativeDriver: true,
            tension: 220,
            friction: 18,
          }).start(() => {
            isSlidingRef.current = false;
          });
        };

        if (dx < -threshold && curIdx < total - 1) {
          animateTo(curIdx + 1);
        } else if (dx > threshold && curIdx > 0) {
          animateTo(curIdx - 1);
        } else {
          animateTo(curIdx);
        }
      },
    })
  ).current;

  // ──────── MOBILE (NATIVE & MOBILE WEB): TRUE 2D SIDE-BY-SIDE SLIDING REEL ────────
  if (!isWeb) {
    return (
      <View
        style={[{ touchAction: "pan-x" } as any, styles.root, style]}
        onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
        onTouchStart={(e) => {
          if (count > 1) e?.stopPropagation?.();
        }}
        onTouchEnd={(e) => {
          if (count > 1) e?.stopPropagation?.();
        }}
        {...(count > 1 ? panResponder.panHandlers : {})}
      >
        {count > 0 && cardWidth > 0 ? (
          <Animated.View
            style={[
              { touchAction: "pan-x" } as any,
              {
                flexDirection: "row",
                width: cardWidth * count,
                height: "100%",
                transform: [{ translateX: trackAnim }],
              },
            ]}
          >
            {photos.map((url, i) => (
              <View key={i} style={[{ touchAction: "pan-x" } as any, { width: cardWidth, height: "100%" }]}>
                <Image
                  pointerEvents="none"
                  source={{ uri: url }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                />
              </View>
            ))}
          </Animated.View>
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

        {/* Dots Indicator */}
        {count > 1 ? (
          <View style={styles.dots} pointerEvents="none">
            {photos.map((_, i) => {
              const active = i === safeIndex;
              return (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    active ? styles.dotActive : styles.dotIdle,
                  ]}
                />
              );
            })}
          </View>
        ) : null}
      </View>
    );
  }

  // ──────── WEB (DESKTOP): CHEVRONS & HOVER ────────
  const arrowsVisible = count > 1 && (alwaysShowArrows || hovered);

  const webHoverHandlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onPointerEnter: () => setHovered(true),
    onPointerLeave: () => setHovered(false),
  };

  return (
    <View
      style={[{ touchAction: "pan-x" } as any, styles.root, style]}
      onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
      onTouchStart={(e) => {
        if (count > 1) e?.stopPropagation?.();
      }}
      onTouchEnd={(e) => {
        if (count > 1) e?.stopPropagation?.();
      }}
      {...webHoverHandlers}
      {...(count > 1 ? panResponder.panHandlers : {})}
    >
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onPressCard}>
        {count > 0 && cardWidth > 0 ? (
          <Animated.View
            style={{
              flexDirection: "row",
              width: cardWidth * count,
              height: "100%",
              transform: [{ translateX: trackAnim }],
            }}
          >
            {photos.map((url, i) => (
              <View key={i} style={{ width: cardWidth, height: "100%" }}>
                <Image
                  pointerEvents="none"
                  source={{ uri: url }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                />
              </View>
            ))}
          </Animated.View>
        ) : count > 0 ? (
          <Image
            pointerEvents="none"
            source={{ uri: photos[0] }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
        ) : (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, styles.fallback]}
          />
        )}
      </Pressable>

      {/* Full-bleed overlay */}
      <View style={styles.overlay} pointerEvents="box-none">
        {count > 1 ? (
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
                  opacity: arrowsVisible ? 1 : 0,
                  transform: [
                    { scale: pressed ? 0.95 : arrowHover ? 1.05 : 1 },
                  ],
                },
              ]}
              pointerEvents={arrowsVisible ? "auto" : "none"}
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
                  opacity: arrowsVisible ? 1 : 0,
                  transform: [
                    { scale: pressed ? 0.95 : arrowHover ? 1.05 : 1 },
                  ],
                },
              ]}
              pointerEvents={arrowsVisible ? "auto" : "none"}
            >
              <Ionicons name="chevron-forward" size={18} color="#121826" />
            </Pressable>
          </>
        ) : null}

        {count > 1 ? (
          <View style={styles.dots} pointerEvents="none">
            {photos.map((_, i) => {
              const active = i === safeIndex;
              return (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    styles.dotMotion,
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
    ...(Platform.OS === "web" ? ({ touchAction: "pan-x" } as any) : {}),
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

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Keyboard, StyleSheet, View, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { removePhotoUri } from "@/features/listings/photoUriOwnership";
import { LText } from "@/components/lister/Typography";
import { Lister } from "@/constants/listerTheme";
import { usePhotoCropQueue } from "@/features/listings/usePhotoCropQueue";
import {
  PHOTO_GRID_COLUMNS,
  PHOTO_GRID_GAP,
  buildPhotoSlotRects,
  edgeAutoScrollStep,
  hitTestPhotoImage,
  movePhotoByIndex,
  targetSlotIndexForCenter,
  type PhotoSlotRect,
} from "@/lib/photoGridGeometry";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { PhotoCropModal } from "./photos/PhotoCropModal";
import { PhotoGuidance } from "./photos/PhotoGuidance";
import { usePhotoDragScroll } from "./photoDragScroll";
import {
  AddPhotoTile,
  MAX_LISTING_PHOTOS,
  PhotoGridFooter,
  PhotoGridHeader,
  PhotoTile,
  TileEnter,
  photoDisplayUri,
  uploadDraft,
  usePhotoPickerStyles,
  type DraftPhoto,
  type PhotoPickerGridProps,
} from "./PhotoPickerGrid.shared";

export type { DraftPhoto } from "./PhotoPickerGrid.shared";
export {
  MAX_LISTING_PHOTOS,
  MIN_LISTING_PHOTOS,
} from "./PhotoPickerGrid.shared";

const LONG_PRESS_MS = 200;
const SETTLE_MS = 165;
const LIFT_SPRING = { damping: 20, stiffness: 280, mass: 0.7 };
const TILE_SLIDE_SPRING = { damping: 24, stiffness: 280, mass: 0.8 };

type ActiveGhost = {
  localId: string;
  uri: string;
  width: number;
  height: number;
};

type DragSession = {
  localId: string;
  currentIndex: number;
  startSlotX: number;
  startSlotY: number;
  width: number;
  height: number;
  startScrollY: number;
  lastTranslationX: number;
  lastTranslationY: number;
  lastAbsoluteY: number;
};

function SortablePhotoCell({
  index,
  isDragging,
  reduceMotion,
  getSlotRect,
  style,
  onMeasureHeight,
  children,
}: {
  index: number;
  isDragging: boolean;
  reduceMotion: boolean;
  getSlotRect: (slotIndex: number) => PhotoSlotRect | undefined;
  style?: ViewStyle;
  onMeasureHeight?: (height: number) => void;
  children: ReactNode;
}) {
  const prevIndexRef = useRef(index);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  useLayoutEffect(() => {
    const prevIndex = prevIndexRef.current;
    if (prevIndex === index) return;
    prevIndexRef.current = index;

    if (isDragging || reduceMotion) {
      offsetX.value = 0;
      offsetY.value = 0;
      return;
    }

    const prevRect = getSlotRect(prevIndex);
    const nextRect = getSlotRect(index);
    if (!prevRect || !nextRect) return;

    offsetX.value = prevRect.x - nextRect.x;
    offsetY.value = prevRect.y - nextRect.y;
    offsetX.value = withSpring(0, TILE_SLIDE_SPRING);
    offsetY.value = withSpring(0, TILE_SLIDE_SPRING);
  }, [getSlotRect, index, isDragging, offsetX, offsetY, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }, { translateY: offsetY.value }],
  }));

  return (
    <Animated.View
      style={[style, animatedStyle]}
      onLayout={
        onMeasureHeight
          ? (event) => {
              const h = event.nativeEvent.layout.height;
              if (h > 0) onMeasureHeight(h);
            }
          : undefined
      }
    >
      {children}
    </Animated.View>
  );
}

export function PhotoPickerGrid({
  shared = false,
  photos,
  setPhotos,
  style,
}: PhotoPickerGridProps) {
  const photoPickerStyles = usePhotoPickerStyles();
  const cropController = usePhotoCropQueue({ photos, setPhotos });
  const dragScroll = usePhotoDragScroll();
  const reduceMotion = useReducedMotion();

  const remaining = MAX_LISTING_PHOTOS - photos.length;
  const readyCount = photos.filter((p) => p.status === "ready").length;
  const uploading = photos.some((p) => p.status === "uploading");

  const [gridWidth, setGridWidth] = useState(0);
  const [dragId, setDragId] = useState<string | null>(null);
  const [activeGhost, setActiveGhost] = useState<ActiveGhost | null>(null);

  const photosRef = useRef(photos);
  photosRef.current = photos;
  const gridWidthRef = useRef(gridWidth);
  gridWidthRef.current = gridWidth;
  const cellHeightRef = useRef(0);
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;
  const dragScrollRef = useRef(dragScroll);
  dragScrollRef.current = dragScroll;

  const pendingStartRef = useRef<{ index: number; localId: string } | null>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const isSettlingRef = useRef(false);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoScrollFrameRef = useRef<number | null>(null);

  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);
  const ghostScale = useSharedValue(1);

  const getSlotRects = useCallback((): PhotoSlotRect[] => {
    const width = gridWidthRef.current;
    const count = photosRef.current.length;
    if (width <= 0 || count <= 0) return [];
    const colWidth = (width - PHOTO_GRID_GAP * (PHOTO_GRID_COLUMNS - 1)) / PHOTO_GRID_COLUMNS;
    const cellHeight = cellHeightRef.current > 0 ? cellHeightRef.current : colWidth + 98;
    return buildPhotoSlotRects(
      count,
      width,
      cellHeight,
      PHOTO_GRID_GAP,
      PHOTO_GRID_COLUMNS,
    );
  }, []);

  const getSlotRect = useCallback(
    (slotIndex: number) => getSlotRects()[slotIndex],
    [getSlotRects],
  );

  const stopAutoScroll = useCallback(() => {
    if (autoScrollFrameRef.current != null) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  }, []);

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current != null) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
    isSettlingRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      stopAutoScroll();
      clearSettleTimer();
      if (dragSessionRef.current) {
        dragSessionRef.current = null;
        dragScrollRef.current.unlockScroll();
      }
    };
  }, [clearSettleTimer, stopAutoScroll]);

  const syncGhostAndReorder = useCallback(
    (session: DragSession) => {
      const scrollDelta = dragScrollRef.current.getScrollY() - session.startScrollY;
      const nextX = session.startSlotX + session.lastTranslationX;
      const nextY = session.startSlotY + session.lastTranslationY + scrollDelta;

      ghostX.value = nextX;
      ghostY.value = nextY;

      const rects = getSlotRects();
      if (rects.length < 2) return;

      const liveIndex = photosRef.current.findIndex(
        (p) => p.localId === session.localId,
      );
      if (liveIndex < 0) return;
      session.currentIndex = liveIndex;

      const center = {
        x: nextX + session.width / 2,
        y: nextY + session.height / 2,
      };
      const targetIndex = targetSlotIndexForCenter(center, rects, liveIndex);
      if (
        targetIndex !== liveIndex &&
        targetIndex >= 0 &&
        targetIndex < photosRef.current.length
      ) {
        session.currentIndex = targetIndex;
        void Haptics.selectionAsync().catch(() => {});
        setPhotos((prev) => {
          const from = prev.findIndex((p) => p.localId === session.localId);
          if (from < 0) return prev;
          const clampedTo = Math.min(targetIndex, prev.length - 1);
          if (from === clampedTo) return prev;
          return movePhotoByIndex(prev, from, clampedTo);
        });
      }
    },
    [getSlotRects, ghostX, ghostY, setPhotos],
  );

  const startAutoScroll = useCallback(() => {
    stopAutoScroll();
    const tick = () => {
      const session = dragSessionRef.current;
      if (!session) {
        autoScrollFrameRef.current = null;
        return;
      }
      const viewport = dragScrollRef.current.getViewport();
      if (viewport) {
        const step = edgeAutoScrollStep(
          session.lastAbsoluteY,
          viewport.top,
          viewport.bottom,
        );
        if (step !== 0) {
          const applied = dragScrollRef.current.scrollBy(step);
          if (applied !== 0) {
            syncGhostAndReorder(session);
          }
        }
      }
      autoScrollFrameRef.current = requestAnimationFrame(tick);
    };
    autoScrollFrameRef.current = requestAnimationFrame(tick);
  }, [stopAutoScroll, syncGhostAndReorder]);

  const finishDrag = useCallback(() => {
    stopAutoScroll();
    pendingStartRef.current = null;
    const session = dragSessionRef.current;
    if (!session) return;
    dragSessionRef.current = null;
    dragScrollRef.current.unlockScroll();

    const finalIndex = photosRef.current.findIndex(
      (p) => p.localId === session.localId,
    );
    const dest = getSlotRects()[finalIndex >= 0 ? finalIndex : session.currentIndex];
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    if (!dest || reduceMotionRef.current) {
      ghostScale.value = 1;
      setDragId(null);
      setActiveGhost(null);
      return;
    }

    clearSettleTimer();
    isSettlingRef.current = true;
    const easing = Easing.out(Easing.cubic);
    ghostX.value = withTiming(dest.x, { duration: SETTLE_MS, easing });
    ghostY.value = withTiming(dest.y, { duration: SETTLE_MS, easing });
    ghostScale.value = withTiming(1, { duration: SETTLE_MS, easing });

    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null;
      isSettlingRef.current = false;
      setDragId(null);
      setActiveGhost(null);
    }, SETTLE_MS + 10);
  }, [clearSettleTimer, getSlotRects, ghostScale, ghostX, ghostY, stopAutoScroll]);

  const dragGesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(LONG_PRESS_MS)
        .shouldCancelWhenOutside(false)
        .runOnJS(true)
        .onTouchesDown((event, manager) => {
          if (
            event.numberOfTouches !== 1 ||
            photosRef.current.length < 2 ||
            isSettlingRef.current
          ) {
            pendingStartRef.current = null;
            manager.fail();
            return;
          }
          const touch = event.allTouches[0];
          if (!touch) {
            pendingStartRef.current = null;
            manager.fail();
            return;
          }
          const rects = getSlotRects();
          const hitIndex = hitTestPhotoImage({ x: touch.x, y: touch.y }, rects);
          const photo = hitIndex >= 0 ? photosRef.current[hitIndex] : undefined;
          if (!photo || photo.status === "error") {
            pendingStartRef.current = null;
            manager.fail();
            return;
          }
          pendingStartRef.current = { index: hitIndex, localId: photo.localId };
        })
        .onStart((event) => {
          const rects = getSlotRects();
          let index = pendingStartRef.current
            ? photosRef.current.findIndex(
                (p) => p.localId === pendingStartRef.current?.localId,
              )
            : -1;
          if (index < 0) {
            index = hitTestPhotoImage({ x: event.x, y: event.y }, rects);
          }
          const photo = index >= 0 ? photosRef.current[index] : undefined;
          const rect = index >= 0 ? rects[index] : undefined;
          if (!photo || !rect || photo.status === "error" || photosRef.current.length < 2) {
            pendingStartRef.current = null;
            return;
          }

          clearSettleTimer();
          Keyboard.dismiss();
          dragScrollRef.current.lockScroll();
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

          const session: DragSession = {
            localId: photo.localId,
            currentIndex: index,
            startSlotX: rect.x,
            startSlotY: rect.y,
            width: rect.width,
            height: rect.imageHeight,
            startScrollY: dragScrollRef.current.getScrollY(),
            lastTranslationX: event.translationX,
            lastTranslationY: event.translationY,
            lastAbsoluteY: event.absoluteY,
          };
          dragSessionRef.current = session;

          ghostX.value = rect.x + event.translationX;
          ghostY.value = rect.y + event.translationY;
          ghostScale.value = 1;
          if (!reduceMotionRef.current) {
            ghostScale.value = withSpring(1.05, LIFT_SPRING);
          }

          setDragId(photo.localId);
          setActiveGhost({
            localId: photo.localId,
            uri: photoDisplayUri(photo),
            width: rect.width,
            height: rect.imageHeight,
          });
          startAutoScroll();
        })
        .onUpdate((event) => {
          const session = dragSessionRef.current;
          if (!session) return;
          session.lastTranslationX = event.translationX;
          session.lastTranslationY = event.translationY;
          session.lastAbsoluteY = event.absoluteY;
          syncGhostAndReorder(session);
        })
        .onFinalize(() => {
          finishDrag();
        }),
    [
      clearSettleTimer,
      finishDrag,
      getSlotRects,
      ghostScale,
      ghostX,
      ghostY,
      startAutoScroll,
      syncGhostAndReorder,
    ],
  );

  const ghostAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: ghostX.value },
      { translateY: ghostY.value },
      { scale: ghostScale.value },
    ],
  }));

  function removePhoto(localId: string) {
    const photo = photos.find((p) => p.localId === localId);
    if (photo) removePhotoUri(photo.uri);
    setPhotos((prev) => prev.filter((p) => p.localId !== localId));
  }

  const colWidth =
    gridWidth > 0
      ? (gridWidth - PHOTO_GRID_GAP * (PHOTO_GRID_COLUMNS - 1)) / PHOTO_GRID_COLUMNS
      : 0;
  const cellWidthStyle: ViewStyle =
    colWidth > 0 ? { width: colWidth } : photoPickerStyles.cell;
  const activeGhostIndex = activeGhost
    ? photos.findIndex((p) => p.localId === activeGhost.localId)
    : -1;

  return (
    <View style={[photoPickerStyles.root, style]}>
      <PhotoGridHeader
        shared={shared}
        photoCount={photos.length}
        uploading={uploading}
      />
      <PhotoGuidance />
      {!cropController.locked &&
        cropController.state.notices.map((notice, i) => (
          <LText key={i} accessibilityLiveRegion="polite" variant="caption">
            {notice}
          </LText>
        ))}
      <PhotoCropModal controller={cropController} photoCount={photos.length} />

      <GestureDetector gesture={dragGesture}>
        <View
          style={[photoPickerStyles.grid, nativeStyles.gridContainer]}
          onLayout={(event) => {
            const width = event.nativeEvent.layout.width;
            if (width > 0 && Math.abs(width - gridWidthRef.current) > 0.5) {
              setGridWidth(width);
            }
          }}
        >
          {photos.map((photo, index) => (
            <SortablePhotoCell
              key={photo.localId}
              index={index}
              isDragging={dragId === photo.localId}
              reduceMotion={reduceMotion}
              getSlotRect={getSlotRect}
              style={cellWidthStyle}
              onMeasureHeight={
                index === 0
                  ? (height) => {
                      cellHeightRef.current = height;
                    }
                  : undefined
              }
            >
              <TileEnter index={index}>
                <PhotoTile
                  shared={shared}
                  photo={photo}
                  index={index}
                  isDragging={dragId === photo.localId}
                  onCaption={(caption) =>
                    setPhotos((prev) =>
                      prev.map((p) =>
                        p.localId === photo.localId ? { ...p, caption } : p,
                      ),
                    )
                  }
                  onRemove={() => removePhoto(photo.localId)}
                  onRetry={() =>
                    void uploadDraft(photo.localId, photo.uri, setPhotos)
                  }
                />
              </TileEnter>
            </SortablePhotoCell>
          ))}

          {remaining > 0 ? (
            <AddPhotoTile
              remaining={remaining}
              index={photos.length}
              disabled={cropController.locked || Boolean(dragId)}
              onPress={() => void cropController.pick()}
              style={cellWidthStyle}
            />
          ) : null}

          {activeGhost ? (
            <Animated.View
              pointerEvents="none"
              style={[
                nativeStyles.ghostShadow,
                {
                  width: activeGhost.width,
                  height: activeGhost.height,
                },
                ghostAnimatedStyle,
              ]}
            >
              <View style={nativeStyles.ghostFrame}>
                <Image
                  source={{ uri: activeGhost.uri }}
                  style={nativeStyles.ghostImage}
                  contentFit="cover"
                  transition={0}
                />
                {!shared && activeGhostIndex === 0 ? (
                  <View style={photoPickerStyles.coverBadge}>
                    <LText
                      variant="caption"
                      style={photoPickerStyles.coverBadgeText}
                    >
                      Cover
                    </LText>
                  </View>
                ) : null}
              </View>
            </Animated.View>
          ) : null}
        </View>
      </GestureDetector>

      <PhotoGridFooter shared={shared} readyCount={readyCount} />
    </View>
  );
}

const nativeStyles = StyleSheet.create({
  gridContainer: {
    position: "relative",
  },
  ghostShadow: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 100,
    borderRadius: Lister.radius.lg,
    backgroundColor: Lister.color.surface,
    shadowColor: "#121826",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.24,
    shadowRadius: 22,
    elevation: 14,
  },
  ghostFrame: {
    flex: 1,
    borderRadius: Lister.radius.lg,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.85)",
  },
  ghostImage: {
    width: "100%",
    height: "100%",
  },
});

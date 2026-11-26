import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from "react-native";

export type PhotoDragScrollViewport = {
  top: number;
  bottom: number;
  scrollY: number;
  maxScrollY: number;
};

export type PhotoDragScrollApi = {
  lockScroll: () => void;
  unlockScroll: () => void;
  getScrollY: () => number;
  getViewport: () => PhotoDragScrollViewport | null;
  /** Programmatically scrolls by `deltaY` and returns the actual clamped scroll delta applied. */
  scrollBy: (deltaY: number) => number;
};

const noopApi: PhotoDragScrollApi = {
  lockScroll: () => {},
  unlockScroll: () => {},
  getScrollY: () => 0,
  getViewport: () => null,
  scrollBy: () => 0,
};

export const PhotoDragScrollContext = createContext<PhotoDragScrollApi>(noopApi);

export function usePhotoDragScroll() {
  return useContext(PhotoDragScrollContext);
}

/**
 * Coordinates a parent vertical ScrollView with a nested 2D photo drag grid:
 * - Toggles `scrollEnabled` via `setNativeProps` so locking scroll mid-gesture
 *   never triggers a React re-render that could cancel the active touch.
 * - Tracks scroll offset and viewport bounds so dragging near the top/bottom
 *   edges smoothly auto-scrolls the wizard while keeping the lifted tile glued
 *   to the user's finger.
 */
export function usePhotoDragScrollController(
  externalRef?: RefObject<ScrollView | null>,
) {
  const internalRef = useRef<ScrollView | null>(null);
  const scrollRef = externalRef ?? internalRef;
  const holdCount = useRef(0);
  const scrollY = useRef(0);
  const contentHeight = useRef(0);
  const viewportHeight = useRef(0);
  const viewportTop = useRef(0);

  const applyScrollEnabled = useCallback(
    (enabled: boolean) => {
      const node = scrollRef.current as
        | (ScrollView & {
            setNativeProps?: (props: { scrollEnabled: boolean }) => void;
          })
        | null;
      node?.setNativeProps?.({ scrollEnabled: enabled });
    },
    [scrollRef],
  );

  const measureViewport = useCallback(() => {
    const node = scrollRef.current as
      | (ScrollView & {
          measureInWindow?: (
            cb: (x: number, y: number, width: number, height: number) => void,
          ) => void;
        })
      | null;
    node?.measureInWindow?.((_x, y, _w, h) => {
      if (Number.isFinite(y) && Number.isFinite(h) && h > 0) {
        viewportTop.current = y;
        viewportHeight.current = h;
      }
    });
  }, [scrollRef]);

  const lockScroll = useCallback(() => {
    holdCount.current += 1;
    measureViewport();
    applyScrollEnabled(false);
  }, [applyScrollEnabled, measureViewport]);

  const unlockScroll = useCallback(() => {
    holdCount.current = Math.max(0, holdCount.current - 1);
    if (holdCount.current === 0) applyScrollEnabled(true);
  }, [applyScrollEnabled]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      scrollY.current = contentOffset.y;
      contentHeight.current = contentSize.height;
      if (layoutMeasurement.height > 0) {
        viewportHeight.current = layoutMeasurement.height;
      }
    },
    [],
  );

  const onContentSizeChange = useCallback((_w: number, h: number) => {
    contentHeight.current = h;
  }, []);

  const getScrollY = useCallback(() => scrollY.current, []);

  const getViewport = useCallback((): PhotoDragScrollViewport | null => {
    if (viewportHeight.current <= 0) return null;
    const maxScrollY = Math.max(0, contentHeight.current - viewportHeight.current);
    return {
      top: viewportTop.current,
      bottom: viewportTop.current + viewportHeight.current,
      scrollY: scrollY.current,
      maxScrollY,
    };
  }, []);

  const scrollBy = useCallback(
    (deltaY: number): number => {
      if (!deltaY || viewportHeight.current <= 0) return 0;
      const maxScrollY = Math.max(0, contentHeight.current - viewportHeight.current);
      if (maxScrollY <= 0) return 0;
      const prev = scrollY.current;
      const next = Math.max(0, Math.min(maxScrollY, prev + deltaY));
      const applied = next - prev;
      if (Math.abs(applied) < 0.25) return 0;
      scrollY.current = next;
      scrollRef.current?.scrollTo({ y: next, animated: false });
      return applied;
    },
    [scrollRef],
  );

  const api = useMemo<PhotoDragScrollApi>(
    () => ({ lockScroll, unlockScroll, getScrollY, getViewport, scrollBy }),
    [getScrollY, getViewport, lockScroll, scrollBy, unlockScroll],
  );

  return {
    scrollRef,
    api,
    onScroll,
    onContentSizeChange,
    measureViewport,
  };
}

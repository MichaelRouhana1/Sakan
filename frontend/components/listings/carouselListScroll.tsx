import { createContext, useCallback, useContext, useMemo, useRef } from "react";
import type { FlatList } from "react-native";

type LockApi = {
  lockListScroll: () => void;
  unlockListScroll: () => void;
};

const noop: LockApi = {
  lockListScroll: () => {},
  unlockListScroll: () => {},
};

export const CarouselListScrollContext = createContext<LockApi>(noop);

export function useCarouselListScroll() {
  return useContext(CarouselListScrollContext);
}

function nativeScrollOf(list: FlatList | null) {
  const anyList = list as FlatList & {
    getNativeScrollRef?: () => { setNativeProps?: (p: object) => void };
    getScrollResponder?: () => { setNativeProps?: (p: object) => void };
  };
  return anyList?.getNativeScrollRef?.() ?? anyList?.getScrollResponder?.();
}

/**
 * Parent list owns this. Attach `listRef` to FlatList.
 * Toggles native `scrollEnabled` via setNativeProps so a React re-render
 * does not cancel the in-flight carousel gesture.
 */
export function useCarouselListScrollController() {
  const listRef = useRef<FlatList>(null);
  const hold = useRef(0);

  const apply = useCallback((enabled: boolean) => {
    nativeScrollOf(listRef.current)?.setNativeProps?.({ scrollEnabled: enabled });
  }, []);

  const lockListScroll = useCallback(() => {
    hold.current += 1;
    apply(false);
  }, [apply]);

  const unlockListScroll = useCallback(() => {
    hold.current = Math.max(0, hold.current - 1);
    if (hold.current === 0) apply(true);
  }, [apply]);

  const value = useMemo(
    () => ({ lockListScroll, unlockListScroll }),
    [lockListScroll, unlockListScroll],
  );

  return { listRef, value };
}

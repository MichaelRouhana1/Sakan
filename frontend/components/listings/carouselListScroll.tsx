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

/**
 * Parent list owns this. Attach `listRef` to FlatList.
 * Toggles native `scrollEnabled` via setNativeProps so a React re-render
 * does not cancel the in-flight carousel gesture.
 */
export function useCarouselListScrollController() {
  const listRef = useRef<FlatList>(null);
  const hold = useRef(0);

  const apply = useCallback((enabled: boolean) => {
    const list = listRef.current as
      | (FlatList & {
          setNativeProps?: (props: { scrollEnabled: boolean }) => void;
        })
      | null;
    list?.setNativeProps?.({ scrollEnabled: enabled });
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

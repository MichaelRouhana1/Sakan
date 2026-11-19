import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { DESKTOP_DESIGN_SCALE, scaleDesktopStyles, scaleLength } from '@/constants/desktopDesign';

const STORAGE_KEY = 'studently.homepageScale';

export type DesktopDesignApi = {
  /** Web homepage at the desktop breakpoint. Independent of the 1.0 / 1.1 choice. */
  isDesktop: boolean;
  /** 1 on mobile and when the dev toggle selects the committed sizes. */
  scale: number;
  size: (value: number) => number;
  styles: <T extends object>(base: T) => T;
  setScale: (scale: number) => void;
};

const identitySize = (value: number) => value;
const identityStyles = <T extends object>(value: T): T => value;

const baseDesign: DesktopDesignApi = {
  isDesktop: false,
  scale: 1,
  size: identitySize,
  styles: identityStyles,
  setScale: () => {},
};

const DesktopDesignContext = createContext<DesktopDesignApi>(baseDesign);

function storedScale(): number {
  if (!__DEV__ || typeof window === 'undefined') return DESKTOP_DESIGN_SCALE;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === '1' || stored === '1.0') return 1;
  } catch {
    /* private mode */
  }
  return DESKTOP_DESIGN_SCALE;
}

/** Opt in a page and its shared children; React portals inherit the same sizing. */
export function DesktopDesignProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [scale, setScaleState] = useState<number>(storedScale);
  const active = Platform.OS === 'web' && enabled;

  const setScale = useCallback((next: number) => {
    if (!__DEV__) return;
    const resolved = next === 1 ? 1 : DESKTOP_DESIGN_SCALE;
    setScaleState(resolved);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, resolved === 1 ? '1' : '1.1');
    } catch {
      /* private mode */
    }
  }, []);

  const api = useMemo<DesktopDesignApi>(() => {
    const effective = active ? scale : 1;
    return {
      isDesktop: active,
      scale: effective,
      size: (value: number) => scaleLength(value, effective),
      styles: (base) => scaleDesktopStyles(base, effective),
      setScale,
    };
  }, [active, scale, setScale]);

  return <DesktopDesignContext.Provider value={api}>{children}</DesktopDesignContext.Provider>;
}

export function useDesktopDesign() {
  return useContext(DesktopDesignContext);
}

/**
 * Width for column and layout choices. Dividing by the desktop factor keeps
 * factor 1.1 at 90% zoom on the same side of a breakpoint as factor 1.0 at 100%.
 * The 900px mobile cutoff stays on the raw viewport.
 */
export function useLayoutWidth() {
  const { width } = useWindowDimensions();
  const { scale } = useDesktopDesign();
  return width / (scale || 1);
}

import { useEffect, useState } from "react";
import { Platform, useWindowDimensions } from "react-native";

export type Breakpoint = "mobile" | "tablet" | "desktop";

const DESKTOP_MIN = 1024;
const TABLET_MIN = 768;

export function breakpointFromWidth(width: number): Breakpoint {
  if (width >= DESKTOP_MIN) return "desktop";
  if (width >= TABLET_MIN) return "tablet";
  return "mobile";
}

/** Prefer a real viewport width; RN Web can report 0 for one frame on mount. */
function resolveWidth(reported: number): number {
  if (reported > 0) return reported;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.innerWidth || DESKTOP_MIN;
  }
  return DESKTOP_MIN;
}

export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  return breakpointFromWidth(resolveWidth(width));
}

/** Debounce width for layout stability during resize. */
export function useStableBreakpoint(debounceMs = 120): Breakpoint {
  const { width } = useWindowDimensions();
  const [bp, setBp] = useState(() => breakpointFromWidth(resolveWidth(width)));

  useEffect(() => {
    const next = breakpointFromWidth(resolveWidth(width));
    const t = setTimeout(() => setBp(next), debounceMs);
    return () => clearTimeout(t);
  }, [width, debounceMs]);

  return bp;
}

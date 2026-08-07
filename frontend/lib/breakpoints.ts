import { useEffect, useState } from "react";
import { useWindowDimensions } from "react-native";

export type Breakpoint = "mobile" | "tablet" | "desktop";

const DESKTOP_MIN = 1024;
const TABLET_MIN = 768;

export function breakpointFromWidth(width: number): Breakpoint {
  if (width >= DESKTOP_MIN) return "desktop";
  if (width >= TABLET_MIN) return "tablet";
  return "mobile";
}

export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  return breakpointFromWidth(width);
}

/** Debounce width for layout stability during resize. */
export function useStableBreakpoint(debounceMs = 120): Breakpoint {
  const { width } = useWindowDimensions();
  const [bp, setBp] = useState(() => breakpointFromWidth(width));

  useEffect(() => {
    const next = breakpointFromWidth(width);
    const t = setTimeout(() => setBp(next), debounceMs);
    return () => clearTimeout(t);
  }, [width, debounceMs]);

  return bp;
}

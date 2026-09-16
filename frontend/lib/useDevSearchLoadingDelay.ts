import { useEffect, useRef, useState } from "react";

/** TEMP: minimum /search loading time in dev — delete when done testing the orb. */
const DEV_SEARCH_DELAY_MS = 3000;

/**
 * Keeps loading true for at least {@link DEV_SEARCH_DELAY_MS} after each fetch
 * starts. No-op in production builds.
 */
export function useDevSearchLoadingDelay(isLoading: boolean): boolean {
  const minMs = __DEV__ ? DEV_SEARCH_DELAY_MS : 0;
  const [held, setHeld] = useState(minMs > 0);
  const loadStarted = useRef<number | null>(null);

  useEffect(() => {
    if (minMs <= 0) {
      setHeld(false);
      return;
    }

    if (isLoading) {
      loadStarted.current = Date.now();
      setHeld(true);
      return;
    }

    const started = loadStarted.current ?? Date.now();
    loadStarted.current = started;
    const remaining = Math.max(0, minMs - (Date.now() - started));
    const t = setTimeout(() => {
      setHeld(false);
      loadStarted.current = null;
    }, remaining);
    return () => clearTimeout(t);
  }, [isLoading, minMs]);

  if (minMs <= 0) return isLoading;
  return isLoading || held;
}

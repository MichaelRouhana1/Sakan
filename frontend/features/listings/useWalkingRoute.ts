import { useEffect, useState } from "react";
import {
  fetchWalkingRoute,
  walkingRouteKey,
  type LngLat,
  type WalkingRouteResult,
} from "@/lib/mapboxWalkingRoute";

type Args = {
  enabled: boolean;
  listingId: string | null;
  campusSlug: string | null;
  from: LngLat | null;
  to: LngLat | null;
};

const EMPTY: WalkingRouteResult | null = null;

export function useWalkingRoute({
  enabled,
  listingId,
  campusSlug,
  from,
  to,
}: Args): WalkingRouteResult | null {
  const [route, setRoute] = useState<WalkingRouteResult | null>(EMPTY);

  useEffect(() => {
    if (!enabled || !listingId || !campusSlug || !from || !to) {
      // Only drop route when selection gone — avoids line flicker on remount/refetch.
      if (!listingId) setRoute(null);
      return;
    }
    const key = walkingRouteKey(listingId, campusSlug);
    const ac = new AbortController();
    let alive = true;
    void fetchWalkingRoute(from, to, key, ac.signal).then(
      (next) => {
        if (alive) setRoute(next);
      },
      (err: unknown) => {
        if (
          alive &&
          !(err instanceof Error && err.name === "AbortError")
        ) {
          setRoute(null);
        }
      },
    );
    return () => {
      alive = false;
      ac.abort();
    };
  }, [
    enabled,
    listingId,
    campusSlug,
    from?.lat,
    from?.lng,
    to?.lat,
    to?.lng,
  ]);

  return route;
}

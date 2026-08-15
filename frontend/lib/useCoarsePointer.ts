import { useEffect, useState } from "react";
import { Platform } from "react-native";

/**
 * True when the primary input is touch (coarse pointer).
 * Used to gate touch-action scroll locks on web carousels — fine pointer (mouse)
 * should not block page wheel scroll.
 */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return coarse;
}

import type { Listing } from "@/types/listing";

export type SavedToastEvent =
  | { kind: "added"; listing: Listing; seq: number }
  | { kind: "clear"; listingId: string; seq?: number };

type Listener = (event: SavedToastEvent) => void;

const listeners = new Set<Listener>();

/** Hearts publish here. The web and native toast hosts subscribe. */
export function publishSavedToast(event: SavedToastEvent) {
  for (const listener of listeners) listener(event);
}

export function subscribeSavedToasts(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

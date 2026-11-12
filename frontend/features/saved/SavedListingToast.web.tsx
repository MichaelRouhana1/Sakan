import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { SwipeToast } from "@/components/ui/SwipeToast.web";
import { Studently } from "@/constants/theme";
import type { Listing } from "@/types/listing";
import { savedKeys } from "./keys";
import {
  subscribeSavedToasts,
  type SavedToastEvent,
} from "./savedToast";
import { useToggleSaved } from "./useSavedListings";

const STACK = 66;
const LAYER = 280;
const PHONE = "(max-width: 767px)";

function usePhoneScreen() {
  const [phone, setPhone] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(PHONE).matches,
  );

  useEffect(() => {
    const query = window.matchMedia(PHONE);
    const sync = () => setPhone(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return phone;
}

type ToastItem = {
  key: string;
  seq: number;
  listing: Listing;
  open: boolean;
};

function applyToastEvent(prev: ToastItem[], event: SavedToastEvent): ToastItem[] {
  if (event.kind === "clear") {
    return prev.map((toast) => {
      if (toast.listing.id !== event.listingId || !toast.open) return toast;
      if (event.seq != null && toast.seq !== event.seq) return toast;
      return { ...toast, open: false };
    });
  }
  return [
    ...prev.filter((toast) => toast.listing.id !== event.listing.id),
    {
      key: `${event.listing.id}:${event.seq}`,
      seq: event.seq,
      listing: event.listing,
      open: true,
    },
  ];
}

/** Same swipe toast as a deleted listing photo, for a new favorite. */
export function SavedListingToast() {
  const queryClient = useQueryClient();
  const toggleSaved = useToggleSaved();
  const mobile = usePhoneScreen();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => subscribeSavedToasts((event) => {
    setToasts((prev) => applyToastEvent(prev, event));
  }), []);

  function undo(listing: Listing) {
    const list = queryClient.getQueryData<Listing[]>(savedKeys.list()) ?? [];
    if (!list.some((item) => item.id === listing.id)) return;
    toggleSaved.mutate(listing);
  }

  if (toasts.length === 0) return null;

  return (
    <>
      {toasts.map((toast, index) => (
        <SwipeToast
          key={toast.key}
          title="Added to favorites"
          actionLabel="Undo"
          fuseColor={Studently.color.primary}
          open={toast.open}
          placement={mobile ? "top" : "default"}
          stack={(toasts.length - 1 - index) * STACK}
          layer={LAYER + index}
          onAction={() => undo(toast.listing)}
          onClose={() => {
            setToasts((prev) => prev.filter((item) => item.key !== toast.key));
          }}
        />
      ))}
    </>
  );
}

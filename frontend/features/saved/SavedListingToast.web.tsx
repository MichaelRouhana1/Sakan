import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { SwipeToast } from "@/components/ui/SwipeToast.web";
import { Studently } from "@/constants/theme";
import type { Listing } from "@/types/listing";
import { savedKeys } from "./keys";
import { subscribeSavedToasts } from "./savedToast";
import { useToggleSaved } from "./useSavedListings";
import { applyListingToastEvent, type ListingToastItem } from "./listingToastState";

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

/** Shared listing feedback; favorites retain their Undo action. */
export function SavedListingToast() {
  const queryClient = useQueryClient();
  const toggleSaved = useToggleSaved();
  const mobile = usePhoneScreen();
  const [toasts, setToasts] = useState<ListingToastItem[]>([]);

  useEffect(() => subscribeSavedToasts((event) => {
    setToasts((prev) => applyListingToastEvent(prev, event));
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
          title={toast.title}
          actionLabel={toast.kind === "saved" ? "Undo" : "Dismiss"}
          fuseColor={Studently.color.primary}
          open={toast.open}
          placement={mobile ? "top" : "default"}
          stack={(toasts.length - 1 - index) * STACK}
          layer={LAYER + index}
          onAction={() => { if (toast.kind === "saved") undo(toast.listing); }}
          onClose={() => {
            setToasts((prev) => prev.filter((item) => item.key !== toast.key));
          }}
        />
      ))}
    </>
  );
}

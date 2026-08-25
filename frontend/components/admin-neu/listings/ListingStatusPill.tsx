import { H } from "../h";
import { listingQueue, statusLabel, type AdminListing } from "./types";

export function ListingStatusPill({ listing }: { listing: AdminListing }) {
  const queue = listingQueue(listing);
  const label =
    queue === "flagged"
      ? "Flagged"
      : queue === "expired" && listing.status === "active"
        ? "Expired"
        : statusLabel(listing.status);
  const tone =
    queue === "flagged"
      ? "text-ember"
      : queue === "expired" || listing.status !== "active"
        ? "text-ochre"
        : "text-moss";
  const dot =
    queue === "flagged"
      ? "bg-ember"
      : queue === "expired" || listing.status !== "active"
        ? "bg-ochre"
        : "bg-moss";

  return (
    <H
      as="span"
      className={[
        "inline-flex items-center gap-1.5 rounded-full bg-clay-100 px-2.5 py-1 text-xs font-semibold shadow-neu-in-sm",
        tone,
      ].join(" ")}
    >
      <H as="span" className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      {label}
    </H>
  );
}

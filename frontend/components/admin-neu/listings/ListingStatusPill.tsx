import { H } from "../h";
import { isPastDue, listingQueue, statusLabel, type AdminListing } from "./types";

export function ListingStatusPill({ listing }: { listing: AdminListing }) {
  const queue = listingQueue(listing);
  const pastDue = isPastDue(listing);

  return (
    <H className="flex flex-wrap items-center gap-1.5">
      <Pill
        label={
          queue === "flagged"
            ? "Flagged"
            : queue === "draft"
              ? "Draft"
              : statusLabel(listing.status)
        }
        tone={
          queue === "flagged"
            ? "ember"
            : queue === "draft"
              ? "clay"
              : listing.status === "active"
                ? "moss"
                : "ochre"
        }
      />
      {pastDue ? <Pill label="Past due" tone="ochre" /> : null}
    </H>
  );
}

function Pill({
  label,
  tone,
}: {
  label: string;
  tone: "moss" | "ember" | "ochre" | "clay";
}) {
  const text =
    tone === "ember"
      ? "text-ember"
      : tone === "ochre"
        ? "text-ochre"
        : tone === "moss"
          ? "text-moss"
          : "text-clay-700";
  const dot =
    tone === "ember"
      ? "bg-ember"
      : tone === "ochre"
        ? "bg-ochre"
        : tone === "moss"
          ? "bg-moss"
          : "bg-clay-500";

  return (
    <H
      as="span"
      className={[
        "inline-flex items-center gap-1.5 rounded-full bg-clay-100 px-2.5 py-1 text-xs font-semibold shadow-neu-in-sm",
        text,
      ].join(" ")}
    >
      <H as="span" className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      {label}
    </H>
  );
}

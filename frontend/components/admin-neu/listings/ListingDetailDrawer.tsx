import { Calendar, MapPin, User, X } from "lucide-react-native";
import { useEffect, type ReactNode } from "react";
import { H } from "../h";
import { ADMIN_MUTED } from "../theme";
import { NeuIconButton, NeuSurface } from "../NeuPrimitives";
import { ListingActions } from "./ListingActions";
import { ListingImageReview } from "./ListingImageReview";
import { ListingStatusPill } from "./ListingStatusPill";
import {
  formatDay,
  formatStamp,
  posterName,
  reasonLabel,
  typeLabel,
  type AdminListing,
  type ListingActionKind,
} from "./types";

type Props = {
  listing: AdminListing | null;
  onClose: () => void;
  onEdit: () => void;
  onAction: (kind: ListingActionKind) => void;
};

export function ListingDetailDrawer({ listing, onClose, onEdit, onAction }: Props) {
  const open = listing != null;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <H
      className={[
        "fixed inset-0 z-40 flex justify-end",
        open ? "pointer-events-auto" : "pointer-events-none",
      ].join(" ")}
      aria-hidden={!open}
    >
      {open ? (
        <H
          as="button"
          type="button"
          aria-label="Close listing detail"
          onClick={onClose}
          className="admin-scrim absolute inset-0 cursor-pointer border-0 transition-opacity duration-panel"
        />
      ) : null}
      <H
        as="aside"
        role="dialog"
        aria-modal="true"
        aria-labelledby="listing-drawer-title"
        className={[
          "relative flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden bg-clay-100 shadow-neu transition-transform duration-panel",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {listing ? (
          <>
            <H className="flex shrink-0 items-start justify-between gap-3 px-5 pb-4 pt-5">
              <H className="min-w-0">
                <H
                  as="h2"
                  id="listing-drawer-title"
                  className="font-display text-lg font-semibold leading-snug"
                >
                  {listing.title}
                </H>
                <H className="mt-2 flex flex-wrap items-center gap-2">
                  <ListingStatusPill listing={listing} />
                  <H as="span" className="text-xs text-clay-700">
                    {typeLabel(listing.listingType)}
                  </H>
                </H>
              </H>
              <NeuIconButton ariaLabel="Close" onClick={onClose}>
                <X size={18} strokeWidth={1.75} />
              </NeuIconButton>
            </H>

            <H className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-6">
              <ListingImageReview listing={listing} />

              <NeuSurface inset className="space-y-2.5 px-4 py-3">
                <MetaRow
                  icon={<User size={16} strokeWidth={1.75} color={ADMIN_MUTED} />}
                  label={posterName(listing)}
                />
                <MetaRow
                  icon={<MapPin size={16} strokeWidth={1.75} color={ADMIN_MUTED} />}
                  label={listing.area}
                />
                <MetaRow
                  icon={<Calendar size={16} strokeWidth={1.75} color={ADMIN_MUTED} />}
                  label={`Expires ${formatDay(listing.expiresAt)}`}
                />
              </NeuSurface>

              <H className="grid grid-cols-3 gap-3">
                <StatWell label="Rent" value={`$${listing.monthlyRentUsd}`} />
                <StatWell label="Photos" value={String(listing.photos.length)} />
                <StatWell label="Flags" value={String(listing.openReports.length)} />
              </H>

              <H>
                <H as="h3" className="font-display text-sm font-semibold">
                  Open reports
                </H>
                {listing.openReports.length === 0 ? (
                  <NeuSurface inset className="mt-3 px-4 py-6 text-sm text-clay-700">
                    No open renter reports on this post.
                  </NeuSurface>
                ) : (
                  <H as="ol" className="mt-3 space-y-3">
                    {listing.openReports.map((report) => (
                      <H
                        as="li"
                        key={report.id}
                        className="rounded-neu-md bg-clay-100 px-4 py-3 shadow-neu-in-sm"
                      >
                        <H className="flex items-baseline justify-between gap-2">
                          <H as="p" className="text-sm font-semibold text-clay-900">
                            {reasonLabel(report.reason)}
                          </H>
                          <H as="p" className="text-[11px] text-clay-500">
                            {formatStamp(report.at)}
                          </H>
                        </H>
                      </H>
                    ))}
                  </H>
                )}
              </H>
            </H>

            <H className="shrink-0 border-t border-clay-200/70 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <ListingActions
                listing={listing}
                onEdit={onEdit}
                onAction={onAction}
              />
            </H>
          </>
        ) : null}
      </H>
    </H>
  );
}

function MetaRow({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <H className="flex items-center gap-2 text-sm text-clay-700">
      <H className="text-clay-500">{icon}</H>
      <H as="span" className="min-w-0 truncate">
        {label}
      </H>
    </H>
  );
}

function StatWell({ label, value }: { label: string; value: string }) {
  return (
    <H className="rounded-neu-md bg-clay-100 px-3 py-3 text-center shadow-neu-in-sm">
      <H as="p" className="font-display text-xl font-semibold text-clay-900">
        {value}
      </H>
      <H as="p" className="mt-0.5 text-[11px] font-medium text-clay-700">
        {label}
      </H>
    </H>
  );
}

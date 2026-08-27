import {
  Calendar,
  ExternalLink,
  MapPin,
  User,
  X,
} from "lucide-react-native";
import { Link, type Href } from "expo-router";
import { useEffect, type ReactNode } from "react";
import { H } from "../h";
import { ADMIN_MUTED } from "../theme";
import { NeuIconButton, NeuSurface } from "../NeuPrimitives";
import { ExpiredActions } from "./ExpiredActions";
import { DaysSincePill, ExpiredQueuePill } from "./ExpiredPills";
import {
  daysSinceExpiry,
  formatDay,
  formatStamp,
  historyKindLabel,
  posterName,
  typeLabel,
  type ExpiredActionKind,
  type ExpiredAsset,
} from "./types";

type Props = {
  asset: ExpiredAsset | null;
  onClose: () => void;
  onAction: (kind: ExpiredActionKind) => void;
};

export function ExpiredDetailDrawer({ asset, onClose, onAction }: Props) {
  const open = asset != null;

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
          aria-label="Close expired detail"
          onClick={onClose}
          className="admin-scrim absolute inset-0 cursor-pointer border-0 transition-opacity duration-panel"
        />
      ) : null}
      <H
        as="aside"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expired-drawer-title"
        className={[
          "relative flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden bg-clay-100 shadow-neu transition-transform duration-panel",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {asset ? (
          <>
            <H className="flex shrink-0 items-start justify-between gap-3 px-5 pb-4 pt-5">
              <H className="min-w-0">
                <H
                  as="h2"
                  id="expired-drawer-title"
                  className="font-display text-lg font-semibold leading-snug"
                >
                  {asset.title}
                </H>
                <H className="mt-2 flex flex-wrap items-center gap-2">
                  <ExpiredQueuePill queue={asset.queue} />
                  <H as="span" className="text-xs text-clay-700">
                    {typeLabel(asset.listingType)}
                  </H>
                </H>
              </H>
              <NeuIconButton ariaLabel="Close" onClick={onClose}>
                <X size={18} strokeWidth={1.75} />
              </NeuIconButton>
            </H>

            <H className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-6">
              <CoverLarge asset={asset} />

              <NeuSurface inset className="space-y-2.5 px-4 py-3">
                <MetaRow
                  icon={<User size={16} strokeWidth={1.75} color={ADMIN_MUTED} />}
                  label={posterName(asset)}
                />
                <MetaRow
                  icon={<MapPin size={16} strokeWidth={1.75} color={ADMIN_MUTED} />}
                  label={asset.area}
                />
                <MetaRow
                  icon={
                    <Calendar size={16} strokeWidth={1.75} color={ADMIN_MUTED} />
                  }
                  label={`Expired ${formatDay(asset.expiresAt)}`}
                />
              </NeuSurface>

              <H className="flex flex-wrap gap-2">
                <DeepLink
                  href={`/admin/listings`}
                  label="Listings"
                />
                <DeepLink
                  href={`/admin/users?id=${asset.poster.id}`}
                  label="Poster"
                />
                <DeepLink
                  href="/admin/communication?tab=nudges&nudge=n-expiry"
                  label="Comms"
                />
              </H>

              <H className="grid grid-cols-3 gap-3">
                <StatWell label="Rent" value={`$${asset.monthlyRentUsd}`} />
                <StatWell label="Days" value={`${daysSinceExpiry(asset)}d`} />
                <StatWell label="Nudges" value={String(asset.nudgeCount)} />
              </H>

              <H className="flex items-center gap-3">
                <DaysSincePill asset={asset} />
                <H as="p" className="text-sm text-clay-700">
                  Listing status: {asset.listingStatus}
                </H>
              </H>

              {asset.lastNudgeMessage ? (
                <NeuSurface inset className="px-4 py-3 text-sm text-clay-700">
                  <H as="p" className="text-xs font-medium text-clay-500">
                    Last nudge message
                  </H>
                  <H as="p" className="mt-1">
                    {asset.lastNudgeMessage}
                  </H>
                </NeuSurface>
              ) : null}

              <H>
                <H as="h3" className="font-display text-sm font-semibold">
                  Moderation history
                </H>
                {asset.moderationHistory.length === 0 ? (
                  <NeuSurface inset className="mt-3 px-4 py-6 text-sm text-clay-700">
                    No staff actions yet.
                  </NeuSurface>
                ) : (
                  <H as="ol" className="mt-3 space-y-3">
                    {[...asset.moderationHistory].reverse().map((entry) => (
                      <H
                        as="li"
                        key={entry.id}
                        className="rounded-neu-md bg-clay-100 px-4 py-3 shadow-neu-in-sm"
                      >
                        <H className="flex items-baseline justify-between gap-2">
                          <H as="p" className="text-sm font-semibold text-clay-900">
                            {historyKindLabel(entry.kind)}
                          </H>
                          <H as="p" className="text-[11px] text-clay-500">
                            {formatStamp(entry.at)}
                          </H>
                        </H>
                        <H as="p" className="mt-1 text-xs text-clay-700">
                          {entry.actor}: {entry.note}
                        </H>
                      </H>
                    ))}
                  </H>
                )}
              </H>
            </H>

            <H className="shrink-0 border-t border-clay-200/70 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <ExpiredActions asset={asset} onAction={onAction} />
            </H>
          </>
        ) : null}
      </H>
    </H>
  );
}

function CoverLarge({ asset }: { asset: ExpiredAsset }) {
  const cover = asset.photos[0];
  if (!cover) {
    return (
      <NeuSurface inset className="px-4 py-10 text-center text-sm text-clay-700">
        No photos on this listing.
      </NeuSurface>
    );
  }
  return (
    <NeuSurface inset className="overflow-hidden p-2">
      <H
        as="img"
        src={cover.url}
        alt={`${asset.title}, ${cover.caption}`}
        className="h-48 w-full rounded-neu-md object-cover"
      />
      <H as="p" className="mt-2 px-1 text-sm text-clay-700">
        {cover.caption}
      </H>
    </NeuSurface>
  );
}

function DeepLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href as Href}
      className="inline-flex items-center gap-1.5 rounded-full bg-clay-100 px-3 py-1.5 text-xs font-medium text-moss shadow-neu-sm"
    >
      <ExternalLink size={12} strokeWidth={1.75} />
      {label}
    </Link>
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

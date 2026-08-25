import { Calendar, Mail, MapPin, X } from "lucide-react-native";
import { useEffect, type ReactNode } from "react";
import { H } from "../h";
import { ADMIN_MUTED } from "../theme";
import { NeuIconButton, NeuSurface } from "../NeuPrimitives";
import { UserModerationActions } from "./UserModerationActions";
import { UserRolePill, UserStatusPill } from "./UserPills";
import {
  displayName,
  formatJoinDate,
  formatStamp,
  initials,
  kindLabel,
  type AdminUser,
  type ModerationKind,
} from "./types";

type Props = {
  user: AdminUser | null;
  onClose: () => void;
  onAction: (kind: ModerationKind) => void;
};

export function UserDetailDrawer({ user, onClose, onAction }: Props) {
  const open = user != null;

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
          aria-label="Close user detail"
          onClick={onClose}
          className="admin-scrim absolute inset-0 cursor-pointer border-0 transition-opacity duration-panel"
        />
      ) : null}
      <H
        as="aside"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-drawer-title"
        className={[
          "relative flex h-[100dvh] w-full max-w-[420px] flex-col overflow-hidden bg-clay-100 shadow-neu transition-transform duration-panel",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {user ? (
          <>
            <H className="flex shrink-0 items-start justify-between gap-3 px-5 pb-4 pt-5">
              <H className="flex min-w-0 items-center gap-3">
                <H className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-clay-100 font-display text-sm font-semibold text-moss shadow-neu-in-sm">
                  {initials(user)}
                </H>
                <H className="min-w-0">
                  <H
                    as="h2"
                    id="user-drawer-title"
                    className="truncate font-display text-lg font-semibold"
                  >
                    {displayName(user)}
                  </H>
                  <H className="mt-2 flex flex-wrap gap-2">
                    <UserRolePill role={user.role} />
                    <UserStatusPill status={user.accountStatus} />
                  </H>
                </H>
              </H>
              <NeuIconButton ariaLabel="Close" onClick={onClose}>
                <X size={18} strokeWidth={1.75} />
              </NeuIconButton>
            </H>

            <H className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-6">
              <NeuSurface inset className="space-y-2.5 px-4 py-3">
                <MetaRow icon={<Mail size={16} strokeWidth={1.75} color={ADMIN_MUTED} />} label={user.email} />
                <MetaRow icon={<MapPin size={16} strokeWidth={1.75} color={ADMIN_MUTED} />} label={user.campus} />
                <MetaRow
                  icon={<Calendar size={16} strokeWidth={1.75} color={ADMIN_MUTED} />}
                  label={`Joined ${formatJoinDate(user.createdAt)}`}
                />
              </NeuSurface>

              <H className="grid grid-cols-3 gap-3">
                <StatWell
                  label={user.role === "poster" ? "Listings" : "Reports out"}
                  value={
                    user.role === "poster"
                      ? String(user.listingCount)
                      : String(user.reportsFiled)
                  }
                />
                <StatWell
                  label={user.role === "poster" ? "Live" : "Against"}
                  value={
                    user.role === "poster"
                      ? String(user.activeListingCount)
                      : String(user.reportsAgainst)
                  }
                />
                <StatWell label="Flags" value={String(user.history.length)} />
              </H>

              <H>
                <H as="h3" className="font-display text-sm font-semibold">
                  Moderation history
                </H>
                {user.history.length === 0 ? (
                  <NeuSurface inset className="mt-3 px-4 py-6 text-sm text-clay-700">
                    No staff actions on this account yet.
                  </NeuSurface>
                ) : (
                  <H as="ol" className="mt-3 space-y-3">
                    {[...user.history].reverse().map((event) => (
                      <H
                        as="li"
                        key={event.id}
                        className="rounded-neu-md bg-clay-100 px-4 py-3 shadow-neu-in-sm"
                      >
                        <H className="flex items-baseline justify-between gap-2">
                          <H as="p" className="text-sm font-semibold text-clay-900">
                            {kindLabel(event.kind)}
                          </H>
                          <H as="p" className="text-[11px] text-clay-500">
                            {formatStamp(event.at)}
                          </H>
                        </H>
                        <H as="p" className="mt-1 text-sm leading-relaxed text-clay-700">
                          {event.note}
                        </H>
                        <H as="p" className="mt-2 text-xs text-clay-500">
                          by {event.actor}
                        </H>
                      </H>
                    ))}
                  </H>
                )}
              </H>
            </H>

            <H className="shrink-0 border-t border-clay-200/70 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <UserModerationActions
                status={user.accountStatus}
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

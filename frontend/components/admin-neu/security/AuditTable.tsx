import { useBreakpoint } from "@/lib/breakpoints";
import { H } from "../h";
import { NeuSurface } from "../NeuPrimitives";
import {
  ACTION_LABEL,
  TIER_LABEL,
  formatStamp,
  initials,
  type AuditEvent,
} from "./types";

/** Must match a class emitted by `npm run admin:css`. */
const DESKTOP_ROW =
  "grid w-full min-w-0 grid-cols-[minmax(200px,1.4fr)_minmax(180px,1.2fr)_minmax(180px,1.3fr)_7.5rem_8.5rem] items-center gap-x-3";

type Props = {
  events: AuditEvent[];
};

export function AuditTable({ events }: Props) {
  const bp = useBreakpoint();
  const compact = bp !== "desktop";

  if (events.length === 0) {
    return (
      <NeuSurface inset className="px-6 py-16 text-center">
        <H as="p" className="font-display text-lg font-semibold text-clay-900">
          No ledger rows in this view
        </H>
        <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
          Widen the date range, clear role/category filters, or clear search.
        </H>
      </NeuSurface>
    );
  }

  if (compact) {
    return (
      <H className="grid gap-3">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </H>
    );
  }

  return (
    <NeuSurface inset className="min-w-0 overflow-hidden">
      <H className="neu-scroll overflow-x-auto">
        <H className="min-w-[920px]">
          <H
            className={[
              DESKTOP_ROW,
              "border-b border-clay-200/80 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-clay-700",
            ].join(" ")}
          >
            <H as="span">Admin</H>
            <H as="span">Action</H>
            <H as="span">Target</H>
            <H as="span" className="whitespace-nowrap">
              Timestamp
            </H>
            <H as="span">IP</H>
          </H>

          {events.map((event) => (
            <H
              key={event.id}
              className={[
                DESKTOP_ROW,
                "border-t border-clay-200/80 px-5 py-3.5 transition-colors duration-press",
                "hover:bg-moss-soft/20",
              ].join(" ")}
            >
              <H className="flex min-w-0 items-center gap-3">
                <Avatar name={event.actor.name} />
                <H className="min-w-0">
                  <H
                    as="p"
                    className="truncate font-display text-sm font-semibold text-clay-900"
                  >
                    {event.actor.name}
                  </H>
                  <H as="p" className="mt-0.5 truncate text-xs text-clay-700">
                    {TIER_LABEL[event.actor.role]}
                  </H>
                </H>
              </H>

              <H className="min-w-0">
                <ActionPill action={event.action} />
                <H as="p" className="mt-1 truncate text-xs text-clay-700">
                  {event.detail}
                </H>
              </H>

              <H as="p" className="min-w-0 truncate text-sm text-clay-900">
                {event.target}
              </H>

              <H
                as="span"
                className="whitespace-nowrap text-sm tabular-nums text-clay-700"
              >
                {formatStamp(event.createdAt)}
              </H>

              <H
                as="span"
                className="truncate font-mono text-xs tabular-nums text-clay-700"
                title={event.ip}
              >
                {event.ip}
              </H>
            </H>
          ))}
        </H>
      </H>
    </NeuSurface>
  );
}

function EventCard({ event }: { event: AuditEvent }) {
  return (
    <H className="rounded-neu bg-clay-100 p-4 shadow-neu-sm">
      <H className="flex items-start justify-between gap-3">
        <H className="flex min-w-0 items-center gap-3">
          <Avatar name={event.actor.name} />
          <H className="min-w-0">
            <H as="p" className="truncate font-display font-semibold text-clay-900">
              {event.actor.name}
            </H>
            <H as="p" className="mt-0.5 truncate text-xs text-clay-700">
              {TIER_LABEL[event.actor.role]}
            </H>
          </H>
        </H>
        <ActionPill action={event.action} />
      </H>

      <H className="mt-3 rounded-neu-md bg-clay-100 px-3 py-2.5 shadow-neu-in-sm">
        <H as="p" className="text-sm font-medium text-clay-900">{event.target}</H>
        <H as="p" className="mt-1 text-xs leading-relaxed text-clay-700">
          {event.detail}
        </H>
      </H>

      <H className="mt-3 flex flex-wrap items-center gap-2 text-xs text-clay-500">
        <H
          as="span"
          className="inline-flex rounded-full bg-clay-100 px-2.5 py-1 tabular-nums shadow-neu-in-sm"
        >
          {formatStamp(event.createdAt)}
        </H>
        <H
          as="span"
          className="inline-flex rounded-full bg-clay-100 px-2.5 py-1 font-mono tabular-nums shadow-neu-in-sm"
        >
          {event.ip}
        </H>
      </H>
    </H>
  );
}

function ActionPill({ action }: { action: AuditEvent["action"] }) {
  const tone =
    action === "banned_user" ||
    action === "removed_listing" ||
    action === "rejected_purchase"
      ? "text-ember"
      : action === "granted_credits" ||
          action === "approved_purchase" ||
          action === "unrestricted_user"
        ? "text-moss"
        : action === "updated_rbac" || action === "exported_logs"
          ? "text-ochre"
          : "text-clay-900";

  return (
    <H
      as="span"
      className={[
        "inline-flex max-w-full truncate rounded-full bg-clay-100 px-2.5 py-1 text-[11px] font-semibold shadow-neu-in-sm",
        tone,
      ].join(" ")}
    >
      {ACTION_LABEL[action]}
    </H>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <H
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-clay-100 font-display text-xs font-semibold text-moss shadow-neu-in-sm"
      aria-hidden
    >
      {initials(name)}
    </H>
  );
}

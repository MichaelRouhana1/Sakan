import { Copy, ExternalLink, Phone, Wifi } from "lucide-react-native";
import { Link, type Href } from "expo-router";
import { H } from "../h";
import { ADMIN_MUTED } from "../theme";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { AlertActions } from "./AlertActions";
import { AlertStatusPill, PatternPill, SeverityPill } from "./TrustPills";
import {
  accountStatusLabel,
  formatStamp,
  historyKindLabel,
  initials,
  patternLabel,
  personName,
  type AlertActionKind,
  type ScamAlert,
  type ScamPattern,
} from "./types";

type Props = {
  alerts: ScamAlert[];
  selectedId: string | null;
  hasFilters: boolean;
  page: number;
  pageCount: number;
  total: number;
  onPage: (page: number) => void;
  onSelect: (alert: ScamAlert) => void;
  onAction: (alert: ScamAlert, kind: AlertActionKind) => void;
};

export function ScamAlertsFeed({
  alerts,
  selectedId,
  hasFilters,
  page,
  pageCount,
  total,
  onPage,
  onSelect,
  onAction,
}: Props) {
  if (alerts.length === 0) {
    return (
      <NeuSurface inset className="px-6 py-16 text-center">
        <H as="p" className="font-display text-lg font-semibold text-clay-900">
          {hasFilters ? "No matches" : "No alerts"}
        </H>
        <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
          {hasFilters
            ? "Try another severity, status, or search."
            : "Shared IPs, duplicate phones, and cloned listings land here when they fire."}
        </H>
      </NeuSurface>
    );
  }

  return (
    <H className="flex flex-col gap-3">
      <H className="flex items-center justify-between px-1">
        <H as="span" className="text-xs text-clay-500">
          {total} total
        </H>
      </H>

      <H className="space-y-3" role="feed" aria-label="Scam pattern alerts">
        {alerts.map((alert) => {
          const selected = selectedId === alert.id;
          const accent =
            alert.severity === "critical"
              ? "bg-ember"
              : alert.severity === "high"
                ? "bg-ochre"
                : "bg-clay-500";
          return (
            <H
              key={alert.id}
              role="article"
              tabIndex={0}
              onClick={() => onSelect(alert)}
              onKeyDown={(event: { key: string }) => {
                if (event.key === "Enter" || event.key === " ") onSelect(alert);
              }}
              className={[
                "relative cursor-pointer overflow-hidden rounded-neu-md bg-clay-100 p-4 shadow-neu-sm transition-shadow duration-press",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
                selected ? "shadow-press" : "",
              ].join(" ")}
            >
              <H
                className={`absolute inset-y-3 left-0 w-1 rounded-full ${accent}`}
                aria-hidden
              />
              <H className="pl-3">
                <H className="flex flex-wrap items-center gap-2">
                  <SeverityPill severity={alert.severity} />
                  <PatternPill label={patternLabel(alert.pattern)} />
                  <AlertStatusPill status={alert.status} />
                  <H as="span" className="ml-auto text-[11px] text-clay-500">
                    {formatStamp(alert.createdAt)}
                  </H>
                </H>
                <H as="p" className="mt-2.5 font-display text-sm font-semibold">
                  {alert.title}
                </H>
                <H as="p" className="mt-1 text-sm leading-relaxed text-clay-700">
                  {alert.detail}
                </H>
                <H className="mt-3 flex items-center gap-2 rounded-neu-md bg-clay-100 px-3 py-2 shadow-neu-in-sm">
                  <PatternIcon pattern={alert.pattern} />
                  <H
                    as="span"
                    className="font-display text-sm font-semibold tabular-nums text-clay-900"
                  >
                    {alert.signal}
                  </H>
                  <H as="span" className="text-xs text-clay-500">
                    {alert.accounts.length} accounts
                  </H>
                </H>
                {alert.listingIds.length > 0 ? (
                  <H className="mt-2 flex flex-wrap gap-2">
                    {alert.listingIds.map((listingId) => (
                      <DeepLink
                        key={listingId}
                        href={`/admin/listings?id=${listingId}`}
                        label="Open in Listings"
                      />
                    ))}
                  </H>
                ) : null}
                <H
                  className="mt-3 flex flex-wrap gap-2"
                  onClick={(event: { stopPropagation: () => void }) =>
                    event.stopPropagation()
                  }
                >
                  {alert.accounts.map((account) => (
                    <Link
                      key={account.id}
                      href={`/admin/users?id=${account.id}` as Href}
                      className="inline-flex items-center gap-2 rounded-full bg-clay-100 py-1 pl-1 pr-2.5 shadow-neu-in-sm"
                    >
                      <H
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-clay-100 text-[10px] font-semibold text-moss shadow-neu-sm"
                        aria-hidden
                      >
                        {initials(account)}
                      </H>
                      <H as="span" className="text-xs font-medium text-clay-900">
                        {personName(account)}
                      </H>
                      <H as="span" className="text-[10px] text-clay-500">
                        {accountStatusLabel(account.accountStatus)}
                        {account.warningCount > 0
                          ? ` · ${account.warningCount}w`
                          : ""}
                      </H>
                    </Link>
                  ))}
                </H>
                {alert.history.length > 0 ? (
                  <H as="p" className="mt-2 text-[11px] text-clay-500">
                    Last: {historyKindLabel(alert.history[alert.history.length - 1]!.kind)}{" "}
                    · {alert.history[alert.history.length - 1]!.actor}
                  </H>
                ) : null}
                <H className="mt-3">
                  <AlertActions
                    alert={alert}
                    onAction={(kind) => onAction(alert, kind)}
                  />
                </H>
              </H>
            </H>
          );
        })}
      </H>

      {pageCount > 1 ? (
        <H className="flex items-center justify-between gap-3 px-1">
          <NeuButton
            disabled={page <= 1}
            className="text-xs"
            onClick={() => onPage(page - 1)}
          >
            Previous
          </NeuButton>
          <H as="span" className="text-xs text-clay-700">
            Page {page} / {pageCount}
          </H>
          <NeuButton
            disabled={page >= pageCount}
            className="text-xs"
            onClick={() => onPage(page + 1)}
          >
            Next
          </NeuButton>
        </H>
      ) : null}
    </H>
  );
}

function PatternIcon({ pattern }: { pattern: ScamPattern }) {
  if (pattern === "duplicate_phone") {
    return <Phone size={14} strokeWidth={1.75} color={ADMIN_MUTED} />;
  }
  if (pattern === "cloned_listings") {
    return <Copy size={14} strokeWidth={1.75} color={ADMIN_MUTED} />;
  }
  return <Wifi size={14} strokeWidth={1.75} color={ADMIN_MUTED} />;
}

function DeepLink({ href, label }: { href: string; label: string }) {
  return (
    <H
      as="span"
      onClick={(event: { stopPropagation: () => void }) => event.stopPropagation()}
    >
      <Link
        href={href as Href}
        className="inline-flex items-center gap-1.5 rounded-full bg-clay-100 px-3 py-1.5 text-xs font-medium text-moss shadow-neu-sm"
      >
        <ExternalLink size={12} strokeWidth={1.75} />
        {label}
      </Link>
    </H>
  );
}

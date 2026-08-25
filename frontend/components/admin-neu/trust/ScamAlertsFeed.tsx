import { Phone, Wifi } from "lucide-react-native";
import { H } from "../h";
import { ADMIN_MUTED } from "../theme";
import { NeuSurface } from "../NeuPrimitives";
import { AlertActions } from "./AlertActions";
import { AlertStatusPill, PatternPill, SeverityPill } from "./TrustPills";
import {
  formatStamp,
  initials,
  patternLabel,
  personName,
  type ScamAlert,
  type TrustActionKind,
} from "./types";

type Props = {
  alerts: ScamAlert[];
  onAction: (
    alert: ScamAlert,
    kind: Extract<TrustActionKind, "warn" | "restrict" | "review">,
  ) => void;
};

export function ScamAlertsFeed({ alerts, onAction }: Props) {
  if (alerts.length === 0) {
    return (
      <NeuSurface inset className="px-6 py-16 text-center">
        <H as="p" className="font-display text-lg font-semibold text-clay-900">
          No open patterns
        </H>
        <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
          Shared IPs and duplicate phones land here when they fire.
        </H>
      </NeuSurface>
    );
  }

  return (
    <NeuSurface as="section" className="overflow-hidden">
      <H className="flex items-end justify-between gap-3 px-5 pt-5">
        <H>
          <H as="h2" className="font-display text-lg font-semibold">
            Scam pattern alerts
          </H>
          <H as="p" className="mt-1 text-sm text-clay-700">
            Same IP, cloned photos, reused Lebanese mobiles.
          </H>
        </H>
      </H>

      <H
        className="neu-scroll mt-4 max-h-[min(62vh,640px)] space-y-3 overflow-y-auto px-5 pb-5"
        role="feed"
        aria-label="Scam pattern alerts"
      >
        {alerts.map((alert) => {
          const accent =
            alert.severity === "critical"
              ? "bg-ember"
              : alert.severity === "high"
                ? "bg-ochre"
                : "bg-clay-500";
          const phone = alert.pattern === "duplicate_phone";
          return (
            <H
              key={alert.id}
              className="relative overflow-hidden rounded-neu-md bg-clay-100 p-4 shadow-neu-sm"
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
                  {phone ? (
                    <Phone size={14} strokeWidth={1.75} color={ADMIN_MUTED} />
                  ) : (
                    <Wifi size={14} strokeWidth={1.75} color={ADMIN_MUTED} />
                  )}
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
                <H className="mt-3 flex flex-wrap gap-2">
                  {alert.accounts.map((account) => (
                    <H
                      key={account.id}
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
                    </H>
                  ))}
                </H>
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
    </NeuSurface>
  );
}

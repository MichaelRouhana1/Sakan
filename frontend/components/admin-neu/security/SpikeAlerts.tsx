import { AlertTriangle, Radio } from "lucide-react-native";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { ADMIN_MUTED } from "../theme";
import { formatCount, type SpikeAlert } from "./types";

type Props = {
  alerts: SpikeAlert[];
  rangeLabel: string;
  busy?: boolean;
  onAcknowledge?: (spikeId: string) => void;
};

export function SpikeAlerts({
  alerts,
  rangeLabel,
  busy,
  onAcknowledge,
}: Props) {
  return (
    <NeuSurface as="section" className="flex h-full flex-col p-5 sm:p-6">
      <H className="flex items-start justify-between gap-3">
        <H>
          <H
            as="p"
            className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-moss"
          >
            Threat cues
          </H>
          <H as="h2" className="mt-1 font-display text-lg font-semibold text-clay-900">
            Scrape spikes
          </H>
          <H as="p" className="mt-1 text-sm leading-relaxed text-clay-700">
            Demo traffic only — buckets where scrape-like share crossed 25%.
          </H>
        </H>
        <H
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-clay-100 shadow-neu-sm"
          aria-hidden
        >
          <Radio size={18} strokeWidth={1.75} color={ADMIN_MUTED} />
        </H>
      </H>

      <H as="p" className="mt-3 text-[11px] tabular-nums text-clay-500">
        {rangeLabel} · {alerts.length} flagged
      </H>

      {alerts.length === 0 ? (
        <H className="mt-5 flex flex-1 flex-col items-center justify-center rounded-neu-md bg-clay-100 px-4 py-10 text-center shadow-neu-in-sm">
          <H as="p" className="font-display text-sm font-semibold text-moss">
            Quiet window
          </H>
          <H as="p" className="mt-1 max-w-[220px] text-xs text-clay-700">
            No open scrape spikes in this demo series.
          </H>
        </H>
      ) : (
        <H className="mt-4 flex flex-1 flex-col gap-2.5">
          {alerts.map((alert) => (
            <H
              key={alert.id}
              className="rounded-neu-md bg-clay-100 px-3.5 py-3 shadow-neu-in-sm"
            >
              <H className="flex items-start justify-between gap-3">
                <H className="min-w-0">
                  <H className="flex flex-wrap items-center gap-2">
                    <H
                      as="span"
                      className="font-display text-sm font-semibold text-clay-900"
                    >
                      {alert.label}
                    </H>
                    <SeverityPill severity={alert.severity} />
                  </H>
                  <H
                    as="p"
                    className="mt-1 truncate font-mono text-[11px] text-clay-700"
                  >
                    {alert.endpoint}
                  </H>
                </H>
                <AlertTriangle
                  size={16}
                  strokeWidth={1.75}
                  color={
                    alert.severity === "high"
                      ? "var(--admin-ember)"
                      : "var(--admin-ochre)"
                  }
                />
              </H>
              <H className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                <StatChip
                  label={`${formatCount(alert.scrapes)} scrape`}
                  tone="ember"
                />
                <StatChip
                  label={`${formatCount(alert.requests)} req`}
                  tone="plain"
                />
                <StatChip
                  label={`${alert.share.toFixed(0)}% share`}
                  tone={alert.severity === "high" ? "ember" : "ochre"}
                />
              </H>
              {onAcknowledge ? (
                <H className="mt-3 flex justify-end">
                  <NeuButton
                    className="px-2.5 py-1.5 text-xs"
                    disabled={busy}
                    onClick={() => onAcknowledge(alert.id)}
                  >
                    Acknowledge
                  </NeuButton>
                </H>
              ) : null}
            </H>
          ))}
        </H>
      )}
    </NeuSurface>
  );
}

function SeverityPill({ severity }: { severity: SpikeAlert["severity"] }) {
  return (
    <H
      as="span"
      className={[
        "inline-flex rounded-full bg-clay-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-neu-sm",
        severity === "high" ? "text-ember" : "text-ochre",
      ].join(" ")}
    >
      {severity}
    </H>
  );
}

function StatChip({
  label,
  tone,
}: {
  label: string;
  tone: "plain" | "ember" | "ochre";
}) {
  const color =
    tone === "ember"
      ? "text-ember"
      : tone === "ochre"
        ? "text-ochre"
        : "text-clay-700";
  return (
    <H
      as="span"
      className={[
        "inline-flex rounded-full bg-clay-100 px-2.5 py-1 font-medium tabular-nums shadow-neu-sm",
        color,
      ].join(" ")}
    >
      {label}
    </H>
  );
}

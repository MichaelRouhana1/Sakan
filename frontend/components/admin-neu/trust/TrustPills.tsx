import { X } from "lucide-react-native";
import { H } from "../h";
import {
  alertStatusLabel,
  badgeLabel,
  queueLabel,
  severityLabel,
  type AlertSeverity,
  type AlertStatus,
  type BadgeState,
  type KycQueue,
} from "./types";

const QUEUE_TONE: Record<KycQueue, { text: string; dot: string }> = {
  pending: { text: "text-ochre", dot: "bg-ochre" },
  verified: { text: "text-moss", dot: "bg-moss" },
  rejected: { text: "text-ember", dot: "bg-ember" },
};

export function KycQueuePill({ queue }: { queue: KycQueue }) {
  const tone = QUEUE_TONE[queue];
  return (
    <H
      as="span"
      className={[
        "inline-flex items-center gap-1.5 rounded-full bg-clay-100 px-2.5 py-1 text-xs font-semibold shadow-neu-in-sm",
        tone.text,
      ].join(" ")}
    >
      <H as="span" className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden />
      {queueLabel(queue)}
    </H>
  );
}

const BADGE_TONE: Record<BadgeState, string> = {
  none: "text-clay-700",
  verified: "text-moss",
  revoked: "text-ember",
};

export function BadgePill({ badge }: { badge: BadgeState }) {
  return (
    <H
      as="span"
      className={[
        "inline-flex rounded-full bg-clay-100 px-2.5 py-1 text-xs font-medium shadow-neu-sm",
        BADGE_TONE[badge],
      ].join(" ")}
    >
      {badgeLabel(badge)}
    </H>
  );
}

const SEVERITY_TONE: Record<AlertSeverity, { text: string; dot: string; glow: string }> = {
  watch: { text: "text-clay-700", dot: "bg-clay-500", glow: "" },
  high: { text: "text-ochre", dot: "bg-ochre", glow: "shadow-dot-ochre" },
  critical: { text: "text-ember", dot: "bg-ember", glow: "shadow-dot-ember" },
};

export function SeverityPill({ severity }: { severity: AlertSeverity }) {
  const tone = SEVERITY_TONE[severity];
  return (
    <H
      as="span"
      className={[
        "inline-flex items-center gap-1.5 rounded-full bg-clay-100 px-2.5 py-1 text-xs font-semibold shadow-neu-in-sm",
        tone.text,
      ].join(" ")}
    >
      <H
        as="span"
        className={`h-1.5 w-1.5 rounded-full ${tone.dot} ${tone.glow}`}
        aria-hidden
      />
      {severityLabel(severity)}
    </H>
  );
}

const ALERT_STATUS_TONE: Record<AlertStatus, { text: string; dot: string }> = {
  open: { text: "text-ochre", dot: "bg-ochre" },
  reviewing: { text: "text-moss", dot: "bg-moss" },
  warned: { text: "text-ochre", dot: "bg-ochre" },
  suspended: { text: "text-ember", dot: "bg-ember" },
  cleared: { text: "text-clay-500", dot: "bg-clay-500" },
};

export function AlertStatusPill({ status }: { status: AlertStatus }) {
  const tone = ALERT_STATUS_TONE[status];
  return (
    <H
      as="span"
      className={[
        "inline-flex items-center gap-1.5 rounded-full bg-clay-100 px-2.5 py-1 text-xs font-semibold shadow-neu-in-sm",
        tone.text,
      ].join(" ")}
    >
      <H as="span" className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden />
      {alertStatusLabel(status)}
    </H>
  );
}

export function PatternPill({ label }: { label: string }) {
  return (
    <H
      as="span"
      className="inline-flex rounded-full bg-clay-100 px-2.5 py-1 text-xs font-medium text-clay-700 shadow-neu-sm"
    >
      {label}
    </H>
  );
}

export function DomainChip({
  domain,
  onRemove,
}: {
  domain: string;
  onRemove?: () => void;
}) {
  return (
    <H
      as="span"
      className="inline-flex items-center gap-1 rounded-full bg-clay-100 px-2.5 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
    >
      @{domain}
      {onRemove ? (
        <H
          as="button"
          type="button"
          aria-label={`Remove ${domain}`}
          onClick={(event: { stopPropagation: () => void; preventDefault: () => void }) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove();
          }}
          className="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-clay-500 hover:text-ember focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
        >
          <X size={10} strokeWidth={2.25} />
        </H>
      ) : null}
    </H>
  );
}

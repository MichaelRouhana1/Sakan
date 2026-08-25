import { H } from "../h";
import { queueLabel, type ReportQueue } from "./types";

const TONE: Record<ReportQueue, { text: string; dot: string }> = {
  pending: { text: "text-ochre", dot: "bg-ochre" },
  in_review: { text: "text-moss", dot: "bg-moss" },
  resolved: { text: "text-clay-700", dot: "bg-clay-500" },
  dismissed: { text: "text-clay-500", dot: "bg-clay-500" },
};

export function ReportStatusPill({ queue }: { queue: ReportQueue }) {
  const tone = TONE[queue];
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

export function ReasonPill({ label }: { label: string }) {
  return (
    <H
      as="span"
      className="inline-flex rounded-full bg-clay-100 px-2.5 py-1 text-xs font-medium text-clay-700 shadow-neu-sm"
    >
      {label}
    </H>
  );
}

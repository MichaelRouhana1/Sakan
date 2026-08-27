import { H } from "../h";
import {
  daysSinceExpiry,
  queueLabel,
  type ExpiredAsset,
  type ExpiredQueue,
} from "./types";

const QUEUE_TONE: Record<
  Exclude<ExpiredQueue, "all">,
  { text: string; dot: string }
> = {
  recent: { text: "text-ochre", dot: "bg-ochre" },
  archived: { text: "text-clay-700", dot: "bg-clay-500" },
  pending_deletion: { text: "text-ember", dot: "bg-ember" },
};

export function ExpiredQueuePill({
  queue,
}: {
  queue: Exclude<ExpiredQueue, "all">;
}) {
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

export function DaysSincePill({ asset }: { asset: ExpiredAsset }) {
  const days = daysSinceExpiry(asset);
  const tone =
    days <= 7
      ? { text: "text-ochre", fill: "bg-ochre", width: "w-1/4" }
      : days <= 21
        ? { text: "text-clay-700", fill: "bg-clay-500", width: "w-1/2" }
        : days <= 40
          ? { text: "text-ember", fill: "bg-ember", width: "w-3/4" }
          : { text: "text-ember", fill: "bg-ember", width: "w-full" };

  return (
    <H className="min-w-[88px]">
      <H
        as="span"
        className={[
          "font-display text-sm font-semibold tabular-nums",
          tone.text,
        ].join(" ")}
      >
        {days}d
      </H>
      <H
        className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-clay-100 shadow-neu-in-sm"
        aria-hidden
      >
        <H className={`h-full ${tone.fill} ${tone.width}`} />
      </H>
      <H as="span" className="sr-only">
        {days} days since expiration
      </H>
    </H>
  );
}

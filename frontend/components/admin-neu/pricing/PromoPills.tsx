import { H } from "../h";
import { statusLabel, type PromoStatus } from "./types";

const TONE: Record<PromoStatus, { text: string; dot: string }> = {
  active: { text: "text-moss", dot: "bg-moss" },
  scheduled: { text: "text-ochre", dot: "bg-ochre" },
  paused: { text: "text-clay-700", dot: "bg-clay-500" },
  expired: { text: "text-ember", dot: "bg-ember" },
};

export function PromoStatusPill({ status }: { status: PromoStatus }) {
  const tone = TONE[status];
  return (
    <H
      as="span"
      className={[
        "inline-flex items-center gap-1.5 rounded-full bg-clay-100 px-2.5 py-1 text-xs font-semibold shadow-neu-in-sm",
        tone.text,
      ].join(" ")}
    >
      <H as="span" className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden />
      {statusLabel(status)}
    </H>
  );
}

export function PromoCodeChip({ code }: { code: string }) {
  return (
    <H
      as="span"
      className="inline-flex rounded-full bg-clay-100 px-2.5 py-1 font-display text-xs font-semibold tracking-wide text-clay-900 shadow-neu-sm"
    >
      {code}
    </H>
  );
}

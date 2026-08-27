import { H } from "../h";
import { kindLabel, statusLabel, type TxKind, type TxStatus } from "./types";

const STATUS_TONE: Record<TxStatus, { text: string; dot: string }> = {
  completed: { text: "text-moss", dot: "bg-moss" },
  refunded: { text: "text-ochre", dot: "bg-ochre" },
  disputed: { text: "text-ember", dot: "bg-ember" },
  failed: { text: "text-ember", dot: "bg-ember" },
};

export function CreditStatusPill({ status }: { status: TxStatus }) {
  const tone = STATUS_TONE[status];
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

export function CreditKindPill({ kind }: { kind: TxKind }) {
  return (
    <H
      as="span"
      className="inline-flex rounded-full bg-clay-100 px-2.5 py-1 text-xs font-medium text-clay-700 shadow-neu-sm"
    >
      {kindLabel(kind)}
    </H>
  );
}

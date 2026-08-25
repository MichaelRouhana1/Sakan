import { Ban, Check, Megaphone, Trash2, TriangleAlert } from "lucide-react-native";
import { NeuButton } from "../NeuPrimitives";
import { H } from "../h";
import type { AdminReport, ReportActionKind } from "./types";

type Props = {
  report: AdminReport;
  compact?: boolean;
  onAction: (kind: ReportActionKind) => void;
};

export function ReportActions({ report, compact, onAction }: Props) {
  const closed = report.queue === "resolved" || report.queue === "dismissed";
  const canClaim = report.queue === "pending";

  return (
    <H
      className={
        compact
          ? "flex items-center justify-end gap-1.5"
          : "flex flex-wrap gap-2"
      }
      onClick={(event: { stopPropagation: () => void }) => event.stopPropagation()}
    >
      {canClaim && !compact ? (
        <NeuButton
          tone="moss"
          inset
          ariaLabel="Start review"
          onClick={() => onAction("claim")}
        >
          Start review
        </NeuButton>
      ) : null}
      <NeuButton
        disabled={closed}
        ariaLabel="Dismiss report"
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
        onClick={() => onAction("dismiss")}
      >
        <Check size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : "Dismiss"}
      </NeuButton>
      <NeuButton
        tone="ember"
        disabled={closed || report.listing.status === "removed"}
        ariaLabel="Take down listing"
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
        onClick={() => onAction("remove")}
      >
        <Trash2 size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : "Take down"}
      </NeuButton>
      <NeuButton
        tone="ochre"
        disabled={closed}
        ariaLabel="Warn poster"
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
        onClick={() => onAction("warn")}
      >
        <Megaphone size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : "Warn"}
      </NeuButton>
      <NeuButton
        tone="ochre"
        disabled={closed || report.poster.accountStatus !== "active"}
        ariaLabel="Suspend poster"
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
        onClick={() => onAction("restrict")}
      >
        {compact ? (
          <TriangleAlert size={14} strokeWidth={1.75} />
        ) : (
          <>
            <Ban size={16} strokeWidth={1.75} />
            Suspend
          </>
        )}
      </NeuButton>
    </H>
  );
}

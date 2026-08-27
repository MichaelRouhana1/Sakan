import {
  Ban,
  Check,
  Megaphone,
  RotateCcw,
  Trash2,
  TriangleAlert,
  Undo2,
} from "lucide-react-native";
import { NeuButton } from "../NeuPrimitives";
import { H } from "../h";
import {
  canBan,
  canClaim,
  canDismiss,
  canDismissListing,
  canRemove,
  canReopen,
  canRestrict,
  canUnclaim,
  canWarn,
  type AdminReport,
  type ReportActionKind,
} from "./types";

type Props = {
  report: AdminReport;
  compact?: boolean;
  onAction: (kind: ReportActionKind) => void;
};

export function ReportActions({ report, compact, onAction }: Props) {
  return (
    <H
      className={
        compact
          ? "flex flex-wrap items-center justify-end gap-1.5"
          : "flex flex-wrap gap-2"
      }
      onClick={(event: { stopPropagation: () => void }) => event.stopPropagation()}
    >
      {canClaim(report) ? (
        <NeuButton
          tone="moss"
          inset={!compact}
          ariaLabel="Start review"
          className={compact ? "px-2.5 py-1.5 text-xs" : ""}
          onClick={() => onAction("claim")}
        >
          {compact ? "Claim" : "Start review"}
        </NeuButton>
      ) : null}
      {canUnclaim(report) && !compact ? (
        <NeuButton
          ariaLabel="Release claim"
          onClick={() => onAction("unclaim")}
        >
          <Undo2 size={16} strokeWidth={1.75} />
          Unclaim
        </NeuButton>
      ) : null}
      {canDismiss(report) ? (
        <NeuButton
          ariaLabel="Dismiss report"
          className={compact ? "px-2.5 py-1.5 text-xs" : ""}
          onClick={() => onAction("dismiss")}
        >
          <Check size={compact ? 14 : 16} strokeWidth={1.75} />
          {compact ? null : "Dismiss"}
        </NeuButton>
      ) : null}
      {canDismissListing(report) && !compact ? (
        <NeuButton
          ariaLabel="Dismiss all open reports on listing"
          onClick={() => onAction("dismiss_listing")}
        >
          Dismiss all on listing
        </NeuButton>
      ) : null}
      {canRemove(report) ? (
        <NeuButton
          tone="ember"
          ariaLabel="Take down listing"
          className={compact ? "px-2.5 py-1.5 text-xs" : ""}
          onClick={() => onAction("remove")}
        >
          <Trash2 size={compact ? 14 : 16} strokeWidth={1.75} />
          {compact ? null : "Take down"}
        </NeuButton>
      ) : null}
      {canWarn(report) ? (
        <NeuButton
          tone="ochre"
          ariaLabel="Warn poster"
          className={compact ? "px-2.5 py-1.5 text-xs" : ""}
          onClick={() => onAction("warn")}
        >
          <Megaphone size={compact ? 14 : 16} strokeWidth={1.75} />
          {compact ? null : "Warn"}
        </NeuButton>
      ) : null}
      {canRestrict(report) ? (
        <NeuButton
          tone="ochre"
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
      ) : null}
      {canBan(report) && !compact ? (
        <NeuButton
          tone="ember"
          ariaLabel="Ban poster"
          onClick={() => onAction("ban")}
        >
          <Ban size={16} strokeWidth={1.75} />
          Ban
        </NeuButton>
      ) : null}
      {canReopen(report) ? (
        <NeuButton
          tone="moss"
          ariaLabel="Reopen ticket"
          className={compact ? "px-2.5 py-1.5 text-xs" : ""}
          onClick={() => onAction("reopen")}
        >
          <RotateCcw size={compact ? 14 : 16} strokeWidth={1.75} />
          {compact ? null : "Reopen"}
        </NeuButton>
      ) : null}
    </H>
  );
}

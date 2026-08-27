import { Check, CircleOff, Megaphone, ScanSearch, TriangleAlert } from "lucide-react-native";
import { NeuButton } from "../NeuPrimitives";
import { H } from "../h";
import {
  canClear,
  canRestrict,
  canReview,
  canWarn,
  type AlertActionKind,
  type ScamAlert,
} from "./types";

type Props = {
  alert: ScamAlert;
  compact?: boolean;
  onAction: (kind: AlertActionKind) => void;
};

export function AlertActions({ alert, compact, onAction }: Props) {
  const warn = canWarn(alert);
  const restrict = canRestrict(alert);
  const review = canReview(alert);
  const clear = canClear(alert);
  const iconBtn = compact ? "h-9 w-9 shrink-0 px-0 py-0" : "";

  return (
    <H
      className={compact ? "flex items-center gap-1.5" : "flex flex-wrap gap-2"}
      onClick={(event: { stopPropagation: () => void }) => event.stopPropagation()}
    >
      <NeuButton
        tone="ochre"
        disabled={!warn}
        ariaLabel="Warn accounts"
        className={iconBtn}
        onClick={() => onAction("warn")}
      >
        <Megaphone size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : "Warn"}
      </NeuButton>
      <NeuButton
        tone="ember"
        disabled={!restrict}
        ariaLabel="Suspend accounts"
        className={iconBtn}
        onClick={() => onAction("restrict")}
      >
        <TriangleAlert size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : "Suspend"}
      </NeuButton>
      <NeuButton
        tone="moss"
        disabled={!review}
        ariaLabel="Start manual review"
        className={iconBtn}
        onClick={() => onAction("review")}
      >
        <ScanSearch size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : "Review"}
      </NeuButton>
      <NeuButton
        disabled={!clear}
        ariaLabel="Clear alert"
        className={iconBtn}
        onClick={() => onAction("clear")}
      >
        {clear ? (
          <Check size={compact ? 14 : 16} strokeWidth={1.75} />
        ) : (
          <CircleOff size={compact ? 14 : 16} strokeWidth={1.75} />
        )}
        {compact ? null : "Clear"}
      </NeuButton>
    </H>
  );
}

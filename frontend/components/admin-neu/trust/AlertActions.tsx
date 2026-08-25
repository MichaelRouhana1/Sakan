import { Megaphone, ScanSearch, TriangleAlert } from "lucide-react-native";
import { NeuButton } from "../NeuPrimitives";
import { H } from "../h";
import type { ScamAlert, TrustActionKind } from "./types";

type Props = {
  alert: ScamAlert;
  compact?: boolean;
  onAction: (kind: Extract<TrustActionKind, "warn" | "restrict" | "review">) => void;
};

export function AlertActions({ alert, compact, onAction }: Props) {
  const settled = alert.status === "suspended" || alert.status === "cleared";
  const iconBtn = compact ? "h-9 w-9 shrink-0 px-0 py-0" : "";

  return (
    <H
      className={compact ? "flex items-center gap-1.5" : "flex flex-wrap gap-2"}
      onClick={(event: { stopPropagation: () => void }) => event.stopPropagation()}
    >
      <NeuButton
        tone="ochre"
        disabled={settled}
        ariaLabel="Warn accounts"
        className={iconBtn}
        onClick={() => onAction("warn")}
      >
        <Megaphone size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : "Warn"}
      </NeuButton>
      <NeuButton
        tone="ember"
        disabled={settled}
        ariaLabel="Suspend accounts"
        className={iconBtn}
        onClick={() => onAction("restrict")}
      >
        <TriangleAlert size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : "Suspend"}
      </NeuButton>
      <NeuButton
        tone="moss"
        disabled={settled || alert.status === "reviewing"}
        ariaLabel="Start manual review"
        className={iconBtn}
        onClick={() => onAction("review")}
      >
        <ScanSearch size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : "Review"}
      </NeuButton>
    </H>
  );
}

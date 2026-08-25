import { Ban, Megaphone, RotateCcw, TriangleAlert } from "lucide-react-native";
import { NeuButton } from "../NeuPrimitives";
import { H } from "../h";
import type { AccountStatus, ModerationKind } from "./types";

type Props = {
  status: AccountStatus;
  compact?: boolean;
  onAction: (kind: ModerationKind) => void;
};

export function UserModerationActions({ status, compact, onAction }: Props) {
  const canRestore = status !== "active";

  const iconBtn = compact ? "h-9 w-9 shrink-0 px-0 py-0" : "";

  return (
    <H
      className={
        compact
          ? "grid w-[10.5rem] grid-cols-4 justify-items-center gap-1.5"
          : "flex flex-wrap gap-2"
      }
      onClick={(event: { stopPropagation: () => void }) => event.stopPropagation()}
    >
      <NeuButton
        tone="ochre"
        ariaLabel="Warn user"
        className={iconBtn}
        onClick={() => onAction("warn")}
      >
        <Megaphone size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : "Warn"}
      </NeuButton>
      <NeuButton
        tone="ochre"
        disabled={status === "banned"}
        ariaLabel="Suspend user"
        className={iconBtn}
        onClick={() => onAction("restrict")}
      >
        <TriangleAlert size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : "Suspend"}
      </NeuButton>
      <NeuButton
        tone="ember"
        disabled={status === "banned"}
        ariaLabel="Ban user"
        className={iconBtn}
        onClick={() => onAction("ban")}
      >
        <Ban size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : "Ban"}
      </NeuButton>
      {canRestore ? (
        <NeuButton
          tone="moss"
          ariaLabel="Restore user"
          className={iconBtn}
          onClick={() => onAction("restore")}
        >
          <RotateCcw size={compact ? 14 : 16} strokeWidth={1.75} />
          {compact ? null : "Restore"}
        </NeuButton>
      ) : (
        compact ? <H aria-hidden className="h-9 w-9" /> : null
      )}
    </H>
  );
}

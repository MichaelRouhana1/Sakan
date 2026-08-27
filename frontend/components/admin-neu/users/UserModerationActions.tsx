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
  const iconSize = compact ? 20 : 18;
  const iconBtn = compact
    ? "h-10 w-10 shrink-0 !px-0 !py-0"
    : "";

  return (
    <H
      className={
        compact
          ? "grid w-[11.5rem] grid-cols-4 justify-items-center gap-1.5"
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
        <Megaphone size={iconSize} strokeWidth={2} />
        {compact ? null : "Warn"}
      </NeuButton>
      <NeuButton
        tone="ochre"
        disabled={status === "banned"}
        ariaLabel="Suspend user"
        className={iconBtn}
        onClick={() => onAction("restrict")}
      >
        <TriangleAlert size={iconSize} strokeWidth={2} />
        {compact ? null : "Suspend"}
      </NeuButton>
      <NeuButton
        tone="ember"
        disabled={status === "banned"}
        ariaLabel="Ban user"
        className={iconBtn}
        onClick={() => onAction("ban")}
      >
        <Ban size={iconSize} strokeWidth={2} />
        {compact ? null : "Ban"}
      </NeuButton>
      {canRestore ? (
        <NeuButton
          tone="moss"
          ariaLabel="Restore user"
          className={iconBtn}
          onClick={() => onAction("restore")}
        >
          <RotateCcw size={iconSize} strokeWidth={2} />
          {compact ? null : "Restore"}
        </NeuButton>
      ) : (
        compact ? <H aria-hidden className="h-10 w-10" /> : null
      )}
    </H>
  );
}

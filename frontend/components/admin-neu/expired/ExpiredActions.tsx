import { Archive, Bell, Trash2 } from "lucide-react-native";
import { NeuButton } from "../NeuPrimitives";
import { H } from "../h";
import {
  canArchive,
  canNudge,
  type ExpiredActionKind,
  type ExpiredAsset,
} from "./types";

type Props = {
  asset: ExpiredAsset;
  compact?: boolean;
  onAction: (kind: ExpiredActionKind) => void;
};

export function ExpiredActions({ asset, compact, onAction }: Props) {
  const nudgeOk = canNudge(asset);
  const archiveOk = canArchive(asset);
  const icon = compact ? 14 : 16;

  return (
    <H
      className={
        compact
          ? "flex items-center justify-end gap-1.5"
          : "flex flex-wrap gap-2"
      }
      onClick={(event: { stopPropagation: () => void }) => event.stopPropagation()}
    >
      <NeuButton
        tone="moss"
        disabled={!nudgeOk}
        ariaLabel="Send reactivation nudge"
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
        onClick={() => onAction("nudge")}
      >
        <Bell size={icon} strokeWidth={1.75} />
        {compact ? null : "Send nudge"}
      </NeuButton>
      <NeuButton
        tone="ochre"
        disabled={!archiveOk}
        ariaLabel="Keep archived"
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
        onClick={() => onAction("archive")}
      >
        <Archive size={icon} strokeWidth={1.75} />
        {compact ? null : "Keep archived"}
      </NeuButton>
      <NeuButton
        tone="ember"
        ariaLabel="Permanently delete"
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
        onClick={() => onAction("remove")}
      >
        <Trash2 size={icon} strokeWidth={1.75} />
        {compact ? null : "Permanently delete"}
      </NeuButton>
    </H>
  );
}

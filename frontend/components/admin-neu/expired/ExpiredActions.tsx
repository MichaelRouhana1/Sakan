import { Archive, Bell, RotateCcw, Trash2 } from "lucide-react-native";
import { NeuButton } from "../NeuPrimitives";
import { H } from "../h";
import {
  archiveButtonLabel,
  canArchive,
  canNudge,
  canPurge,
  canQueueDelete,
  canRenew,
  nudgeBlockedReason,
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
  const queueDeleteOk = canQueueDelete(asset);
  const purgeOk = canPurge(asset);
  const renewOk = canRenew(asset);
  const icon = compact ? 14 : 16;
  const nudgeReason = nudgeBlockedReason(asset);

  return (
    <H
      className={
        compact
          ? "flex flex-wrap items-center justify-end gap-1.5"
          : "flex flex-wrap gap-2"
      }
      onClick={(event: { stopPropagation: () => void }) => event.stopPropagation()}
    >
      {renewOk ? (
        <NeuButton
          tone="moss"
          ariaLabel="Mark listing renewed"
          className={compact ? "px-2.5 py-1.5 text-xs" : ""}
          onClick={() => onAction("renew")}
        >
          <RotateCcw size={icon} strokeWidth={1.75} />
          {compact ? null : "Mark renewed"}
        </NeuButton>
      ) : null}
      <NeuButton
        tone="moss"
        disabled={!nudgeOk}
        ariaLabel={nudgeReason ?? "Send reactivation nudge"}
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
        onClick={() => onAction("nudge")}
      >
        <Bell size={icon} strokeWidth={1.75} />
        {compact ? null : "Send nudge"}
      </NeuButton>
      <NeuButton
        tone="ochre"
        disabled={!archiveOk}
        ariaLabel={archiveButtonLabel(asset)}
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
        onClick={() => onAction("archive")}
      >
        <Archive size={icon} strokeWidth={1.75} />
        {compact ? null : archiveButtonLabel(asset)}
      </NeuButton>
      {queueDeleteOk ? (
        <NeuButton
          tone="ember"
          ariaLabel="Queue for permanent deletion"
          className={compact ? "px-2.5 py-1.5 text-xs" : ""}
          onClick={() => onAction("queue_delete")}
        >
          <Trash2 size={icon} strokeWidth={1.75} />
          {compact ? null : "Queue for deletion"}
        </NeuButton>
      ) : null}
      {purgeOk ? (
        <NeuButton
          tone="ember"
          ariaLabel="Permanently delete"
          className={compact ? "px-2.5 py-1.5 text-xs" : ""}
          onClick={() => onAction("purge")}
        >
          <Trash2 size={icon} strokeWidth={1.75} />
          {compact ? null : "Permanently delete"}
        </NeuButton>
      ) : null}
    </H>
  );
}

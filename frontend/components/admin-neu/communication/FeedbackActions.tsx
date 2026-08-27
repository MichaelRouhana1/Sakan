import { Archive, ArchiveRestore, Check, MailOpen, Reply } from "lucide-react-native";
import { NeuButton } from "../NeuPrimitives";
import { H } from "../h";
import {
  canArchive,
  canRead,
  canReply,
  canUnarchive,
  canUnread,
  type FeedbackActionKind,
  type FeedbackItem,
} from "./types";

type Props = {
  item: FeedbackItem;
  compact?: boolean;
  onAction: (kind: FeedbackActionKind) => void;
};

export function FeedbackActions({ item, compact, onAction }: Props) {
  const btn = compact ? "px-2.5 py-1.5 text-xs" : "";
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
        disabled={!canReply(item)}
        ariaLabel="Reply to feedback"
        className={btn}
        onClick={() => onAction("reply")}
      >
        <Reply size={icon} strokeWidth={1.75} />
        {compact ? null : "Reply"}
      </NeuButton>
      {canRead(item) ? (
        <NeuButton
          ariaLabel="Mark as read"
          className={btn}
          onClick={() => onAction("read")}
        >
          <Check size={icon} strokeWidth={1.75} />
          {compact ? null : "Mark as read"}
        </NeuButton>
      ) : null}
      {canUnread(item) ? (
        <NeuButton
          ariaLabel="Mark as unread"
          className={btn}
          onClick={() => onAction("unread")}
        >
          <MailOpen size={icon} strokeWidth={1.75} />
          {compact ? null : "Mark unread"}
        </NeuButton>
      ) : null}
      {canArchive(item) ? (
        <NeuButton
          tone="ochre"
          ariaLabel="Archive feedback"
          className={btn}
          onClick={() => onAction("archive")}
        >
          <Archive size={icon} strokeWidth={1.75} />
          {compact ? null : "Archive"}
        </NeuButton>
      ) : null}
      {canUnarchive(item) ? (
        <NeuButton
          ariaLabel="Unarchive feedback"
          className={btn}
          onClick={() => onAction("unarchive")}
        >
          <ArchiveRestore size={icon} strokeWidth={1.75} />
          {compact ? null : "Unarchive"}
        </NeuButton>
      ) : null}
    </H>
  );
}

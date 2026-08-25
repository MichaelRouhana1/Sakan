import { Archive, Check, Reply } from "lucide-react-native";
import { NeuButton } from "../NeuPrimitives";
import { H } from "../h";
import type { FeedbackActionKind, FeedbackItem } from "./types";

type Props = {
  item: FeedbackItem;
  compact?: boolean;
  onAction: (kind: FeedbackActionKind) => void;
};

export function FeedbackActions({ item, compact, onAction }: Props) {
  const unread = item.queue === "unread";
  const archived = item.queue === "archived";

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
        ariaLabel="Reply to feedback"
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
        onClick={() => onAction("reply")}
      >
        <Reply size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : "Reply"}
      </NeuButton>
      <NeuButton
        disabled={!unread}
        ariaLabel="Mark as read"
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
        onClick={() => onAction("read")}
      >
        <Check size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : "Mark as read"}
      </NeuButton>
      <NeuButton
        tone="ochre"
        disabled={archived}
        ariaLabel="Archive feedback"
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
        onClick={() => onAction("archive")}
      >
        <Archive size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : "Archive"}
      </NeuButton>
    </H>
  );
}

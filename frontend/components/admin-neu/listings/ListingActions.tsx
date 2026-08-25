import { Archive, Pencil, RotateCcw, Trash2 } from "lucide-react-native";
import { NeuButton } from "../NeuPrimitives";
import { H } from "../h";
import type { AdminListing, ListingActionKind } from "./types";

type Props = {
  listing: AdminListing;
  compact?: boolean;
  onEdit: () => void;
  onAction: (kind: ListingActionKind) => void;
};

export function ListingActions({ listing, compact, onEdit, onAction }: Props) {
  const canArchive = listing.status === "active";
  const canRemove = listing.status === "active" || listing.status === "archived";
  const canRestore = listing.status === "archived";

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
        ariaLabel="Edit listing details"
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
        onClick={onEdit}
      >
        <Pencil size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : "Edit"}
      </NeuButton>
      <NeuButton
        tone="ochre"
        disabled={!canArchive}
        ariaLabel="Archive listing"
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
        onClick={() => onAction("archive")}
      >
        <Archive size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : "Archive"}
      </NeuButton>
      <NeuButton
        tone="ember"
        disabled={!canRemove}
        ariaLabel="Take down listing"
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
        onClick={() => onAction("remove")}
      >
        <Trash2 size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : "Take down"}
      </NeuButton>
      {canRestore ? (
        <NeuButton
          tone="moss"
          ariaLabel="Restore listing"
          className={compact ? "px-2.5 py-1.5 text-xs" : ""}
          onClick={() => onAction("restore")}
        >
          <RotateCcw size={compact ? 14 : 16} strokeWidth={1.75} />
          {compact ? null : "Restore"}
        </NeuButton>
      ) : null}
    </H>
  );
}

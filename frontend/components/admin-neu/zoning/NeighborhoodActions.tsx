import { ArrowRightLeft, Pencil } from "lucide-react-native";
import { NeuButton } from "../NeuPrimitives";
import { H } from "../h";

type Props = {
  compact?: boolean;
  onRename: () => void;
  onMove: () => void;
  onMerge: () => void;
};

export function NeighborhoodActions({
  compact,
  onRename,
  onMove,
  onMerge,
}: Props) {
  return (
    <H
      className={
        compact
          ? "flex items-center justify-end gap-1.5"
          : "flex flex-wrap justify-end gap-2"
      }
      onClick={(event: { stopPropagation: () => void }) => event.stopPropagation()}
    >
      <NeuButton
        ariaLabel="Rename area"
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
        onClick={onRename}
      >
        <Pencil size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : "Rename"}
      </NeuButton>
      <NeuButton
        ariaLabel="Move area to another district"
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
        onClick={onMove}
      >
        <ArrowRightLeft size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : "Move"}
      </NeuButton>
      <NeuButton
        tone="ochre"
        ariaLabel="Merge area into another"
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
        onClick={onMerge}
      >
        {compact ? "Merge" : "Merge"}
      </NeuButton>
    </H>
  );
}

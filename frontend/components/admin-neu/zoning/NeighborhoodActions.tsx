import { ArrowRightLeft, Pencil, Power } from "lucide-react-native";
import { NeuButton } from "../NeuPrimitives";
import { H } from "../h";
import type { AdminNeighborhood } from "./types";

type Props = {
  area: AdminNeighborhood;
  compact?: boolean;
  onRename: () => void;
  onMove: () => void;
  onMerge: () => void;
  onToggleActive?: () => void;
};

export function NeighborhoodActions({
  area,
  compact,
  onRename,
  onMove,
  onMerge,
  onToggleActive,
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
        Merge
      </NeuButton>
      {area.origin === "custom" && onToggleActive ? (
        <NeuButton
          tone={area.active ? "ochre" : "moss"}
          ariaLabel={area.active ? "Deactivate custom area" : "Reactivate custom area"}
          className={compact ? "px-2.5 py-1.5 text-xs" : ""}
          onClick={onToggleActive}
        >
          <Power size={compact ? 14 : 16} strokeWidth={1.75} />
          {compact ? null : area.active ? "Deactivate" : "Activate"}
        </NeuButton>
      ) : null}
    </H>
  );
}

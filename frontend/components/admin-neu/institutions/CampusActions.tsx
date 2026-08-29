import { Pencil, Power } from "lucide-react-native";
import { NeuButton } from "../NeuPrimitives";
import { H } from "../h";
import type { AdminCampus, RegistryActionKind } from "./types";

type Props = {
  campus: AdminCampus;
  compact?: boolean;
  onEdit: () => void;
  onAction: (kind: RegistryActionKind) => void;
};

export function CampusActions({ campus, compact, onEdit, onAction }: Props) {
  const nextKind: RegistryActionKind = campus.active ? "deactivate" : "activate";

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
        ariaLabel="Edit campus"
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
        onClick={onEdit}
      >
        <Pencil size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : "Edit"}
      </NeuButton>
      <NeuButton
        tone={campus.active ? "ochre" : "moss"}
        ariaLabel={campus.active ? "Set campus inactive" : "Set campus active"}
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
        onClick={() => onAction(nextKind)}
      >
        <Power size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : campus.active ? "Deactivate" : "Activate"}
      </NeuButton>
    </H>
  );
}

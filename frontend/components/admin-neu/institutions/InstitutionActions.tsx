import { Pencil, Power } from "lucide-react-native";
import { NeuButton } from "../NeuPrimitives";
import { H } from "../h";
import type { AdminInstitution, RegistryActionKind } from "./types";

type Props = {
  institution: AdminInstitution;
  compact?: boolean;
  onEdit: () => void;
  onAction: (kind: RegistryActionKind) => void;
};

export function InstitutionActions({
  institution,
  compact,
  onEdit,
  onAction,
}: Props) {
  const nextKind: RegistryActionKind = institution.active
    ? "deactivate"
    : "activate";

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
        ariaLabel="Edit institution"
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
        onClick={onEdit}
      >
        <Pencil size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : "Edit"}
      </NeuButton>
      <NeuButton
        tone={institution.active ? "ochre" : "moss"}
        ariaLabel={
          institution.active ? "Set institution inactive" : "Set institution active"
        }
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
        onClick={() => onAction(nextKind)}
      >
        <Power size={compact ? 14 : 16} strokeWidth={1.75} />
        {compact ? null : institution.active ? "Deactivate" : "Activate"}
      </NeuButton>
    </H>
  );
}

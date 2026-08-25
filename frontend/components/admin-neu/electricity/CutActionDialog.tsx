import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { formatWindow, type CutAction, type GridZone } from "./types";

type Props = {
  action: CutAction | null;
  zone: GridZone | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function CutActionDialog({ action, zone, onCancel, onConfirm }: Props) {
  if (!action || !zone) return null;

  const window = zone.cutWindows.find((row) => row.id === action.windowId);
  const remove = action.kind === "remove";

  return (
    <H className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <H
        as="button"
        type="button"
        aria-label="Dismiss"
        className="admin-scrim absolute inset-0 cursor-pointer border-0"
        onClick={onCancel}
      />
      <NeuSurface className="relative w-full max-w-md p-5 sm:p-6" as="section">
        <H as="h2" className="font-display text-lg font-semibold text-clay-900">
          {remove ? "Remove this cut window" : "Mark 24h state power"}
        </H>
        <H as="p" className="mt-2 text-sm leading-relaxed text-clay-700">
          {remove
            ? `Drops ${window ? formatWindow(window) : "this window"} from ${zone.name}. Other periods stay.`
            : `Clears every EDL cut on ${zone.name}. Feeder reads as full state power.`}
        </H>
        <H className="mt-5 flex flex-wrap justify-end gap-2">
          <NeuButton onClick={onCancel}>Cancel</NeuButton>
          <NeuButton tone="ember" onClick={onConfirm}>
            {remove ? "Remove window" : "Clear windows"}
          </NeuButton>
        </H>
      </NeuSurface>
    </H>
  );
}

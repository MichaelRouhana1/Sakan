import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import type { AdminGovernorate, AdminNeighborhood, AssignMode } from "./types";

type Props = {
  mode: AssignMode | null;
  area: AdminNeighborhood | null;
  tree: AdminGovernorate[];
  districtId: string;
  mergeId: string;
  onDistrictId: (id: string) => void;
  onMergeId: (id: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function AssignDialog({
  mode,
  area,
  tree,
  districtId,
  mergeId,
  onDistrictId,
  onMergeId,
  onCancel,
  onConfirm,
}: Props) {
  if (!mode || !area) return null;

  const mergeOptions = tree.flatMap((gov) =>
    gov.districts.flatMap((district) =>
      district.neighborhoods
        .filter((row) => row.id !== area.id)
        .map((row) => ({
          id: row.id,
          label: `${row.name} · ${district.name}, ${gov.name}`,
        })),
    ),
  );

  const canSubmit = mode === "move" ? districtId.length > 0 : mergeId.length > 0;

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
          {mode === "move" ? "Move area" : "Merge area"}
        </H>
        <H as="p" className="mt-2 text-sm leading-relaxed text-clay-700">
          {mode === "move"
            ? `Re-parent ${area.name} under another district so Standard search stays one label per place.`
            : `Fold ${area.name} into another neighborhood. Listings on this demo row move with it; source area drops.`}
        </H>

        {mode === "move" ? (
          <H as="label" className="mt-4 block">
            <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
              New district
            </H>
            <H
              as="select"
              value={districtId}
              onChange={(event: { target: { value: string } }) =>
                onDistrictId(event.target.value)
              }
              className="w-full cursor-pointer rounded-neu-md border-0 bg-clay-100 px-3 py-2.5 text-sm text-clay-900 shadow-neu-in-sm outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
            >
              <H as="option" value="">
                Select a district
              </H>
              {tree.map((gov) => (
                <H as="optgroup" key={gov.id} label={gov.name}>
                  {gov.districts.map((district) => (
                    <H as="option" key={district.id} value={district.id}>
                      {district.name}
                    </H>
                  ))}
                </H>
              ))}
            </H>
          </H>
        ) : (
          <H as="label" className="mt-4 block">
            <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
              Merge into
            </H>
            <H
              as="select"
              value={mergeId}
              onChange={(event: { target: { value: string } }) =>
                onMergeId(event.target.value)
              }
              className="w-full cursor-pointer rounded-neu-md border-0 bg-clay-100 px-3 py-2.5 text-sm text-clay-900 shadow-neu-in-sm outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
            >
              <H as="option" value="">
                Select an area
              </H>
              {mergeOptions.map((row) => (
                <H as="option" key={row.id} value={row.id}>
                  {row.label}
                </H>
              ))}
            </H>
          </H>
        )}

        <H className="mt-5 flex flex-wrap justify-end gap-2">
          <NeuButton onClick={onCancel}>Cancel</NeuButton>
          <NeuButton
            tone={mode === "merge" ? "ochre" : "moss"}
            disabled={!canSubmit}
            onClick={onConfirm}
          >
            {mode === "move" ? "Move area" : "Merge areas"}
          </NeuButton>
        </H>
      </NeuSurface>
    </H>
  );
}

import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { ZoneSelect } from "./ZoneSelect";
import type { AdminGovernorate, AdminNeighborhood, AssignMode } from "./types";

type Props = {
  mode: AssignMode | null;
  area: AdminNeighborhood | null;
  tree: AdminGovernorate[];
  districtId: string;
  mergeId: string;
  busy?: boolean;
  officialMergeRisk?: boolean;
  officialMergeAck?: boolean;
  onOfficialMergeAck?: (acked: boolean) => void;
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
  busy,
  officialMergeRisk,
  officialMergeAck,
  onOfficialMergeAck,
  onDistrictId,
  onMergeId,
  onCancel,
  onConfirm,
}: Props) {
  if (!mode || !area) return null;

  const mergeOptions = tree.flatMap((gov) =>
    gov.districts.flatMap((district) =>
      district.neighborhoods
        .filter((row) => row.id !== area.id && row.active)
        .map((row) => ({
          id: row.id,
          label: `${row.name} · ${district.name}, ${gov.name}${
            row.origin === "official" ? " · official" : ""
          }`,
        })),
    ),
  );

  const canSubmit =
    !busy &&
    (mode === "move" ? districtId.length > 0 : mergeId.length > 0) &&
    !(mode === "merge" && officialMergeRisk && !officialMergeAck);

  return (
    <H className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <H
        as="button"
        type="button"
        aria-label="Dismiss"
        className="admin-scrim absolute inset-0 cursor-pointer border-0"
        onClick={onCancel}
      />
      <NeuSurface className="relative w-full max-w-md overflow-visible p-5 sm:p-6" as="section">
        <H as="h2" className="font-display text-lg font-semibold text-clay-900">
          {mode === "move" ? "Move area" : "Merge area"}
        </H>
        <H as="p" className="mt-1.5 text-sm leading-relaxed text-clay-700">
          {mode === "move"
            ? `Move ${area.name} under another district. Cities filter chips update this session.`
            : `Fold ${area.name} into another area. Source drops from Cities chips this session.`}
        </H>

        <H className="mt-5">
          {mode === "move" ? (
            <ZoneSelect
              label="New district"
              value={districtId}
              placeholder="Select a district"
              tree={tree}
              onChange={onDistrictId}
            />
          ) : (
            <ZoneSelect
              label="Merge into"
              value={mergeId}
              placeholder="Select an area"
              options={mergeOptions}
              onChange={onMergeId}
            />
          )}
        </H>

        {mode === "merge" && officialMergeRisk ? (
          <H as="label" className="mt-4 flex cursor-pointer items-start gap-2">
            <H
              as="input"
              type="checkbox"
              checked={Boolean(officialMergeAck)}
              onChange={(event: { target: { checked: boolean } }) =>
                onOfficialMergeAck?.(event.target.checked)
              }
              className="mt-1"
            />
            <H as="span" className="text-sm leading-relaxed text-clay-700">
              Official area involved — removes it from Cities chips this session.
              Poster create / seed allowlist unchanged.
            </H>
          </H>
        ) : null}

        <H className="mt-5 flex flex-wrap justify-end gap-2">
          <NeuButton disabled={busy} onClick={onCancel}>
            Cancel
          </NeuButton>
          <NeuButton
            tone={mode === "merge" ? "ochre" : "moss"}
            disabled={!canSubmit}
            onClick={onConfirm}
          >
            {busy
              ? "Saving…"
              : mode === "move"
                ? "Move area"
                : "Merge areas"}
          </NeuButton>
        </H>
      </NeuSurface>
    </H>
  );
}

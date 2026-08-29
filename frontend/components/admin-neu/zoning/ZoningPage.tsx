import { Plus } from "lucide-react-native";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { AreaFormDialog } from "./AreaFormDialog";
import { AssignDialog } from "./AssignDialog";
import { ZoneTree } from "./ZoneTree";
import { ZoningToolbar } from "./ZoningToolbar";
import { useAdminZoning } from "./useAdminZoning";

export function ZoningPage() {
  const state = useAdminZoning();

  return (
    <H className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <H className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <H>
          <H as="h1" className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Zoning
          </H>
          <H as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-clay-700">
            Demo catalog for Cities filter chips. Drag on desktop · use Move/Merge
            on touch. Official merge removes name from session chips.
          </H>
        </H>
        <H className="flex flex-wrap items-center gap-2">
          <H
            as="span"
            className="inline-flex rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
          >
            Demo catalog · session-synced to Cities filters · API-ready
          </H>
          <NeuButton
            tone="moss"
            disabled={state.busy || state.status !== "ready"}
            onClick={() => state.openCreate()}
          >
            <Plus size={16} strokeWidth={1.75} />
            Add custom area
          </NeuButton>
        </H>
      </H>

      {state.flash ? (
        <H
          as="p"
          role="status"
          aria-live="polite"
          className={[
            "rounded-neu-md bg-clay-100 px-4 py-2.5 text-sm shadow-neu-in-sm",
            state.flashTone === "ember" ? "text-ember" : "text-moss",
          ].join(" ")}
        >
          {state.flash}
        </H>
      ) : null}

      {state.status === "loading" ? (
        <NeuSurface inset className="px-6 py-16 text-center text-sm text-clay-700">
          Loading zoning…
        </NeuSurface>
      ) : null}

      {state.status === "error" ? (
        <NeuSurface inset className="px-6 py-16 text-center">
          <H as="p" className="font-display text-lg font-semibold text-clay-900">
            Could not load zoning
          </H>
          <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
            {state.errorMessage ?? "Unknown error"}
          </H>
          <H className="mt-4 flex justify-center">
            <NeuButton tone="moss" onClick={state.retry}>
              Retry
            </NeuButton>
          </H>
        </NeuSurface>
      ) : null}

      {state.status === "ready" ? (
        <>
          <H className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              label="Governorates"
              value={String(state.tree.length)}
              hint="Muhafazat"
            />
            <Kpi
              label="Districts"
              value={String(state.districtTotal)}
              hint="Caza / qada"
            />
            <Kpi
              label="Areas"
              value={String(state.allAreas.length)}
              hint={`${state.customCount} custom`}
            />
            <Kpi
              label="Mapped listings"
              value={String(state.listings)}
              hint="Demo listings by area name"
            />
          </H>

          <ZoningToolbar
            query={state.query}
            onQuery={state.setQuery}
            origin={state.origin}
            onOrigin={state.setOrigin}
            counts={state.counts}
            onExpandAll={state.expandAll}
            onCollapseAll={state.collapseAll}
          />

          <ZoneTree
            governorates={state.visible}
            expandedGovIds={state.openGovIds}
            expandedDistrictIds={state.openDistrictIds}
            matchIds={state.matchIds}
            draggingId={state.draggingId}
            dropTarget={state.dropTarget}
            onToggleGov={state.toggleGov}
            onToggleDistrict={state.toggleDistrict}
            onRenameGov={(gov) =>
              state.openRename("governorate", gov.id, gov.name, gov.slug)
            }
            onRenameDistrict={(district) =>
              state.openRename("district", district.id, district.name, district.slug)
            }
            onAddArea={state.openCreate}
            onRenameArea={(area) =>
              state.openRename("neighborhood", area.id, area.name, area.slug)
            }
            onMoveArea={(area) => state.openAssign(area, "move")}
            onMergeArea={(area) => state.openAssign(area, "merge")}
            onToggleActive={state.toggleCustomActive}
            onDragStart={state.setDraggingId}
            onDragOver={state.setDropTarget}
            onDropDistrict={state.handleDropDistrict}
            onDropArea={state.handleDropArea}
            onDragEnd={state.endDrag}
          />
        </>
      ) : null}

      <AreaFormDialog
        mode={state.formMode}
        renameTarget={state.renameTarget}
        tree={state.tree}
        draft={state.draft}
        slugLocked={state.slugLocked}
        lockDistrict={state.lockDistrict}
        busy={state.busy}
        onDraft={state.setDraft}
        onSlugLocked={state.setSlugLocked}
        onCancel={state.cancelForm}
        onConfirm={() => {
          void state.saveForm();
        }}
      />

      <AssignDialog
        mode={state.assignMode}
        area={state.assignArea}
        tree={state.tree}
        districtId={state.assignDistrictId}
        mergeId={state.assignMergeId}
        busy={state.busy}
        officialMergeRisk={state.officialMergeRisk}
        officialMergeAck={state.officialMergeAck}
        onOfficialMergeAck={state.setOfficialMergeAck}
        onDistrictId={state.setAssignDistrictId}
        onMergeId={state.setAssignMergeId}
        onCancel={state.cancelAssign}
        onConfirm={() => {
          void state.applyAssign();
        }}
      />
    </H>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <NeuSurface inset className="px-4 py-4">
      <H as="p" className="text-xs font-medium text-clay-700">
        {label}
      </H>
      <H as="p" className="mt-1 font-display text-2xl font-semibold tabular-nums text-clay-900">
        {value}
      </H>
      <H as="p" className="mt-1 text-[11px] text-clay-500">
        {hint}
      </H>
    </NeuSurface>
  );
}

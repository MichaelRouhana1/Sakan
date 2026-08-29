import { Link } from "expo-router";
import { Plus } from "lucide-react-native";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { CampusFormDialog } from "./CampusFormDialog";
import { InstitutionFormDialog } from "./InstitutionFormDialog";
import { InstitutionTree } from "./InstitutionTree";
import { InstitutionsToolbar } from "./InstitutionsToolbar";
import { RegistryActionDialog } from "./RegistryActionDialog";
import { useAdminInstitutions } from "./useAdminInstitutions";

export function InstitutionsPage() {
  const state = useAdminInstitutions();

  return (
    <H className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <H className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <H>
          <H as="h1" className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Institutions
          </H>
          <H as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-clay-700">
            Universities and campus pins for browse distance. Student email
            domains live under{" "}
            <Link
              href="/admin/trust?tab=domains"
              className="font-medium text-moss underline-offset-2 hover:underline"
            >
              Trust
            </Link>
            .
          </H>
        </H>
        <H className="flex flex-wrap items-center gap-2">
          <H
            as="span"
            className="inline-flex rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
          >
            Live catalog
          </H>
          <NeuButton
            disabled={state.busy || state.status !== "ready"}
            onClick={() => state.openCreateCampus()}
          >
            <Plus size={16} strokeWidth={1.75} />
            Add campus
          </NeuButton>
          <NeuButton
            tone="moss"
            disabled={state.busy || state.status !== "ready"}
            onClick={state.openCreateInstitution}
          >
            <Plus size={16} strokeWidth={1.75} />
            Add university
          </NeuButton>
        </H>
      </H>

      {state.flash ? (
        <H
          as="p"
          role="status"
          aria-live="polite"
          className="rounded-neu-md bg-clay-100 px-4 py-2.5 text-sm text-moss shadow-neu-in-sm"
        >
          {state.flash}
        </H>
      ) : null}

      {state.status === "loading" ? (
        <NeuSurface inset className="px-6 py-16 text-center text-sm text-clay-700">
          Loading institutions…
        </NeuSurface>
      ) : null}

      {state.status === "error" ? (
        <NeuSurface inset className="px-6 py-16 text-center">
          <H as="p" className="font-display text-lg font-semibold text-clay-900">
            Could not load institutions
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
              label="Universities"
              value={String(state.institutions.length)}
              hint="Active + inactive"
            />
            <Kpi
              label="Active universities"
              value={String(state.counts.active)}
              hint={`${state.counts.inactive} inactive`}
            />
            <Kpi
              label="Campuses"
              value={String(state.allCampuses.length)}
              hint="All pins"
            />
            <Kpi
              label="Active campuses"
              value={String(state.activeCampusCount)}
              hint="Visible in browse"
            />
          </H>

          <InstitutionsToolbar
            query={state.query}
            onQuery={state.setQuery}
            status={state.filterStatus}
            onStatus={state.setFilterStatus}
            counts={state.counts}
          />

          <InstitutionTree
            institutions={state.visible}
            expandedIds={state.openIds}
            onToggle={state.toggleExpanded}
            onEditInstitution={state.openEditInstitution}
            onInstitutionAction={(institution, kind) =>
              state.requestAction(
                "institution",
                institution.id,
                kind,
                institution.name,
              )
            }
            onAddCampus={state.openCreateCampus}
            onEditCampus={state.openEditCampus}
            onCampusAction={(campus, kind) =>
              state.requestAction("campus", campus.id, kind, campus.name)
            }
          />
        </>
      ) : null}

      <InstitutionFormDialog
        mode={state.institutionMode}
        draft={state.institutionDraft}
        slugLocked={state.institutionSlugLocked}
        busy={state.busy}
        onDraft={state.setInstitutionDraft}
        onSlugLocked={state.setInstitutionSlugLocked}
        onCancel={state.cancelInstitution}
        onConfirm={() => {
          void state.saveInstitution();
        }}
      />

      <CampusFormDialog
        mode={state.campusMode}
        institutions={state.institutions}
        draft={state.campusDraft}
        slugLocked={state.campusSlugLocked}
        lockInstitution={state.lockCampusInstitution}
        busy={state.busy}
        onDraft={state.setCampusDraft}
        onSlugLocked={state.setCampusSlugLocked}
        onCancel={state.cancelCampus}
        onConfirm={() => {
          void state.saveCampus();
        }}
      />

      <RegistryActionDialog
        kind={state.pending?.kind ?? null}
        target={state.pending?.target ?? "institution"}
        name={state.pending?.name ?? ""}
        note={state.note}
        busy={state.busy}
        onNote={state.setNote}
        onCancel={state.cancelPending}
        onConfirm={() => {
          void state.confirmPending();
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

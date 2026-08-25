import { ChevronDown, MapPin, Plus } from "lucide-react-native";
import { useBreakpoint } from "@/lib/breakpoints";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { CampusActions } from "./CampusActions";
import { InstitutionActions } from "./InstitutionActions";
import {
  AcronymPill,
  DomainChip,
  MainCampusPill,
  RegistryStatusPill,
} from "./InstitutionPills";
import {
  activeCampusCount,
  campusCount,
  formatCoord,
  type AdminCampus,
  type AdminInstitution,
  type RegistryActionKind,
} from "./types";

type Props = {
  institutions: AdminInstitution[];
  expandedIds: Set<string>;
  onToggle: (institutionId: string) => void;
  onEditInstitution: (institution: AdminInstitution) => void;
  onInstitutionAction: (
    institution: AdminInstitution,
    kind: RegistryActionKind,
  ) => void;
  onAddCampus: (institution: AdminInstitution) => void;
  onEditCampus: (campus: AdminCampus) => void;
  onCampusAction: (campus: AdminCampus, kind: RegistryActionKind) => void;
};

const CAMPUS_ROW =
  "grid grid-cols-[minmax(200px,1.6fr)_minmax(110px,0.8fr)_minmax(160px,1fr)_100px_minmax(168px,1fr)] items-center gap-3";

export function InstitutionTree({
  institutions,
  expandedIds,
  onToggle,
  onEditInstitution,
  onInstitutionAction,
  onAddCampus,
  onEditCampus,
  onCampusAction,
}: Props) {
  if (institutions.length === 0) {
    return (
      <NeuSurface inset className="px-6 py-16 text-center">
        <H as="p" className="font-display text-lg font-semibold text-clay-900">
          No institutions in this view
        </H>
        <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
          Try another name, campus, or domain — or add a university.
        </H>
      </NeuSurface>
    );
  }

  return (
    <H className="flex flex-col gap-3">
      {institutions.map((institution) => (
        <InstitutionNode
          key={institution.id}
          institution={institution}
          expanded={expandedIds.has(institution.id)}
          onToggle={() => onToggle(institution.id)}
          onEdit={() => onEditInstitution(institution)}
          onAction={(kind) => onInstitutionAction(institution, kind)}
          onAddCampus={() => onAddCampus(institution)}
          onEditCampus={onEditCampus}
          onCampusAction={onCampusAction}
        />
      ))}
    </H>
  );
}

function InstitutionNode({
  institution,
  expanded,
  onToggle,
  onEdit,
  onAction,
  onAddCampus,
  onEditCampus,
  onCampusAction,
}: {
  institution: AdminInstitution;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onAction: (kind: RegistryActionKind) => void;
  onAddCampus: () => void;
  onEditCampus: (campus: AdminCampus) => void;
  onCampusAction: (campus: AdminCampus, kind: RegistryActionKind) => void;
}) {
  const bp = useBreakpoint();
  const compact = bp === "mobile";
  const panelId = `campuses-${institution.id}`;
  const total = campusCount(institution);
  const active = activeCampusCount(institution);

  return (
    <NeuSurface as="section" className="overflow-hidden">
      <H className="flex items-start gap-2 px-4 py-4 sm:items-center sm:px-5">
        <H
          as="h2"
          className="min-w-0 flex-1 text-base font-normal"
        >
          <H
            as="button"
            type="button"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={onToggle}
            className="flex w-full cursor-pointer items-start gap-3 border-0 bg-transparent p-0 text-left shadow-none sm:items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
          >
            <H
              as="span"
              className={[
                "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-clay-100 text-clay-700 shadow-neu-sm transition-transform duration-panel sm:mt-0",
                expanded ? "rotate-180" : "",
              ].join(" ")}
              aria-hidden
            >
              <ChevronDown size={16} strokeWidth={1.75} />
            </H>

            <H
              as="span"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-clay-100 font-display text-sm font-semibold text-moss shadow-neu-in-sm"
              aria-hidden
            >
              {institution.shortName.slice(0, 3)}
            </H>

            <H className="min-w-0 flex-1">
              <H className="flex flex-wrap items-center gap-2">
                <H as="span" className="font-display text-base font-semibold text-clay-900">
                  {institution.name}
                </H>
                <AcronymPill value={institution.shortName} />
                <RegistryStatusPill
                  status={institution.active ? "active" : "inactive"}
                />
              </H>
              <H as="span" className="mt-1 block text-sm font-normal text-clay-700">
                {total} {total === 1 ? "campus" : "campuses"}
                {total > 0 ? ` · ${active} active` : ""}
                {institution.emailDomains.length > 0
                  ? ` · ${institution.emailDomains.length} ${institution.emailDomains.length === 1 ? "domain" : "domains"}`
                  : ""}
              </H>
            </H>
          </H>
        </H>

        {compact ? null : (
          <InstitutionActions
            institution={institution}
            compact
            onEdit={onEdit}
            onAction={onAction}
          />
        )}
      </H>

      {compact ? (
        <H className="px-4 pb-3">
          <InstitutionActions
            institution={institution}
            onEdit={onEdit}
            onAction={onAction}
          />
        </H>
      ) : null}

      {expanded ? (
        <H id={panelId} className="px-4 pb-4 sm:px-5">
          <H className="ml-0 border-l-2 border-clay-200/80 pl-3 sm:ml-4 sm:pl-4">
            {institution.emailDomains.length > 0 ? (
              <H className="mb-3 flex flex-wrap gap-1.5">
                {institution.emailDomains.map((domain) => (
                  <DomainChip key={domain} domain={domain} />
                ))}
              </H>
            ) : (
              <H as="p" className="mb-3 text-xs text-clay-500">
                No academic email domain mapped yet.
              </H>
            )}

            {institution.campuses.length === 0 ? (
              <NeuSurface inset className="px-4 py-8 text-center">
                <H as="p" className="text-sm font-medium text-clay-900">
                  No campuses yet
                </H>
                <H as="p" className="mt-1 text-xs text-clay-700">
                  Add a pin so renters can sort by walking distance.
                </H>
              </NeuSurface>
            ) : compact ? (
              <H className="grid gap-2">
                {institution.campuses.map((campus) => (
                  <CampusCard
                    key={campus.id}
                    campus={campus}
                    onEdit={() => onEditCampus(campus)}
                    onAction={(kind) => onCampusAction(campus, kind)}
                  />
                ))}
              </H>
            ) : (
              <NeuSurface inset className="overflow-hidden">
                <H className="overflow-x-auto">
                  <H className="min-w-[720px]">
                    <H
                      className={[
                        CAMPUS_ROW,
                        "px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-clay-700",
                      ].join(" ")}
                    >
                      <H as="span">Campus</H>
                      <H as="span">City</H>
                      <H as="span">Coordinates</H>
                      <H as="span">Status</H>
                      <H as="span" className="text-right">
                        Actions
                      </H>
                    </H>
                    {institution.campuses.map((campus) => (
                      <H
                        key={campus.id}
                        className={[
                          CAMPUS_ROW,
                          "border-t border-clay-200/80 px-4 py-3",
                        ].join(" ")}
                      >
                        <H className="min-w-0">
                          <H className="flex flex-wrap items-center gap-2">
                            <H as="span" className="text-sm font-medium text-clay-900">
                              {campus.name}
                            </H>
                            {campus.isMain ? <MainCampusPill /> : null}
                          </H>
                          <H as="span" className="mt-0.5 block text-xs text-clay-500">
                            {campus.slug}
                          </H>
                        </H>
                        <H as="span" className="text-sm text-clay-700">
                          {campus.city}
                        </H>
                        <H as="span" className="font-mono text-xs tabular-nums text-clay-700">
                          {formatCoord(campus.lat, campus.lng)}
                        </H>
                        <RegistryStatusPill
                          status={campus.active ? "active" : "inactive"}
                        />
                        <CampusActions
                          campus={campus}
                          compact
                          onEdit={() => onEditCampus(campus)}
                          onAction={(kind) => onCampusAction(campus, kind)}
                        />
                      </H>
                    ))}
                  </H>
                </H>
              </NeuSurface>
            )}

            <H className="mt-3">
              <NeuButton tone="moss" onClick={onAddCampus}>
                <Plus size={16} strokeWidth={1.75} />
                Add campus
              </NeuButton>
            </H>
          </H>
        </H>
      ) : null}
    </NeuSurface>
  );
}

function CampusCard({
  campus,
  onEdit,
  onAction,
}: {
  campus: AdminCampus;
  onEdit: () => void;
  onAction: (kind: RegistryActionKind) => void;
}) {
  return (
    <NeuSurface inset className="px-4 py-3">
      <H className="flex items-start gap-2">
        <H className="mt-0.5 text-clay-500" aria-hidden>
          <MapPin size={16} strokeWidth={1.75} />
        </H>
        <H className="min-w-0 flex-1">
          <H className="flex flex-wrap items-center gap-2">
            <H as="p" className="text-sm font-medium text-clay-900">
              {campus.name}
            </H>
            {campus.isMain ? <MainCampusPill /> : null}
            <RegistryStatusPill status={campus.active ? "active" : "inactive"} />
          </H>
          <H as="p" className="mt-1 text-xs text-clay-700">
            {campus.city}
          </H>
          <H as="p" className="mt-0.5 font-mono text-[11px] tabular-nums text-clay-500">
            {formatCoord(campus.lat, campus.lng)}
          </H>
        </H>
      </H>
      <H className="mt-3">
        <CampusActions campus={campus} onEdit={onEdit} onAction={onAction} />
      </H>
    </NeuSurface>
  );
}

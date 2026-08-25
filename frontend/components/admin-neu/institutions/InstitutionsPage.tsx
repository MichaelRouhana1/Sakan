import { Plus } from "lucide-react-native";
import { useDeferredValue, useMemo, useState } from "react";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { CampusFormDialog } from "./CampusFormDialog";
import { InstitutionFormDialog } from "./InstitutionFormDialog";
import { InstitutionTree } from "./InstitutionTree";
import { InstitutionsToolbar } from "./InstitutionsToolbar";
import { RegistryActionDialog } from "./RegistryActionDialog";
import { MOCK_INSTITUTIONS } from "./mockInstitutions";
import {
  haystack,
  parseDomain,
  type AdminCampus,
  type AdminInstitution,
  type CampusDraft,
  type InstitutionDraft,
  type RegistryActionKind,
  type RegistryStatusFilter,
  type RegistryTarget,
} from "./types";

const EMPTY_INSTITUTION: InstitutionDraft = {
  name: "",
  shortName: "",
  slug: "",
  website: "",
  emailDomains: [],
  active: true,
};

const EMPTY_CAMPUS: CampusDraft = {
  institutionId: "",
  name: "",
  slug: "",
  city: "",
  lat: "",
  lng: "",
  isMain: false,
  active: true,
};

export function InstitutionsPage() {
  const [institutions, setInstitutions] = useState(MOCK_INSTITUTIONS);
  const [status, setStatus] = useState<RegistryStatusFilter>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set([MOCK_INSTITUTIONS[0]?.id ?? ""]),
  );

  const [institutionMode, setInstitutionMode] = useState<"create" | "edit" | null>(
    null,
  );
  const [editingInstitutionId, setEditingInstitutionId] = useState<string | null>(
    null,
  );
  const [institutionDraft, setInstitutionDraft] = useState(EMPTY_INSTITUTION);
  const [institutionSlugLocked, setInstitutionSlugLocked] = useState(false);
  const [domainInput, setDomainInput] = useState("");

  const [campusMode, setCampusMode] = useState<"create" | "edit" | null>(null);
  const [editingCampusId, setEditingCampusId] = useState<string | null>(null);
  const [campusDraft, setCampusDraft] = useState(EMPTY_CAMPUS);
  const [campusSlugLocked, setCampusSlugLocked] = useState(false);
  const [lockCampusInstitution, setLockCampusInstitution] = useState(false);

  const [pending, setPending] = useState<{
    target: RegistryTarget;
    id: string;
    kind: RegistryActionKind;
    name: string;
  } | null>(null);
  const [note, setNote] = useState("");

  const allCampuses = institutions.flatMap((row) => row.campuses);
  const activeCampuses = allCampuses.filter((campus) => campus.active).length;
  const domainCount = institutions.reduce(
    (sum, row) => sum + row.emailDomains.length,
    0,
  );

  const counts = {
    all: institutions.length,
    active: institutions.filter((row) => row.active).length,
    inactive: institutions.filter((row) => !row.active).length,
  };

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    return institutions.filter((row) => {
      if (status !== "all" && (status === "active") !== row.active) return false;
      if (!needle) return true;
      return haystack(row).includes(needle);
    });
  }, [institutions, status, deferredQuery]);

  const openIds = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    if (!needle) return expandedIds;
    const next = new Set(expandedIds);
    for (const row of visible) {
      const campusHit = row.campuses.some((campus) =>
        `${campus.name} ${campus.city} ${campus.slug}`.toLowerCase().includes(needle),
      );
      if (campusHit) next.add(row.id);
    }
    return next;
  }, [deferredQuery, expandedIds, visible]);

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreateInstitution() {
    setInstitutionMode("create");
    setEditingInstitutionId(null);
    setInstitutionDraft(EMPTY_INSTITUTION);
    setInstitutionSlugLocked(false);
    setDomainInput("");
  }

  function openEditInstitution(institution: AdminInstitution) {
    setInstitutionMode("edit");
    setEditingInstitutionId(institution.id);
    setInstitutionDraft({
      name: institution.name,
      shortName: institution.shortName,
      slug: institution.slug,
      website: institution.website,
      emailDomains: [...institution.emailDomains],
      active: institution.active,
    });
    setInstitutionSlugLocked(true);
    setDomainInput("");
  }

  function saveInstitution() {
    const draft = institutionDraft;
    const extra = parseDomain(domainInput);
    const domains = extra && !draft.emailDomains.includes(extra)
      ? [...draft.emailDomains, extra]
      : draft.emailDomains;

    if (institutionMode === "create") {
      const id = `inst-${Date.now()}`;
      const next: AdminInstitution = {
        id,
        name: draft.name.trim(),
        shortName: draft.shortName.trim(),
        slug: draft.slug.trim(),
        website: draft.website.trim(),
        emailDomains: domains,
        active: draft.active,
        campuses: [],
      };
      setInstitutions((current) =>
        [...current, next].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setExpandedIds((current) => new Set(current).add(id));
    } else if (editingInstitutionId) {
      setInstitutions((current) =>
        current.map((row) =>
          row.id === editingInstitutionId
            ? {
                ...row,
                name: draft.name.trim(),
                shortName: draft.shortName.trim(),
                slug: draft.slug.trim(),
                website: draft.website.trim(),
                emailDomains: domains,
                active: draft.active,
              }
            : row,
        ),
      );
    }
    setInstitutionMode(null);
    setDomainInput("");
  }

  function openCreateCampus(institution?: AdminInstitution) {
    setCampusMode("create");
    setEditingCampusId(null);
    setCampusDraft({
      ...EMPTY_CAMPUS,
      institutionId: institution?.id ?? "",
      isMain: institution ? institution.campuses.length === 0 : false,
    });
    setCampusSlugLocked(false);
    setLockCampusInstitution(Boolean(institution));
    if (institution) {
      setExpandedIds((current) => new Set(current).add(institution.id));
    }
  }

  function openEditCampus(campus: AdminCampus) {
    setCampusMode("edit");
    setEditingCampusId(campus.id);
    setCampusDraft({
      institutionId: campus.institutionId,
      name: campus.name,
      slug: campus.slug,
      city: campus.city,
      lat: String(campus.lat),
      lng: String(campus.lng),
      isMain: campus.isMain,
      active: campus.active,
    });
    setCampusSlugLocked(true);
    setLockCampusInstitution(true);
  }

  function saveCampus() {
    const draft = campusDraft;
    const lat = Number(draft.lat);
    const lng = Number(draft.lng);
    if (campusMode === "create") {
      const id = `camp-${Date.now()}`;
      const next: AdminCampus = {
        id,
        institutionId: draft.institutionId,
        name: draft.name.trim(),
        slug: draft.slug.trim(),
        city: draft.city.trim(),
        lat,
        lng,
        isMain: draft.isMain,
        active: draft.active,
      };
      setInstitutions((current) =>
        current.map((row) => {
          if (row.id !== draft.institutionId) return row;
          const campuses = draft.isMain
            ? row.campuses.map((campus) => ({ ...campus, isMain: false }))
            : row.campuses;
          return { ...row, campuses: [...campuses, next] };
        }),
      );
      setExpandedIds((current) => new Set(current).add(draft.institutionId));
    } else if (editingCampusId) {
      setInstitutions((current) =>
        current.map((row) => {
          if (!row.campuses.some((campus) => campus.id === editingCampusId)) {
            return row;
          }
          return {
            ...row,
            campuses: row.campuses.map((campus) => {
              if (campus.id !== editingCampusId) {
                return draft.isMain ? { ...campus, isMain: false } : campus;
              }
              return {
                ...campus,
                name: draft.name.trim(),
                slug: draft.slug.trim(),
                city: draft.city.trim(),
                lat,
                lng,
                isMain: draft.isMain,
                active: draft.active,
              };
            }),
          };
        }),
      );
    }
    setCampusMode(null);
  }

  function applyPending() {
    if (!pending) return;
    const { target, id, kind } = pending;
    setInstitutions((current) => {
      if (target === "institution") {
        if (kind === "remove") return current.filter((row) => row.id !== id);
        return current.map((row) =>
          row.id === id ? { ...row, active: kind === "activate" } : row,
        );
      }
      return current.map((row) => ({
        ...row,
        campuses:
          kind === "remove"
            ? row.campuses.filter((campus) => campus.id !== id)
            : row.campuses.map((campus) =>
                campus.id === id
                  ? { ...campus, active: kind === "activate" }
                  : campus,
              ),
      }));
    });
    setPending(null);
    setNote("");
  }

  return (
    <H className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <H className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <H>
          <H as="h1" className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Institution Registry
          </H>
          <H as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-clay-700">
            Universities and the campus pins behind browse distance. Expand a
            row to edit grounds, coordinates, or email domains.
          </H>
        </H>
        <H className="flex flex-wrap items-center gap-2">
          <H
            as="span"
            className="inline-flex rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
          >
            Demo data
          </H>
          <NeuButton onClick={() => openCreateCampus()}>
            <Plus size={16} strokeWidth={1.75} />
            Add campus
          </NeuButton>
          <NeuButton tone="moss" onClick={openCreateInstitution}>
            <Plus size={16} strokeWidth={1.75} />
            Add university
          </NeuButton>
        </H>
      </H>

      <H className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="Institutions" value={String(institutions.length)} hint="Active + paused" />
        <Kpi
          label="Active campuses"
          value={String(activeCampuses)}
          hint={`${allCampuses.length} total pins`}
        />
        <Kpi
          label="Email domains"
          value={String(domainCount)}
          hint="Student verification maps"
        />
      </H>

      <InstitutionsToolbar
        query={query}
        onQuery={setQuery}
        status={status}
        onStatus={setStatus}
        counts={counts}
      />

      <InstitutionTree
        institutions={visible}
        expandedIds={openIds}
        onToggle={toggleExpanded}
        onEditInstitution={openEditInstitution}
        onInstitutionAction={(institution, kind) => {
          setPending({
            target: "institution",
            id: institution.id,
            kind,
            name: institution.name,
          });
          setNote("");
        }}
        onAddCampus={openCreateCampus}
        onEditCampus={openEditCampus}
        onCampusAction={(campus, kind) => {
          setPending({
            target: "campus",
            id: campus.id,
            kind,
            name: campus.name,
          });
          setNote("");
        }}
      />

      <InstitutionFormDialog
        mode={institutionMode}
        draft={institutionDraft}
        slugLocked={institutionSlugLocked}
        domainInput={domainInput}
        onDraft={setInstitutionDraft}
        onSlugLocked={setInstitutionSlugLocked}
        onDomainInput={setDomainInput}
        onCancel={() => setInstitutionMode(null)}
        onConfirm={saveInstitution}
      />

      <CampusFormDialog
        mode={campusMode}
        institutions={institutions}
        draft={campusDraft}
        slugLocked={campusSlugLocked}
        lockInstitution={lockCampusInstitution}
        onDraft={setCampusDraft}
        onSlugLocked={setCampusSlugLocked}
        onCancel={() => setCampusMode(null)}
        onConfirm={saveCampus}
      />

      <RegistryActionDialog
        kind={pending?.kind ?? null}
        target={pending?.target ?? "institution"}
        name={pending?.name ?? ""}
        note={note}
        onNote={setNote}
        onCancel={() => setPending(null)}
        onConfirm={applyPending}
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

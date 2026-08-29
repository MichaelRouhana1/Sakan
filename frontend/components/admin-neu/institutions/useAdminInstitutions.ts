import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  createAdminCampus,
  createAdminInstitution,
  listAdminInstitutions,
  setAdminRegistryActive,
  updateAdminCampus,
  updateAdminInstitution,
} from "./institutionsSource";
import {
  haystack,
  type AdminCampus,
  type AdminInstitution,
  type CampusDraft,
  type InstitutionDraft,
  type RegistryActionKind,
  type RegistryStatusFilter,
  type RegistryTarget,
} from "./types";

export type LoadStatus = "loading" | "ready" | "error";

export const EMPTY_INSTITUTION: InstitutionDraft = {
  name: "",
  shortName: "",
  slug: "",
  website: "",
  logoUrl: "",
  active: true,
};

export const EMPTY_CAMPUS: CampusDraft = {
  institutionId: "",
  name: "",
  slug: "",
  city: "",
  lat: "33.89700",
  lng: "35.48200",
  isMain: false,
  active: true,
};

type PendingAction = {
  target: RegistryTarget;
  id: string;
  kind: RegistryActionKind;
  name: string;
};

export function useAdminInstitutions() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [institutions, setInstitutions] = useState<AdminInstitution[]>([]);
  const [filterStatus, setFilterStatus] = useState<RegistryStatusFilter>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [institutionMode, setInstitutionMode] = useState<"create" | "edit" | null>(
    null,
  );
  const [editingInstitutionId, setEditingInstitutionId] = useState<string | null>(
    null,
  );
  const [institutionDraft, setInstitutionDraft] =
    useState<InstitutionDraft>(EMPTY_INSTITUTION);
  const [institutionSlugLocked, setInstitutionSlugLocked] = useState(false);

  const [campusMode, setCampusMode] = useState<"create" | "edit" | null>(null);
  const [editingCampusId, setEditingCampusId] = useState<string | null>(null);
  const [campusDraft, setCampusDraft] = useState<CampusDraft>(EMPTY_CAMPUS);
  const [campusSlugLocked, setCampusSlugLocked] = useState(false);
  const [lockCampusInstitution, setLockCampusInstitution] = useState(false);

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setErrorMessage(null);
    setStatus((prev) => (prev === "ready" ? "ready" : "loading"));
    try {
      const rows = await listAdminInstitutions();
      setInstitutions(rows);
      setExpandedIds((current) => {
        if (current.size > 0) return current;
        const first = rows[0]?.id ?? "";
        return first ? new Set([first]) : new Set();
      });
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load institutions",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, reloadToken]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 4000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const allCampuses = useMemo(
    () => institutions.flatMap((row) => row.campuses),
    [institutions],
  );

  const counts = useMemo(
    () => ({
      all: institutions.length,
      active: institutions.filter((row) => row.active).length,
      inactive: institutions.filter((row) => !row.active).length,
    }),
    [institutions],
  );

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    return institutions.filter((row) => {
      if (filterStatus !== "all" && (filterStatus === "active") !== row.active) {
        return false;
      }
      if (!needle) return true;
      return haystack(row).includes(needle);
    });
  }, [institutions, filterStatus, deferredQuery]);

  const openIds = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    if (!needle) return expandedIds;
    const next = new Set(expandedIds);
    for (const row of visible) {
      const campusHit = row.campuses.some((campus) =>
        `${campus.name} ${campus.city} ${campus.slug}`
          .toLowerCase()
          .includes(needle),
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
  }

  function openEditInstitution(institution: AdminInstitution) {
    setInstitutionMode("edit");
    setEditingInstitutionId(institution.id);
    setInstitutionDraft({
      name: institution.name,
      shortName: institution.shortName,
      slug: institution.slug,
      website: institution.website,
      logoUrl: institution.logoUrl ?? "",
      active: institution.active,
    });
    setInstitutionSlugLocked(true);
  }

  async function saveInstitution() {
    if (busy) return;
    setBusy(true);
    try {
      if (institutionMode === "create") {
        const created = await createAdminInstitution(institutionDraft);
        const rows = await listAdminInstitutions();
        setInstitutions(rows);
        setExpandedIds((current) => new Set(current).add(created.id));
        setFlash("University added");
      } else if (editingInstitutionId) {
        await updateAdminInstitution(editingInstitutionId, institutionDraft);
        setInstitutions(await listAdminInstitutions());
        setFlash("University saved");
      }
      setInstitutionMode(null);
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
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

  async function saveCampus() {
    if (busy) return;
    setBusy(true);
    try {
      if (campusMode === "create") {
        const created = await createAdminCampus(campusDraft);
        setInstitutions(await listAdminInstitutions());
        setExpandedIds((current) =>
          new Set(current).add(created.institutionId),
        );
        setFlash("Campus added");
      } else if (editingCampusId) {
        await updateAdminCampus(editingCampusId, campusDraft);
        setInstitutions(await listAdminInstitutions());
        setFlash("Campus saved");
      }
      setCampusMode(null);
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function requestAction(
    target: RegistryTarget,
    id: string,
    kind: RegistryActionKind,
    name: string,
  ) {
    setPending({ target, id, kind, name });
    setNote("");
  }

  async function confirmPending() {
    if (!pending || busy) return;
    setBusy(true);
    try {
      await setAdminRegistryActive(
        pending.target,
        pending.id,
        pending.kind,
        note,
      );
      setInstitutions(await listAdminInstitutions());
      setFlash(pending.kind === "activate" ? "Activated" : "Deactivated");
      setPending(null);
      setNote("");
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return {
    status,
    errorMessage,
    retry: () => setReloadToken((n) => n + 1),
    flash,
    busy,
    institutions,
    visible,
    counts,
    allCampuses,
    activeCampusCount: allCampuses.filter((c) => c.active).length,
    filterStatus,
    setFilterStatus,
    query,
    setQuery,
    openIds,
    toggleExpanded,
    institutionMode,
    institutionDraft,
    institutionSlugLocked,
    setInstitutionDraft,
    setInstitutionSlugLocked,
    openCreateInstitution,
    openEditInstitution,
    saveInstitution,
    cancelInstitution: () => setInstitutionMode(null),
    campusMode,
    campusDraft,
    campusSlugLocked,
    lockCampusInstitution,
    setCampusDraft,
    setCampusSlugLocked,
    openCreateCampus,
    openEditCampus,
    saveCampus,
    cancelCampus: () => setCampusMode(null),
    pending,
    note,
    setNote,
    requestAction,
    confirmPending,
    cancelPending: () => {
      setPending(null);
      setNote("");
    },
  };
}

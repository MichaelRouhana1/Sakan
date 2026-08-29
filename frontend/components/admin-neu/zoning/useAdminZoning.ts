import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  activateAdminArea,
  createAdminCustomArea,
  deactivateAdminArea,
  listAdminZones,
  mergeAdminAreas,
  moveAdminArea,
  renameAdminZone,
} from "./zoningSource";
import {
  findNeighborhood,
  flattenNeighborhoods,
  listingCount,
  type AdminDistrict,
  type AdminGovernorate,
  type AdminNeighborhood,
  type AreaDraft,
  type AssignMode,
  type OriginFilter,
  type RenameTarget,
} from "./types";

export type LoadStatus = "loading" | "ready" | "error";
export type FlashTone = "moss" | "ember";

export const EMPTY_DRAFT: AreaDraft = { name: "", slug: "", districtId: "" };

const DEFAULT_GOV = new Set(["gov-beirut", "gov-mount-lebanon"]);
const DEFAULT_DIST = new Set(["dist-beirut", "dist-matn"]);

export function useAdminZoning() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tree, setTree] = useState<AdminGovernorate[]>([]);
  const [origin, setOrigin] = useState<OriginFilter>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [expandedGovIds, setExpandedGovIds] = useState<Set<string>>(
    () => new Set(DEFAULT_GOV),
  );
  const [expandedDistrictIds, setExpandedDistrictIds] = useState<Set<string>>(
    () => new Set(DEFAULT_DIST),
  );
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [flashTone, setFlashTone] = useState<FlashTone>("moss");
  const [reloadToken, setReloadToken] = useState(0);

  const [formMode, setFormMode] = useState<"create" | "rename" | null>(null);
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [slugLocked, setSlugLocked] = useState(false);
  const [lockDistrict, setLockDistrict] = useState(false);

  const [assignMode, setAssignMode] = useState<AssignMode | null>(null);
  const [assignAreaId, setAssignAreaId] = useState<string | null>(null);
  const [assignDistrictId, setAssignDistrictId] = useState("");
  const [assignMergeId, setAssignMergeId] = useState("");
  const [officialMergeAck, setOfficialMergeAck] = useState(false);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    kind: "district" | "neighborhood";
    id: string;
  } | null>(null);

  function showFlash(message: string, tone: FlashTone = "moss") {
    setFlashTone(tone);
    setFlash(message);
  }

  const load = useCallback(async () => {
    setErrorMessage(null);
    setStatus((prev) => (prev === "ready" ? "ready" : "loading"));
    try {
      setTree(await listAdminZones());
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load zoning",
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

  const allAreas = useMemo(() => flattenNeighborhoods(tree), [tree]);
  const activeAreas = allAreas.filter((row) => row.active);
  const customCount = activeAreas.filter((row) => row.origin === "custom").length;
  const officialCount = activeAreas.filter((row) => row.origin === "official").length;
  const listings = tree.reduce((sum, gov) => sum + listingCount(gov), 0);
  const districtTotal = tree.reduce((sum, gov) => sum + gov.districts.length, 0);

  const counts: Record<OriginFilter, number> = {
    all: activeAreas.length,
    official: officialCount,
    custom: customCount,
  };

  const { visible, matchIds } = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const hits = new Set<string>();

    function originOk(area: AdminNeighborhood) {
      if (origin === "all") return true;
      return area.origin === origin;
    }

    const next = tree
      .map((gov) => {
        const govHit =
          !needle ||
          `${gov.name} ${gov.arabicName} ${gov.slug}`.toLowerCase().includes(needle);
        if (needle && govHit) hits.add(gov.id);

        const districts = gov.districts
          .map((district) => {
            const originAreas = district.neighborhoods.filter(originOk);
            const distHit =
              !needle ||
              `${district.name} ${district.slug}`.toLowerCase().includes(needle);
            const namedAreas = originAreas.filter((area) =>
              `${area.name} ${area.slug}`.toLowerCase().includes(needle),
            );

            if (!needle) {
              if (origin !== "all" && originAreas.length === 0) return null;
              return { ...district, neighborhoods: originAreas };
            }

            if (govHit || distHit) {
              if (distHit) hits.add(district.id);
              for (const area of namedAreas) hits.add(area.id);
              return { ...district, neighborhoods: originAreas };
            }
            if (namedAreas.length === 0) return null;
            hits.add(gov.id);
            hits.add(district.id);
            for (const area of namedAreas) hits.add(area.id);
            return { ...district, neighborhoods: namedAreas };
          })
          .filter((row): row is AdminDistrict => row !== null);

        if (districts.length === 0) return null;
        return { ...gov, districts };
      })
      .filter((row): row is AdminGovernorate => row !== null);

    return { visible: next, matchIds: hits };
  }, [tree, origin, deferredQuery]);

  const openGovIds = useMemo(() => {
    const needle = deferredQuery.trim();
    if (!needle && origin === "all") return expandedGovIds;
    const next = new Set(expandedGovIds);
    for (const gov of visible) next.add(gov.id);
    return next;
  }, [deferredQuery, origin, expandedGovIds, visible]);

  const openDistrictIds = useMemo(() => {
    const needle = deferredQuery.trim();
    if (!needle && origin === "all") return expandedDistrictIds;
    const next = new Set(expandedDistrictIds);
    for (const gov of visible) {
      for (const district of gov.districts) {
        if (
          matchIds.has(district.id) ||
          district.neighborhoods.length > 0 ||
          district.neighborhoods.some((area) => matchIds.has(area.id))
        ) {
          next.add(district.id);
        }
      }
    }
    return next;
  }, [deferredQuery, origin, expandedDistrictIds, visible, matchIds]);

  function toggleGov(id: string) {
    setExpandedGovIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleDistrict(id: string) {
    setExpandedDistrictIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpandedGovIds(new Set(tree.map((gov) => gov.id)));
    setExpandedDistrictIds(
      new Set(tree.flatMap((gov) => gov.districts.map((district) => district.id))),
    );
  }

  function collapseAll() {
    setExpandedGovIds(new Set());
    setExpandedDistrictIds(new Set());
  }

  function openCreate(district?: AdminDistrict) {
    setFormMode("create");
    setRenameTarget(null);
    setDraft({
      ...EMPTY_DRAFT,
      districtId: district?.id ?? "",
    });
    setSlugLocked(false);
    setLockDistrict(Boolean(district));
    if (district) {
      setExpandedGovIds((current) => new Set(current).add(district.governorateId));
      setExpandedDistrictIds((current) => new Set(current).add(district.id));
    }
  }

  function openRename(
    kind: RenameTarget["kind"],
    id: string,
    name: string,
    slug: string,
  ) {
    setFormMode("rename");
    setRenameTarget({ kind, id, name });
    setDraft({ name, slug, districtId: "" });
    setSlugLocked(true);
    setLockDistrict(false);
  }

  async function saveForm() {
    if (busy) return;
    setBusy(true);
    try {
      if (formMode === "create") {
        const created = await createAdminCustomArea(draft);
        setTree(await listAdminZones());
        setExpandedDistrictIds((current) =>
          new Set(current).add(created.districtId),
        );
        showFlash(`Added ${created.name} · Cities chips updated`);
      } else if (renameTarget) {
        await renameAdminZone(renameTarget, draft.name, draft.slug);
        setTree(await listAdminZones());
        showFlash(`Renamed to ${draft.name.trim()} · Cities chips updated`);
      }
      setFormMode(null);
      setRenameTarget(null);
    } catch (err) {
      showFlash(err instanceof Error ? err.message : "Save failed", "ember");
    } finally {
      setBusy(false);
    }
  }

  async function reparent(areaId: string, districtId: string): Promise<boolean> {
    if (busy) return false;
    const found = findNeighborhood(tree, areaId);
    if (!found) {
      showFlash("Area not found", "ember");
      return false;
    }
    const dest = tree
      .flatMap((gov) => gov.districts.map((district) => ({ gov, district })))
      .find((row) => row.district.id === districtId);
    if (!dest) {
      showFlash("District not found", "ember");
      return false;
    }
    setBusy(true);
    try {
      await moveAdminArea(areaId, districtId);
      setTree(await listAdminZones());
      setExpandedGovIds((current) => new Set(current).add(dest.gov.id));
      setExpandedDistrictIds((current) => new Set(current).add(districtId));
      showFlash(`Moved ${found.area.name} → ${dest.district.name}`);
      return true;
    } catch (err) {
      showFlash(err instanceof Error ? err.message : "Move failed", "ember");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function mergeAreas(sourceId: string, targetId: string): Promise<boolean> {
    if (busy) return false;
    const source = findNeighborhood(tree, sourceId);
    const target = findNeighborhood(tree, targetId);
    if (!source || !target || sourceId === targetId) {
      showFlash("Pick a different merge target", "ember");
      return false;
    }
    setBusy(true);
    try {
      await mergeAdminAreas(sourceId, targetId);
      setTree(await listAdminZones());
      showFlash(
        `Merged ${source.area.name} into ${target.area.name} · Cities chips updated`,
      );
      return true;
    } catch (err) {
      showFlash(err instanceof Error ? err.message : "Merge failed", "ember");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function openAssign(area: AdminNeighborhood, mode: AssignMode) {
    setAssignAreaId(area.id);
    setAssignMode(mode);
    setAssignDistrictId(mode === "move" ? area.districtId : "");
    setAssignMergeId("");
    setOfficialMergeAck(false);
  }

  const assignArea = assignAreaId
    ? findNeighborhood(tree, assignAreaId)?.area ?? null
    : null;

  const assignMergeTarget = assignMergeId
    ? findNeighborhood(tree, assignMergeId)?.area ?? null
    : null;

  const officialMergeRisk =
    assignMode === "merge" &&
    Boolean(
      (assignArea && assignArea.origin === "official") ||
        (assignMergeTarget && assignMergeTarget.origin === "official"),
    );

  async function applyAssign() {
    if (!assignAreaId || !assignMode || busy) return;
    if (assignMode === "merge" && officialMergeRisk && !officialMergeAck) {
      showFlash("Confirm official merge first", "ember");
      return;
    }
    const ok =
      assignMode === "move"
        ? await reparent(assignAreaId, assignDistrictId)
        : await mergeAreas(assignAreaId, assignMergeId);
    if (ok) {
      setAssignMode(null);
      setAssignAreaId(null);
      setOfficialMergeAck(false);
    }
  }

  function handleDropDistrict(districtId: string) {
    if (!draggingId) return;
    setAssignAreaId(draggingId);
    setAssignMode("move");
    setAssignDistrictId(districtId);
    setAssignMergeId("");
    setOfficialMergeAck(false);
    setDraggingId(null);
    setDropTarget(null);
  }

  function handleDropArea(areaId: string) {
    if (draggingId && draggingId !== areaId) {
      setAssignAreaId(draggingId);
      setAssignMode("merge");
      setAssignMergeId(areaId);
      setOfficialMergeAck(false);
    }
    setDraggingId(null);
    setDropTarget(null);
  }

  async function toggleCustomActive(area: AdminNeighborhood) {
    if (busy || area.origin !== "custom") return;
    setBusy(true);
    try {
      if (area.active) {
        await deactivateAdminArea(area.id);
        setTree(await listAdminZones());
        showFlash(`Deactivated ${area.name} · hidden from Cities chips`);
      } else {
        await activateAdminArea(area.id);
        setTree(await listAdminZones());
        showFlash(`Reactivated ${area.name} · Cities chips updated`);
      }
    } catch (err) {
      showFlash(err instanceof Error ? err.message : "Action failed", "ember");
    } finally {
      setBusy(false);
    }
  }

  return {
    status,
    errorMessage,
    retry: () => setReloadToken((n) => n + 1),
    flash,
    flashTone,
    busy,
    tree,
    visible,
    matchIds,
    counts,
    allAreas,
    customCount,
    listings,
    districtTotal,
    origin,
    setOrigin,
    query,
    setQuery,
    openGovIds,
    openDistrictIds,
    toggleGov,
    toggleDistrict,
    expandAll,
    collapseAll,
    formMode,
    renameTarget,
    draft,
    slugLocked,
    lockDistrict,
    setDraft,
    setSlugLocked,
    openCreate,
    openRename,
    saveForm,
    cancelForm: () => {
      setFormMode(null);
      setRenameTarget(null);
    },
    assignMode,
    assignArea,
    assignDistrictId,
    assignMergeId,
    officialMergeRisk,
    officialMergeAck,
    setOfficialMergeAck,
    setAssignDistrictId,
    setAssignMergeId,
    openAssign,
    applyAssign,
    cancelAssign: () => {
      setAssignMode(null);
      setAssignAreaId(null);
      setOfficialMergeAck(false);
    },
    toggleCustomActive,
    draggingId,
    dropTarget,
    setDraggingId,
    setDropTarget,
    handleDropDistrict,
    handleDropArea,
    endDrag: () => {
      setDraggingId(null);
      setDropTarget(null);
    },
  };
}

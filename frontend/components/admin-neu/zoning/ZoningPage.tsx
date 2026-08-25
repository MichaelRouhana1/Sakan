import { Plus } from "lucide-react-native";
import { useDeferredValue, useMemo, useState } from "react";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { AreaFormDialog } from "./AreaFormDialog";
import { AssignDialog } from "./AssignDialog";
import { ZoneTree } from "./ZoneTree";
import { ZoningToolbar } from "./ZoningToolbar";
import { MOCK_ZONES } from "./mockZones";
import {
  findDistrict,
  findNeighborhood,
  flattenNeighborhoods,
  listingCount,
  slugify,
  type AdminDistrict,
  type AdminGovernorate,
  type AdminNeighborhood,
  type AreaDraft,
  type AssignMode,
  type OriginFilter,
  type RenameTarget,
} from "./types";

const EMPTY_DRAFT: AreaDraft = { name: "", slug: "", districtId: "" };

export function ZoningPage() {
  const [tree, setTree] = useState(MOCK_ZONES);
  const [origin, setOrigin] = useState<OriginFilter>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [expandedGovIds, setExpandedGovIds] = useState<Set<string>>(
    () => new Set([MOCK_ZONES[0]?.id ?? "", MOCK_ZONES[1]?.id ?? ""]),
  );
  const [expandedDistrictIds, setExpandedDistrictIds] = useState<Set<string>>(
    () => new Set(["dist-beirut", "dist-matn"]),
  );

  const [formMode, setFormMode] = useState<"create" | "rename" | null>(null);
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [slugLocked, setSlugLocked] = useState(false);
  const [lockDistrict, setLockDistrict] = useState(false);

  const [assignMode, setAssignMode] = useState<AssignMode | null>(null);
  const [assignAreaId, setAssignAreaId] = useState<string | null>(null);
  const [assignDistrictId, setAssignDistrictId] = useState("");
  const [assignMergeId, setAssignMergeId] = useState("");

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    kind: "district" | "neighborhood";
    id: string;
  } | null>(null);
  const [liveNote, setLiveNote] = useState("");

  const allAreas = flattenNeighborhoods(tree);
  const customCount = allAreas.filter((row) => row.origin === "custom").length;
  const officialCount = allAreas.filter((row) => row.origin === "official").length;
  const listings = tree.reduce((sum, gov) => sum + listingCount(gov), 0);
  const districtTotal = tree.reduce((sum, gov) => sum + gov.districts.length, 0);

  const counts: Record<OriginFilter, number> = {
    all: allAreas.length,
    official: officialCount,
    custom: customCount,
  };

  const { visible, matchIds } = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const hits = new Set<string>();

    function originOk(area: AdminNeighborhood) {
      return origin === "all" || area.origin === origin;
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

  function saveForm() {
    if (formMode === "create") {
      const id = `n-custom-${Date.now()}`;
      const next: AdminNeighborhood = {
        id,
        districtId: draft.districtId,
        name: draft.name.trim(),
        slug: draft.slug.trim() || slugify(draft.name),
        origin: "custom",
        listingCount: 0,
      };
      setTree((current) =>
        current.map((gov) => ({
          ...gov,
          districts: gov.districts.map((district) =>
            district.id === draft.districtId
              ? { ...district, neighborhoods: [...district.neighborhoods, next] }
              : district,
          ),
        })),
      );
      setExpandedDistrictIds((current) => new Set(current).add(draft.districtId));
      setLiveNote(`Added ${next.name}`);
    } else if (renameTarget) {
      const name = draft.name.trim();
      const slug = draft.slug.trim() || slugify(name);
      const { kind, id } = renameTarget;
      setTree((current) =>
        current.map((gov) => {
          if (kind === "governorate" && gov.id === id) return { ...gov, name, slug };
          return {
            ...gov,
            districts: gov.districts.map((district) => {
              if (kind === "district" && district.id === id) {
                return { ...district, name, slug };
              }
              return {
                ...district,
                neighborhoods: district.neighborhoods.map((area) =>
                  kind === "neighborhood" && area.id === id
                    ? { ...area, name, slug }
                    : area,
                ),
              };
            }),
          };
        }),
      );
      setLiveNote(`Renamed to ${name}`);
    }
    setFormMode(null);
    setRenameTarget(null);
  }

  function reparent(areaId: string, districtId: string) {
    const found = findNeighborhood(tree, areaId);
    if (!found || found.district.id === districtId) return;
    const dest = findDistrict(tree, districtId);
    if (!dest) return;
    setTree((current) =>
      current.map((gov) => ({
        ...gov,
        districts: gov.districts.map((district) => {
          if (district.id === found.district.id) {
            return {
              ...district,
              neighborhoods: district.neighborhoods.filter((row) => row.id !== areaId),
            };
          }
          if (district.id === districtId) {
            return {
              ...district,
              neighborhoods: [
                ...district.neighborhoods,
                { ...found.area, districtId },
              ],
            };
          }
          return district;
        }),
      })),
    );
    setExpandedGovIds((current) => new Set(current).add(dest.gov.id));
    setExpandedDistrictIds((current) => new Set(current).add(districtId));
    setLiveNote(`Moved ${found.area.name} → ${dest.district.name}`);
  }

  function mergeAreas(sourceId: string, targetId: string) {
    const source = findNeighborhood(tree, sourceId);
    const target = findNeighborhood(tree, targetId);
    if (!source || !target || sourceId === targetId) return;
    setTree((current) =>
      current.map((gov) => ({
        ...gov,
        districts: gov.districts.map((district) => ({
          ...district,
          neighborhoods: district.neighborhoods
            .filter((row) => row.id !== sourceId)
            .map((row) =>
              row.id === targetId
                ? {
                    ...row,
                    listingCount: row.listingCount + source.area.listingCount,
                  }
                : row,
            ),
        })),
      })),
    );
    setLiveNote(`Merged ${source.area.name} into ${target.area.name}`);
  }

  function openAssign(area: AdminNeighborhood, mode: AssignMode) {
    setAssignAreaId(area.id);
    setAssignMode(mode);
    setAssignDistrictId(mode === "move" ? area.districtId : "");
    setAssignMergeId("");
  }

  function applyAssign() {
    if (!assignAreaId || !assignMode) return;
    if (assignMode === "move") reparent(assignAreaId, assignDistrictId);
    else mergeAreas(assignAreaId, assignMergeId);
    setAssignMode(null);
    setAssignAreaId(null);
  }

  function handleDropDistrict(districtId: string) {
    if (draggingId) reparent(draggingId, districtId);
    setDraggingId(null);
    setDropTarget(null);
  }

  function handleDropArea(areaId: string) {
    if (draggingId && draggingId !== areaId) {
      setAssignAreaId(draggingId);
      setAssignMode("merge");
      setAssignMergeId(areaId);
    }
    setDraggingId(null);
    setDropTarget(null);
  }

  const assignArea = assignAreaId
    ? findNeighborhood(tree, assignAreaId)?.area ?? null
    : null;

  return (
    <H className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <H className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <H>
          <H as="h1" className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Geographic Zoning
          </H>
          <H as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-clay-700">
            Lebanon hierarchy for Standard search: governorate, district, then
            neighborhood. Drag an area onto another district to re-parent, or onto
            another area to merge.
          </H>
        </H>
        <H className="flex flex-wrap items-center gap-2">
          <H
            as="span"
            className="inline-flex rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
          >
            Demo data
          </H>
          <NeuButton tone="moss" onClick={() => openCreate()}>
            <Plus size={16} strokeWidth={1.75} />
            Add custom area
          </NeuButton>
        </H>
      </H>

      <H className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Governorates" value={String(tree.length)} hint="Muhafazat" />
        <Kpi label="Districts" value={String(districtTotal)} hint="Caza / qada" />
        <Kpi
          label="Areas"
          value={String(allAreas.length)}
          hint={`${customCount} custom`}
        />
        <Kpi
          label="Mapped listings"
          value={String(listings)}
          hint="Demo counts on areas"
        />
      </H>

      {liveNote ? (
        <H
          as="p"
          role="status"
          aria-live="polite"
          className="rounded-neu-md bg-clay-100 px-4 py-2.5 text-sm text-moss shadow-neu-in-sm"
        >
          {liveNote}
        </H>
      ) : null}

      <ZoningToolbar
        query={query}
        onQuery={setQuery}
        origin={origin}
        onOrigin={setOrigin}
        counts={counts}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />

      <ZoneTree
        governorates={visible}
        expandedGovIds={openGovIds}
        expandedDistrictIds={openDistrictIds}
        matchIds={matchIds}
        draggingId={draggingId}
        dropTarget={dropTarget}
        onToggleGov={toggleGov}
        onToggleDistrict={toggleDistrict}
        onRenameGov={(gov) => openRename("governorate", gov.id, gov.name, gov.slug)}
        onRenameDistrict={(district) =>
          openRename("district", district.id, district.name, district.slug)
        }
        onAddArea={openCreate}
        onRenameArea={(area) =>
          openRename("neighborhood", area.id, area.name, area.slug)
        }
        onMoveArea={(area) => openAssign(area, "move")}
        onMergeArea={(area) => openAssign(area, "merge")}
        onDragStart={setDraggingId}
        onDragOver={setDropTarget}
        onDropDistrict={handleDropDistrict}
        onDropArea={handleDropArea}
        onDragEnd={() => {
          setDraggingId(null);
          setDropTarget(null);
        }}
      />

      <AreaFormDialog
        mode={formMode}
        renameTarget={renameTarget}
        tree={tree}
        draft={draft}
        slugLocked={slugLocked}
        lockDistrict={lockDistrict}
        onDraft={setDraft}
        onSlugLocked={setSlugLocked}
        onCancel={() => {
          setFormMode(null);
          setRenameTarget(null);
        }}
        onConfirm={saveForm}
      />

      <AssignDialog
        mode={assignMode}
        area={assignArea}
        tree={tree}
        districtId={assignDistrictId}
        mergeId={assignMergeId}
        onDistrictId={setAssignDistrictId}
        onMergeId={setAssignMergeId}
        onCancel={() => {
          setAssignMode(null);
          setAssignAreaId(null);
        }}
        onConfirm={applyAssign}
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

import { ChevronDown, GripVertical, MapPin, Pencil, Plus } from "lucide-react-native";
import { useBreakpoint } from "@/lib/breakpoints";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { NeighborhoodActions } from "./NeighborhoodActions";
import { CountPill, KindPill, OriginPill } from "./ZonePills";
import {
  initials,
  neighborhoodCount,
  type AdminDistrict,
  type AdminGovernorate,
  type AdminNeighborhood,
} from "./types";

type DragKind = "district" | "neighborhood";

type Props = {
  governorates: AdminGovernorate[];
  expandedGovIds: Set<string>;
  expandedDistrictIds: Set<string>;
  matchIds: Set<string>;
  draggingId: string | null;
  dropTarget: { kind: DragKind; id: string } | null;
  onToggleGov: (id: string) => void;
  onToggleDistrict: (id: string) => void;
  onRenameGov: (gov: AdminGovernorate) => void;
  onRenameDistrict: (district: AdminDistrict) => void;
  onAddArea: (district: AdminDistrict) => void;
  onRenameArea: (area: AdminNeighborhood) => void;
  onMoveArea: (area: AdminNeighborhood) => void;
  onMergeArea: (area: AdminNeighborhood) => void;
  onDragStart: (areaId: string) => void;
  onDragOver: (target: { kind: DragKind; id: string } | null) => void;
  onDropDistrict: (districtId: string) => void;
  onDropArea: (areaId: string) => void;
  onDragEnd: () => void;
};

export function ZoneTree({
  governorates,
  expandedGovIds,
  expandedDistrictIds,
  matchIds,
  draggingId,
  dropTarget,
  onToggleGov,
  onToggleDistrict,
  onRenameGov,
  onRenameDistrict,
  onAddArea,
  onRenameArea,
  onMoveArea,
  onMergeArea,
  onDragStart,
  onDragOver,
  onDropDistrict,
  onDropArea,
  onDragEnd,
}: Props) {
  if (governorates.length === 0) {
    return (
      <NeuSurface inset className="px-6 py-16 text-center">
        <H as="p" className="font-display text-lg font-semibold text-clay-900">
          No zones in this view
        </H>
        <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
          Try another name — or add a custom area under a district.
        </H>
      </NeuSurface>
    );
  }

  return (
    <H className="flex flex-col gap-3">
      {governorates.map((gov) => (
        <GovernorateNode
          key={gov.id}
          gov={gov}
          expanded={expandedGovIds.has(gov.id)}
          expandedDistrictIds={expandedDistrictIds}
          matchIds={matchIds}
          draggingId={draggingId}
          dropTarget={dropTarget}
          onToggle={() => onToggleGov(gov.id)}
          onToggleDistrict={onToggleDistrict}
          onRename={() => onRenameGov(gov)}
          onRenameDistrict={onRenameDistrict}
          onAddArea={onAddArea}
          onRenameArea={onRenameArea}
          onMoveArea={onMoveArea}
          onMergeArea={onMergeArea}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDropDistrict={onDropDistrict}
          onDropArea={onDropArea}
          onDragEnd={onDragEnd}
        />
      ))}
    </H>
  );
}

function GovernorateNode({
  gov,
  expanded,
  expandedDistrictIds,
  matchIds,
  draggingId,
  dropTarget,
  onToggle,
  onToggleDistrict,
  onRename,
  onRenameDistrict,
  onAddArea,
  onRenameArea,
  onMoveArea,
  onMergeArea,
  onDragStart,
  onDragOver,
  onDropDistrict,
  onDropArea,
  onDragEnd,
}: {
  gov: AdminGovernorate;
  expanded: boolean;
  expandedDistrictIds: Set<string>;
  matchIds: Set<string>;
  draggingId: string | null;
  dropTarget: { kind: DragKind; id: string } | null;
  onToggle: () => void;
  onToggleDistrict: (id: string) => void;
  onRename: () => void;
  onRenameDistrict: (district: AdminDistrict) => void;
  onAddArea: (district: AdminDistrict) => void;
  onRenameArea: (area: AdminNeighborhood) => void;
  onMoveArea: (area: AdminNeighborhood) => void;
  onMergeArea: (area: AdminNeighborhood) => void;
  onDragStart: (areaId: string) => void;
  onDragOver: (target: { kind: DragKind; id: string } | null) => void;
  onDropDistrict: (districtId: string) => void;
  onDropArea: (areaId: string) => void;
  onDragEnd: () => void;
}) {
  const bp = useBreakpoint();
  const compact = bp === "mobile";
  const panelId = `districts-${gov.id}`;
  const areas = neighborhoodCount(gov);
  const hit = matchIds.has(gov.id);

  return (
    <NeuSurface as="section" className="overflow-hidden">
      <H className="flex items-start gap-2 px-4 py-4 sm:items-center sm:px-5">
        <H as="h2" className="min-w-0 flex-1 text-base font-normal">
          <H
            as="button"
            type="button"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={onToggle}
            className={[
              "flex w-full cursor-pointer items-start gap-3 border-0 bg-transparent p-0 text-left shadow-none sm:items-center",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
              hit ? "rounded-neu-md" : "",
            ].join(" ")}
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
              {initials(gov.name)}
            </H>
            <H className="min-w-0 flex-1">
              <H className="flex flex-wrap items-center gap-2">
                <H as="span" className="font-display text-base font-semibold text-clay-900">
                  {gov.name}
                </H>
                <KindPill kind="governorate" />
              </H>
              <H as="span" className="mt-1 block text-sm font-normal text-clay-700">
                {gov.arabicName}
                {" · "}
                {gov.districts.length}{" "}
                {gov.districts.length === 1 ? "district" : "districts"}
                {" · "}
                {areas} {areas === 1 ? "area" : "areas"}
              </H>
            </H>
          </H>
        </H>
        {compact ? null : (
          <NeuButton
            ariaLabel={`Rename ${gov.name}`}
            className="px-2.5 py-1.5 text-xs"
            onClick={onRename}
          >
            <Pencil size={14} strokeWidth={1.75} />
            Rename
          </NeuButton>
        )}
      </H>

      {compact ? (
        <H className="px-4 pb-3">
          <NeuButton onClick={onRename}>
            <Pencil size={16} strokeWidth={1.75} />
            Rename governorate
          </NeuButton>
        </H>
      ) : null}

      {expanded ? (
        <H id={panelId} className="px-4 pb-4 sm:px-5">
          <H className="ml-0 border-l-2 border-clay-200/80 pl-3 sm:ml-4 sm:pl-4">
            {gov.districts.length === 0 ? (
              <NeuSurface inset className="px-4 py-8 text-center">
                <H as="p" className="text-sm font-medium text-clay-900">
                  No districts yet
                </H>
              </NeuSurface>
            ) : (
              <H className="flex flex-col gap-2">
                {gov.districts.map((district) => (
                  <DistrictNode
                    key={district.id}
                    district={district}
                    expanded={expandedDistrictIds.has(district.id)}
                    matchIds={matchIds}
                    draggingId={draggingId}
                    dropTarget={dropTarget}
                    compact={compact}
                    onToggle={() => onToggleDistrict(district.id)}
                    onRename={() => onRenameDistrict(district)}
                    onAddArea={() => onAddArea(district)}
                    onRenameArea={onRenameArea}
                    onMoveArea={onMoveArea}
                    onMergeArea={onMergeArea}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDropDistrict={onDropDistrict}
                    onDropArea={onDropArea}
                    onDragEnd={onDragEnd}
                  />
                ))}
              </H>
            )}
          </H>
        </H>
      ) : null}
    </NeuSurface>
  );
}

function DistrictNode({
  district,
  expanded,
  matchIds,
  draggingId,
  dropTarget,
  compact,
  onToggle,
  onRename,
  onAddArea,
  onRenameArea,
  onMoveArea,
  onMergeArea,
  onDragStart,
  onDragOver,
  onDropDistrict,
  onDropArea,
  onDragEnd,
}: {
  district: AdminDistrict;
  expanded: boolean;
  matchIds: Set<string>;
  draggingId: string | null;
  dropTarget: { kind: DragKind; id: string } | null;
  compact: boolean;
  onToggle: () => void;
  onRename: () => void;
  onAddArea: () => void;
  onRenameArea: (area: AdminNeighborhood) => void;
  onMoveArea: (area: AdminNeighborhood) => void;
  onMergeArea: (area: AdminNeighborhood) => void;
  onDragStart: (areaId: string) => void;
  onDragOver: (target: { kind: DragKind; id: string } | null) => void;
  onDropDistrict: (districtId: string) => void;
  onDropArea: (areaId: string) => void;
  onDragEnd: () => void;
}) {
  const panelId = `areas-${district.id}`;
  const dropHere =
    dropTarget?.kind === "district" && dropTarget.id === district.id;
  const hit = matchIds.has(district.id);

  return (
    <H
      className={[
        "rounded-neu-md bg-clay-100 px-3 py-3 shadow-neu-in-sm transition-shadow duration-press",
        dropHere ? "shadow-press" : "",
      ].join(" ")}
      onDragOver={(event: { preventDefault: () => void }) => {
        event.preventDefault();
        onDragOver({ kind: "district", id: district.id });
      }}
      onDrop={(event: { preventDefault: () => void; stopPropagation: () => void }) => {
        event.preventDefault();
        event.stopPropagation();
        onDropDistrict(district.id);
      }}
    >
      <H className="flex items-start gap-2 sm:items-center">
        <H as="h3" className="min-w-0 flex-1 text-sm font-normal">
          <H
            as="button"
            type="button"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={onToggle}
            className="flex w-full cursor-pointer items-start gap-2.5 border-0 bg-transparent p-0 text-left shadow-none sm:items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
          >
            <H
              as="span"
              className={[
                "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-clay-100 text-clay-700 shadow-neu-sm transition-transform duration-panel sm:mt-0",
                expanded ? "rotate-180" : "",
              ].join(" ")}
              aria-hidden
            >
              <ChevronDown size={14} strokeWidth={1.75} />
            </H>
            <H className="min-w-0 flex-1">
              <H className="flex flex-wrap items-center gap-2">
                <H as="span" className="font-medium text-clay-900">
                  {district.name}
                </H>
                <KindPill kind="district" />
                {hit ? (
                  <H
                    as="span"
                    className="h-1.5 w-1.5 rounded-full bg-moss"
                    aria-hidden
                  />
                ) : null}
              </H>
              <H as="span" className="mt-0.5 block text-xs text-clay-700">
                {district.neighborhoods.length}{" "}
                {district.neighborhoods.length === 1 ? "area" : "areas"}
                {dropHere ? " · Drop to move here" : ""}
              </H>
            </H>
          </H>
        </H>
        {compact ? null : (
          <H className="flex shrink-0 items-center gap-1.5">
            <NeuButton
              ariaLabel={`Rename ${district.name}`}
              className="px-2.5 py-1.5 text-xs"
              onClick={onRename}
            >
              <Pencil size={14} strokeWidth={1.75} />
            </NeuButton>
            <NeuButton
              tone="moss"
              ariaLabel={`Add area in ${district.name}`}
              className="px-2.5 py-1.5 text-xs"
              onClick={onAddArea}
            >
              <Plus size={14} strokeWidth={1.75} />
              Area
            </NeuButton>
          </H>
        )}
      </H>

      {compact ? (
        <H className="mt-3 flex flex-wrap gap-2">
          <NeuButton onClick={onRename}>
            <Pencil size={16} strokeWidth={1.75} />
            Rename
          </NeuButton>
          <NeuButton tone="moss" onClick={onAddArea}>
            <Plus size={16} strokeWidth={1.75} />
            Add area
          </NeuButton>
        </H>
      ) : null}

      {expanded ? (
        <H id={panelId} className="mt-3">
          {district.neighborhoods.length === 0 ? (
            <H className="rounded-neu-md bg-clay-100 px-4 py-6 text-center shadow-neu-in">
              <H as="p" className="text-sm font-medium text-clay-900">
                No neighborhoods yet
              </H>
              <H as="p" className="mt-1 text-xs text-clay-700">
                Add a custom area or drop one here from another district.
              </H>
            </H>
          ) : (
            <H className="flex flex-col gap-2" role="list">
              {district.neighborhoods.map((area) => (
                <NeighborhoodRow
                  key={area.id}
                  area={area}
                  compact={compact}
                  highlighted={matchIds.has(area.id)}
                  dragging={draggingId === area.id}
                  dropHere={
                    dropTarget?.kind === "neighborhood" && dropTarget.id === area.id
                  }
                  onRename={() => onRenameArea(area)}
                  onMove={() => onMoveArea(area)}
                  onMerge={() => onMergeArea(area)}
                  onDragStart={() => onDragStart(area.id)}
                  onDragOver={() =>
                    onDragOver({ kind: "neighborhood", id: area.id })
                  }
                  onDrop={() => onDropArea(area.id)}
                  onDragEnd={onDragEnd}
                />
              ))}
            </H>
          )}
        </H>
      ) : null}
    </H>
  );
}

function NeighborhoodRow({
  area,
  compact,
  highlighted,
  dragging,
  dropHere,
  onRename,
  onMove,
  onMerge,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  area: AdminNeighborhood;
  compact: boolean;
  highlighted: boolean;
  dragging: boolean;
  dropHere: boolean;
  onRename: () => void;
  onMove: () => void;
  onMerge: () => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  return (
    <H
      role="listitem"
      draggable
      onDragStart={(event: {
        stopPropagation: () => void;
        dataTransfer: { setData: (type: string, value: string) => void; effectAllowed: string };
      }) => {
        event.stopPropagation();
        event.dataTransfer.setData("text/plain", area.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragOver={(event: { preventDefault: () => void; stopPropagation: () => void }) => {
        event.preventDefault();
        event.stopPropagation();
        onDragOver();
      }}
      onDrop={(event: { preventDefault: () => void; stopPropagation: () => void }) => {
        event.preventDefault();
        event.stopPropagation();
        onDrop();
      }}
      onDragEnd={onDragEnd}
      className={[
        "flex cursor-grab items-start gap-2 rounded-neu-md bg-clay-100 px-3 py-2.5 shadow-neu-sm active:cursor-grabbing sm:items-center",
        dragging ? "opacity-50" : "",
        dropHere ? "shadow-press" : "",
        highlighted ? "ring-0" : "",
      ].join(" ")}
    >
      <H
        className="mt-0.5 hidden shrink-0 text-clay-500 sm:mt-0 sm:block"
        aria-hidden
      >
        <GripVertical size={16} strokeWidth={1.75} />
      </H>
      <H className="mt-0.5 text-clay-500 sm:mt-0" aria-hidden>
        <MapPin size={16} strokeWidth={1.75} />
      </H>
      <H className="min-w-0 flex-1">
        <H className="flex flex-wrap items-center gap-2">
          <H as="span" className="text-sm font-medium text-clay-900">
            {area.name}
          </H>
          <OriginPill origin={area.origin} />
          <CountPill
            value={area.listingCount}
            label={area.listingCount === 1 ? "listing" : "listings"}
          />
        </H>
        <H as="span" className="mt-0.5 block text-xs text-clay-500">
          {area.slug}
          {dropHere && !dragging ? " · Drop to merge here" : ""}
          {highlighted ? " · Match" : ""}
        </H>
      </H>
      <NeighborhoodActions
        compact={!compact}
        onRename={onRename}
        onMove={onMove}
        onMerge={onMerge}
      />
    </H>
  );
}

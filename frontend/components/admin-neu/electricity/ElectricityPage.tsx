import { Plus } from "lucide-react-native";
import { useDeferredValue, useMemo, useState } from "react";
import { useBreakpoint } from "@/lib/breakpoints";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { CutActionDialog } from "./CutActionDialog";
import { CutWindowDialog } from "./CutWindowDialog";
import { ElectricityToolbar } from "./ElectricityToolbar";
import { MOCK_GRID_ZONES } from "./mockZones";
import { SchedulePanel } from "./SchedulePanel";
import { ZoneCards } from "./ZoneCards";
import {
  blackoutHours,
  cutHours,
  edlHours,
  findZone,
  stabilityOf,
  type CutAction,
  type GridWindow,
  type GridZone,
  type StabilityFilter,
  type WindowDraft,
} from "./types";

const EMPTY_DRAFT: WindowDraft = { zoneId: "", start: "", end: "" };

export function ElectricityPage() {
  const bp = useBreakpoint();
  const compact = bp === "mobile";
  const [zones, setZones] = useState(MOCK_GRID_ZONES);
  const [stability, setStability] = useState<StabilityFilter>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [pickZone, setPickZone] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [editWindowId, setEditWindowId] = useState<string | null>(null);
  const [action, setAction] = useState<CutAction | null>(null);
  const [liveNote, setLiveNote] = useState("");

  const counts = useMemo(() => {
    const stable = zones.filter((row) => stabilityOf(row) === "stable").length;
    const moderate = zones.filter((row) => stabilityOf(row) === "moderate").length;
    const severe = zones.filter((row) => stabilityOf(row) === "severe").length;
    return {
      all: zones.length,
      stable,
      moderate,
      severe,
    };
  }, [zones]);

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    return zones
      .filter((row) =>
        stability === "all" ? true : stabilityOf(row) === stability,
      )
      .filter((row) => {
        if (!needle) return true;
        const hay =
          `${row.name} ${row.district} ${row.governorate} ${row.note}`.toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => cutHours(b) - cutHours(a) || a.name.localeCompare(b.name));
  }, [zones, stability, deferredQuery]);

  const resolvedId = compact
    ? selectedId
    : visible.some((row) => row.id === selectedId)
      ? selectedId
      : (visible[0]?.id ?? null);

  const selected = resolvedId ? findZone(zones, resolvedId) : null;
  const actionZone = action ? findZone(zones, action.zoneId) : null;

  const avgEdl =
    zones.length === 0
      ? 0
      : Math.round(
          zones.reduce((sum, row) => sum + edlHours(row), 0) / zones.length,
        );
  const darkTotal = zones.reduce((sum, row) => sum + blackoutHours(row), 0);

  function touch(id: string, patch: Partial<GridZone>) {
    const now = new Date().toISOString();
    setZones((current) =>
      current.map((row) =>
        row.id === id ? { ...row, ...patch, updatedAt: now } : row,
      ),
    );
  }

  function openLog(zoneId?: string) {
    setFormMode("create");
    setPickZone(!zoneId);
    setEditWindowId(null);
    setDraft({
      zoneId: zoneId ?? "",
      start: "18:00",
      end: "22:00",
    });
  }

  function openEdit(zone: GridZone, window: GridWindow) {
    setFormMode("edit");
    setPickZone(false);
    setEditWindowId(window.id);
    setDraft({ zoneId: zone.id, start: window.start, end: window.end });
  }

  function saveWindow() {
    const zone = findZone(zones, draft.zoneId);
    if (!zone) return;
    if (formMode === "create") {
      const next: GridWindow = {
        id: `w-${Date.now()}`,
        start: draft.start,
        end: draft.end,
      };
      touch(zone.id, { cutWindows: [...zone.cutWindows, next] });
      setSelectedId(zone.id);
      setLiveNote(`Logged ${zone.name} cut ${draft.start}–${draft.end}`);
    } else if (editWindowId) {
      touch(zone.id, {
        cutWindows: zone.cutWindows.map((row) =>
          row.id === editWindowId
            ? { ...row, start: draft.start, end: draft.end }
            : row,
        ),
      });
      setLiveNote(`Updated ${zone.name} window`);
    }
    setFormMode(null);
    setDraft(EMPTY_DRAFT);
    setEditWindowId(null);
  }

  function applyAction() {
    if (!action) return;
    const zone = findZone(zones, action.zoneId);
    if (!zone) return;
    if (action.kind === "remove" && action.windowId) {
      touch(zone.id, {
        cutWindows: zone.cutWindows.filter((row) => row.id !== action.windowId),
      });
      setLiveNote(`Removed a cut window on ${zone.name}`);
    } else {
      touch(zone.id, { cutWindows: [] });
      setLiveNote(`${zone.name} marked 24h EDL`);
    }
    setAction(null);
  }

  return (
    <H className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <H className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <H>
          <H
            as="p"
            className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-moss"
          >
            Infrastructure logging
          </H>
          <H as="h1" className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Electricity Controls
          </H>
          <H as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-clay-700">
            Daily EDL cut windows by area. Moss is state power, ochre is
            generator fill, ember is dark. Update a feeder when the rotation
            changes.
          </H>
        </H>
        <H className="flex flex-wrap items-center gap-2">
          <H
            as="span"
            className="inline-flex rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
          >
            Demo data
          </H>
          <NeuButton tone="moss" onClick={() => openLog()}>
            <Plus size={16} strokeWidth={1.75} />
            Log cut window
          </NeuButton>
        </H>
      </H>

      <H className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Zones tracked" value={String(zones.length)} hint="Feeder areas" />
        <Kpi
          label="Severe cuts"
          value={String(counts.severe)}
          hint="Over 12h EDL off"
        />
        <Kpi
          label="Avg EDL"
          value={`${avgEdl}h`}
          hint="State power per day"
        />
        <Kpi
          label="Dark hours"
          value={`${darkTotal}h`}
          hint="Cuts with no generator"
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

      <ElectricityToolbar
        query={query}
        onQuery={setQuery}
        stability={stability}
        onStability={(next) => {
          setStability(next);
          if (compact) setSelectedId(null);
        }}
        counts={counts}
      />

      {compact && selected ? (
        <SchedulePanel
          zone={selected}
          showBack
          onBack={() => setSelectedId(null)}
          onAddWindow={() => openLog(selected.id)}
          onEditWindow={(window) => openEdit(selected, window)}
          onRemoveWindow={(window) =>
            setAction({ kind: "remove", zoneId: selected.id, windowId: window.id })
          }
          onClear={() => setAction({ kind: "clear", zoneId: selected.id })}
          onGenerator={(on) => touch(selected.id, { generatorDuringCuts: on })}
          onAmperes={(value) => touch(selected.id, { generatorAmperes: value })}
          onNote={(note) => touch(selected.id, { note })}
        />
      ) : compact ? (
        <ZoneCards
          zones={visible}
          selectedId={resolvedId}
          onSelect={(zone) => setSelectedId(zone.id)}
        />
      ) : (
        <H className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <ZoneCards
            zones={visible}
            selectedId={resolvedId}
            onSelect={(zone) => setSelectedId(zone.id)}
          />
          <H className="lg:sticky lg:top-6">
            <SchedulePanel
              zone={selected}
              onAddWindow={() => selected && openLog(selected.id)}
              onEditWindow={(window) => selected && openEdit(selected, window)}
              onRemoveWindow={(window) =>
                selected &&
                setAction({
                  kind: "remove",
                  zoneId: selected.id,
                  windowId: window.id,
                })
              }
              onClear={() =>
                selected && setAction({ kind: "clear", zoneId: selected.id })
              }
              onGenerator={(on) =>
                selected && touch(selected.id, { generatorDuringCuts: on })
              }
              onAmperes={(value) =>
                selected && touch(selected.id, { generatorAmperes: value })
              }
              onNote={(note) => selected && touch(selected.id, { note })}
            />
          </H>
        </H>
      )}

      <CutWindowDialog
        mode={formMode}
        pickZone={pickZone}
        zones={zones}
        draft={draft}
        onDraft={setDraft}
        onCancel={() => {
          setFormMode(null);
          setDraft(EMPTY_DRAFT);
          setEditWindowId(null);
        }}
        onConfirm={saveWindow}
      />

      <CutActionDialog
        action={action}
        zone={actionZone}
        onCancel={() => setAction(null)}
        onConfirm={applyAction}
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

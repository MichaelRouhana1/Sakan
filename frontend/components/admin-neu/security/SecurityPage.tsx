import { useDeferredValue, useMemo, useState } from "react";
import { H } from "../h";
import { AuditTable } from "./AuditTable";
import { AuditToolbar } from "./AuditToolbar";
import { EndpointChart } from "./EndpointChart";
import { RbacPanel } from "./RbacPanel";
import { KPI_ICONS, SecurityKpis, type SecurityKpi } from "./SecurityKpis";
import { SpikeAlerts } from "./SpikeAlerts";
import {
  ANCHOR_ISO,
  ACTORS,
  DATA_END,
  DATA_START,
  MOCK_EVENTS,
  MOCK_MATRIX,
  defaultCustomFrom,
  trafficForRange,
} from "./mockSecurity";
import {
  ACTION_LABEL,
  CATEGORY_TABS,
  PERMISSIONS,
  ROLE_FILTER_TABS,
  TIER_LABEL,
  TIERS,
  buildSpikeAlerts,
  cloneMatrix,
  formatCount,
  formatDay,
  grantedCount,
  matchesCategory,
  matricesEqual,
  toCsv,
  type ActionCategory,
  type AdminTier,
  type AuditEvent,
  type PermissionId,
  type RangeId,
} from "./types";

export function SecurityPage() {
  const [events, setEvents] = useState(MOCK_EVENTS);
  const [savedMatrix, setSavedMatrix] = useState(() => cloneMatrix(MOCK_MATRIX));
  const [matrix, setMatrix] = useState(() => cloneMatrix(MOCK_MATRIX));
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [category, setCategory] = useState<ActionCategory | "all">("all");
  const [roleFilter, setRoleFilter] = useState<AdminTier | "all">("all");
  const [logRange, setLogRange] = useState<RangeId>("7d");
  const [chartRange, setChartRange] = useState<"24h" | "7d" | "30d">("24h");
  const [customFrom, setCustomFrom] = useState(defaultCustomFrom);
  const [customTo, setCustomTo] = useState(DATA_END);
  const [notice, setNotice] = useState<string | null>(null);
  const [section, setSection] = useState<"monitor" | "access">("monitor");

  const dirty = !matricesEqual(matrix, savedMatrix);

  const rangeBounds = useMemo(
    () => resolveRange(logRange, customFrom, customTo),
    [logRange, customFrom, customTo],
  );

  const ranged = useMemo(() => {
    return events.filter((event) => {
      const day = formatDay(event.createdAt);
      return day >= rangeBounds.from && day <= rangeBounds.to;
    });
  }, [events, rangeBounds]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: ranged.length };
    for (const tab of CATEGORY_TABS) {
      if (tab.id === "all") continue;
      counts[tab.id] = ranged.filter((e) =>
        matchesCategory(e.action, tab.id),
      ).length;
    }
    return counts;
  }, [ranged]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: ranged.length };
    for (const tab of ROLE_FILTER_TABS) {
      if (tab.id === "all") continue;
      counts[tab.id] = ranged.filter((e) => e.actor.role === tab.id).length;
    }
    return counts;
  }, [ranged]);

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    return ranged
      .filter((event) => matchesCategory(event.action, category))
      .filter((event) =>
        roleFilter === "all" ? true : event.actor.role === roleFilter,
      )
      .filter((event) => {
        if (!needle) return true;
        const hay = [
          event.actor.name,
          event.actor.email,
          TIER_LABEL[event.actor.role],
          ACTION_LABEL[event.action],
          event.detail,
          event.target,
          event.ip,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [ranged, category, roleFilter, deferredQuery]);

  const traffic = useMemo(() => trafficForRange(chartRange), [chartRange]);
  const alerts = useMemo(() => buildSpikeAlerts(traffic), [traffic]);
  const kpis = useMemo(
    () => buildKpis(ranged, alerts.length, matrix),
    [ranged, alerts.length, matrix],
  );

  const chartRangeLabel =
    chartRange === "24h"
      ? "Last 24 hours"
      : chartRange === "7d"
        ? "Last 7 days"
        : "Last 30 days";

  function togglePermission(tier: AdminTier, permission: PermissionId) {
    if (tier === "super_admin") return;
    setMatrix((current) => ({
      ...current,
      [tier]: {
        ...current[tier],
        [permission]: !current[tier][permission],
      },
    }));
  }

  function saveMatrix() {
    if (!dirty) return;
    setSavedMatrix(cloneMatrix(matrix));
    const event: AuditEvent = {
      id: `aud_${Date.now()}`,
      actor: ACTORS.rania,
      action: "updated_rbac",
      detail: "Saved role permission matrix",
      target: "Role matrix",
      ip: "185.112.44.18",
      createdAt: ANCHOR_ISO,
    };
    setEvents((current) => [event, ...current]);
    setNotice("RBAC matrix saved. Audit row appended.");
    setSection("monitor");
  }

  function resetMatrix() {
    setMatrix(cloneMatrix(savedMatrix));
    setNotice("Discarded unsaved RBAC edits.");
  }

  function exportLogs() {
    if (visible.length === 0) return;
    const csv = toCsv(visible);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skoun-security-audit-${logRange}-${DATA_END}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    const event: AuditEvent = {
      id: `aud_exp_${Date.now()}`,
      actor: ACTORS.lina,
      action: "exported_logs",
      detail: `CSV · ${visible.length} rows · ${logRange}`,
      target: "Audit ledger",
      ip: "194.126.19.33",
      createdAt: ANCHOR_ISO,
    };
    setEvents((current) => [event, ...current]);
    setNotice(`Exported ${visible.length} security log rows.`);
  }

  return (
    <H className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <H className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <H>
          <H
            as="p"
            className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-moss"
          >
            System security
          </H>
          <H
            as="h1"
            className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl"
          >
            Audit & access
          </H>
          <H as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-clay-700">
            Review admin actions, hunt listing-API scrapes, and tighten role
            gates. Demo stream anchored {formatDay(ANCHOR_ISO)}.
          </H>
        </H>
        <H className="flex flex-col items-start gap-2 sm:items-end">
          <H
            className="neu-scroll inline-flex w-full gap-1 overflow-x-auto rounded-full bg-clay-100 p-1.5 shadow-neu-in sm:w-auto"
            role="tablist"
            aria-label="Security section"
          >
            <SectionTab
              selected={section === "monitor"}
              onSelect={() => setSection("monitor")}
              label="Monitor & ledger"
            />
            <SectionTab
              selected={section === "access"}
              onSelect={() => setSection("access")}
              label="Access control"
              badge={dirty ? "Unsaved" : undefined}
            />
          </H>
          <H
            as="span"
            className="inline-flex rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
          >
            Demo data · append-only ledger
          </H>
        </H>
      </H>

      <SecurityKpis items={kpis} />

      {notice ? (
        <H
          as="p"
          role="status"
          aria-live="polite"
          className="rounded-neu-md bg-clay-100 px-4 py-2.5 text-sm text-moss shadow-neu-in-sm"
        >
          {notice}
        </H>
      ) : null}

      {section === "monitor" ? (
        <>
          <H className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
            <EndpointChart
              points={traffic}
              range={chartRange}
              onRange={setChartRange}
            />
            <SpikeAlerts alerts={alerts} rangeLabel={chartRangeLabel} />
          </H>

          <H className="flex flex-col gap-3">
            <H className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <H>
                <H
                  as="p"
                  className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-moss"
                >
                  Immutable ledger
                </H>
                <H
                  as="h2"
                  className="mt-1 font-display text-xl font-semibold text-clay-900"
                >
                  Admin action log
                </H>
                <H as="p" className="mt-1 text-sm text-clay-700">
                  Who changed what, when, and from which IP. Filter by category
                  and role before export.
                </H>
              </H>
              <H as="span" className="text-sm tabular-nums text-clay-500">
                {visible.length} in view
              </H>
            </H>

            <AuditToolbar
              query={query}
              onQuery={setQuery}
              category={category}
              onCategory={setCategory}
              categoryCounts={categoryCounts}
              role={roleFilter}
              onRole={setRoleFilter}
              roleCounts={roleCounts}
              range={logRange}
              onRange={setLogRange}
              customFrom={customFrom}
              customTo={customTo}
              onCustomFrom={setCustomFrom}
              onCustomTo={setCustomTo}
              minDate={DATA_START}
              maxDate={DATA_END}
              onExport={exportLogs}
              exportDisabled={visible.length === 0}
            />

            <AuditTable events={visible} />
          </H>
        </>
      ) : (
        <RbacPanel
          matrix={matrix}
          dirty={dirty}
          onToggle={togglePermission}
          onSave={saveMatrix}
          onReset={resetMatrix}
        />
      )}
    </H>
  );
}

function SectionTab({
  selected,
  onSelect,
  label,
  badge,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  badge?: string;
}) {
  return (
    <H
      as="button"
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={[
        "flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-shadow duration-press sm:px-4",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
        selected
          ? "bg-clay-100 text-clay-900 shadow-press"
          : "bg-transparent text-clay-700",
      ].join(" ")}
    >
      {label}
      {badge ? (
        <H
          as="span"
          className="rounded-full bg-clay-100 px-2 py-0.5 text-[11px] font-semibold text-ochre shadow-neu-in-sm"
        >
          {badge}
        </H>
      ) : null}
    </H>
  );
}

function buildKpis(
  events: AuditEvent[],
  spikeCount: number,
  matrix: ReturnType<typeof cloneMatrix>,
): SecurityKpi[] {
  const today = formatDay(ANCHOR_ISO);
  const todayCount = events.filter((e) => formatDay(e.createdAt) === today)
    .length;
  const uniqueAdmins = new Set(events.map((e) => e.actor.id)).size;
  const modGrants = grantedCount(matrix, "moderator");

  return [
    {
      id: "today",
      label: "Actions in range",
      value: formatCount(events.length),
      hint: `${todayCount} stamped today`,
      icon: KPI_ICONS.activity,
      tone: "moss",
    },
    {
      id: "admins",
      label: "Active admins",
      value: String(uniqueAdmins),
      hint: "Distinct actors in ledger",
      icon: KPI_ICONS.users,
    },
    {
      id: "spikes",
      label: "Scrape spikes",
      value: String(spikeCount),
      hint: "In current traffic window",
      icon: KPI_ICONS.alert,
      tone: spikeCount > 0 ? "ember" : undefined,
    },
    {
      id: "rbac",
      label: "Moderator grants",
      value: `${modGrants}/${PERMISSIONS.length}`,
      hint: `${TIERS.length} tiers in matrix`,
      icon: KPI_ICONS.key,
      tone: "ochre",
    },
  ];
}

function resolveRange(
  range: RangeId,
  customFrom: string,
  customTo: string,
): { from: string; to: string } {
  if (range === "custom") {
    return {
      from: customFrom || DATA_START,
      to: customTo || DATA_END,
    };
  }
  if (range === "24h" || range === "7d") {
    const days = range === "24h" ? 0 : 6;
    const end = new Date(`${DATA_END}T12:00:00.000Z`);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - days);
    return {
      from: start.toISOString().slice(0, 10),
      to: DATA_END,
    };
  }
  return { from: DATA_START, to: DATA_END };
}

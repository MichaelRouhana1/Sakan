import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { DATA_END, DATA_START, defaultCustomFrom, MOCK_MATRIX } from "./mockSecurity";
import {
  acknowledgeAdminSpike,
  exportAdminAuditLogs,
  listAdminAuditEvents,
  listAdminSpikeAlerts,
  listAdminTraffic,
  loadAdminSecurity,
  saveAdminRoleMatrix,
} from "./securitySource";
import {
  ACTION_LABEL,
  CATEGORY_TABS,
  PERMISSIONS,
  ROLE_FILTER_TABS,
  TIER_LABEL,
  TIERS,
  cloneMatrix,
  eventInLogRange,
  formatCount,
  formatDay,
  grantedCount,
  matchesCategory,
  matricesEqual,
  resolveLogRange,
  type ActionCategory,
  type AdminTier,
  type AuditEvent,
  type ChartRangeId,
  type PermissionId,
  type RangeId,
  type RoleMatrix,
  type SecuritySection,
  type SpikeAlert,
  type TrafficPoint,
} from "./types";
import { KPI_ICONS, type SecurityKpi } from "./SecurityKpis";

export type LoadStatus = "loading" | "ready" | "error";
export type FlashTone = "moss" | "ember";

export function useAdminSecurity() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [savedMatrix, setSavedMatrix] = useState(() => cloneMatrix(MOCK_MATRIX));
  const [matrix, setMatrix] = useState(() => cloneMatrix(MOCK_MATRIX));
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [flashTone, setFlashTone] = useState<FlashTone>("moss");
  const [reloadToken, setReloadToken] = useState(0);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [category, setCategory] = useState<ActionCategory | "all">("all");
  const [roleFilter, setRoleFilter] = useState<AdminTier | "all">("all");
  const [logRange, setLogRange] = useState<RangeId>("7d");
  const [chartRange, setChartRange] = useState<ChartRangeId>("24h");
  const chartRangeRef = useRef(chartRange);
  chartRangeRef.current = chartRange;
  const [customFrom, setCustomFrom] = useState(defaultCustomFrom);
  const [customTo, setCustomTo] = useState(() =>
    formatDay(new Date().toISOString()),
  );
  const [section, setSection] = useState<SecuritySection>("monitor");
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  const [traffic, setTraffic] = useState<TrafficPoint[]>([]);
  const [alerts, setAlerts] = useState<SpikeAlert[]>([]);

  function showFlash(message: string, tone: FlashTone = "moss") {
    setFlashTone(tone);
    setFlash(message);
  }

  const dirty = !matricesEqual(matrix, savedMatrix);

  const load = useCallback(async () => {
    setErrorMessage(null);
    setStatus((prev) => (prev === "ready" ? "ready" : "loading"));
    try {
      const snap = await loadAdminSecurity();
      setEvents(snap.events);
      setSavedMatrix(cloneMatrix(snap.matrix));
      setMatrix(cloneMatrix(snap.matrix));
      const range = chartRangeRef.current;
      const [nextTraffic, nextAlerts] = await Promise.all([
        listAdminTraffic(range),
        listAdminSpikeAlerts(range),
      ]);
      setTraffic(nextTraffic);
      setAlerts(nextAlerts);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load security",
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

  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;
    void (async () => {
      try {
        const [nextTraffic, nextAlerts] = await Promise.all([
          listAdminTraffic(chartRange),
          listAdminSpikeAlerts(chartRange),
        ]);
        if (!cancelled) {
          setTraffic(nextTraffic);
          setAlerts(nextAlerts);
        }
      } catch {
        /* keep prior series */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chartRange, status]);

  const rangeBounds = useMemo(
    () =>
      resolveLogRange(logRange, customFrom, customTo, DATA_START, DATA_END),
    [logRange, customFrom, customTo],
  );

  const ranged = useMemo(
    () => events.filter((event) => eventInLogRange(event, rangeBounds)),
    [events, rangeBounds],
  );

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
      });
  }, [ranged, category, roleFilter, deferredQuery]);

  const chartRangeLabel =
    chartRange === "24h"
      ? "Last 24 hours"
      : chartRange === "7d"
        ? "Last 7 days"
        : "Last 30 days";

  const kpis = useMemo(
    () => buildKpis(ranged, alerts.length, matrix),
    [ranged, alerts.length, matrix],
  );

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

  function requestSection(next: SecuritySection) {
    if (section === "access" && next === "monitor" && dirty) {
      setLeaveConfirmOpen(true);
      return;
    }
    setSection(next);
  }

  function confirmLeaveAccess() {
    setMatrix(cloneMatrix(savedMatrix));
    setLeaveConfirmOpen(false);
    setSection("monitor");
    showFlash("Discarded unsaved RBAC edits");
  }

  function cancelLeaveAccess() {
    setLeaveConfirmOpen(false);
  }

  async function saveMatrix() {
    if (!dirty || busy) return;
    setBusy(true);
    try {
      const result = await saveAdminRoleMatrix(matrix);
      setSavedMatrix(cloneMatrix(result.matrix));
      setMatrix(cloneMatrix(result.matrix));
      setEvents(await listAdminAuditEvents());
      showFlash("RBAC matrix saved · demo only · not enforced on desks");
      setSection("monitor");
    } catch (err) {
      showFlash(err instanceof Error ? err.message : "Save failed", "ember");
    } finally {
      setBusy(false);
    }
  }

  function resetMatrix() {
    if (!dirty || busy) return;
    setMatrix(cloneMatrix(savedMatrix));
    showFlash("Discarded unsaved RBAC edits");
  }

  async function exportLogs() {
    if (visible.length === 0 || busy) return;
    setBusy(true);
    try {
      const result = await exportAdminAuditLogs(visible, logRange);
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      setEvents((current) => [result.event, ...current]);
      showFlash(`Exported ${visible.length} ledger rows`);
    } catch (err) {
      showFlash(err instanceof Error ? err.message : "Export failed", "ember");
    } finally {
      setBusy(false);
    }
  }

  async function ackSpike(spikeId: string) {
    if (busy) return;
    setBusy(true);
    try {
      await acknowledgeAdminSpike(spikeId);
      setAlerts(await listAdminSpikeAlerts(chartRange));
      showFlash("Spike acknowledged · hidden this session");
    } catch (err) {
      showFlash(err instanceof Error ? err.message : "Ack failed", "ember");
    } finally {
      setBusy(false);
    }
  }

  return {
    status,
    errorMessage,
    busy,
    flash,
    flashTone,
    retry: () => setReloadToken((n) => n + 1),
    section,
    requestSection,
    leaveConfirmOpen,
    confirmLeaveAccess,
    cancelLeaveAccess,
    dirty,
    matrix,
    togglePermission,
    saveMatrix,
    resetMatrix,
    query,
    setQuery,
    category,
    setCategory,
    categoryCounts,
    roleFilter,
    setRoleFilter,
    roleCounts,
    logRange,
    setLogRange,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    minDate: DATA_START,
    maxDate: formatDay(new Date().toISOString()),
    chartRange,
    setChartRange,
    chartRangeLabel,
    traffic,
    alerts,
    ackSpike,
    visible,
    kpis,
    exportLogs,
  };
}

function buildKpis(
  events: AuditEvent[],
  spikeCount: number,
  matrix: RoleMatrix,
): SecurityKpi[] {
  const today = formatDay(new Date().toISOString());
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
      hint: "Demo traffic window",
      icon: KPI_ICONS.alert,
      tone: spikeCount > 0 ? "ember" : undefined,
    },
    {
      id: "rbac",
      label: "Moderator grants",
      value: `${modGrants}/${PERMISSIONS.length}`,
      hint: `${TIERS.length} demo tiers · not enforced`,
      icon: KPI_ICONS.key,
      tone: "ochre",
    },
  ];
}

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAdminPromo,
  endAdminPromo,
  getAdminPricing,
  pauseAdminPromo,
  putAdminPricingConfig,
  resumeAdminPromo,
} from "./pricingSource";
import { DEFAULT_ENGINE } from "./mockPricing";
import {
  cheapestPostUsd,
  defaultPromoDraft,
  deriveStatus,
  type CatalogType,
  type CreditPackage,
  type PricingEngine,
  type PromoActionKind,
  type PromoCode,
  type PromoDraft,
  type PromoFilter,
} from "./types";

export type LoadStatus = "loading" | "ready" | "error";

export type PendingAction =
  | { mode: "pause"; itemId: string }
  | { mode: "resume"; itemId: string }
  | { mode: "expire"; itemId: string };

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function useAdminPricing() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [engine, setEngine] = useState<PricingEngine>(DEFAULT_ENGINE);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [engineDraft, setEngineDraft] = useState<PricingEngine>(DEFAULT_ENGINE);
  const [packagesDraft, setPackagesDraft] = useState<CreditPackage[]>([]);
  const [filter, setFilter] = useState<PromoFilter>("all");
  const [query, setQuery] = useState("");
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [draft, setDraft] = useState<PromoDraft>(defaultPromoDraft);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const dirty = useMemo(() => {
    return (
      JSON.stringify(engine) !== JSON.stringify(engineDraft) ||
      JSON.stringify(packages) !== JSON.stringify(packagesDraft)
    );
  }, [engine, engineDraft, packages, packagesDraft]);

  const load = useCallback(async () => {
    setErrorMessage(null);
    setStatus((prev) => (prev === "ready" ? "ready" : "loading"));
    try {
      const snap = await getAdminPricing();
      setEngine(snap.engine);
      setPackages(snap.packages);
      setPromos(snap.promos);
      setEngineDraft(clone(snap.engine));
      setPackagesDraft(clone(snap.packages));
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load pricing",
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

  const counts = useMemo(() => {
    const rows = promos.map((row) => ({
      ...row,
      status: deriveStatus(row),
    }));
    return {
      all: rows.length,
      active: rows.filter((row) => row.status === "active").length,
      scheduled: rows.filter((row) => row.status === "scheduled").length,
      paused: rows.filter((row) => row.status === "paused").length,
      expired: rows.filter((row) => row.status === "expired").length,
    };
  }, [promos]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return promos
      .map((row) => ({ ...row, status: deriveStatus(row) }))
      .filter((row) => (filter === "all" ? true : row.status === filter))
      .filter((row) => {
        if (!needle) return true;
        const hay = `${row.code} ${row.name}`.toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => (a.expiresAt < b.expiresAt ? -1 : 1));
  }, [promos, filter, query]);

  const pendingPromo = useMemo(() => {
    if (!pending) return null;
    return (
      promos.find((row) => row.id === pending.itemId) ??
      visible.find((row) => row.id === pending.itemId) ??
      null
    );
  }, [pending, promos, visible]);

  const cheapestPost = cheapestPostUsd(packages);

  function retry() {
    setReloadToken((n) => n + 1);
  }

  function patchEngine(next: PricingEngine) {
    setEngineDraft(next);
  }

  function patchPack(id: CatalogType, patch: Partial<CreditPackage>) {
    setPackagesDraft((current) =>
      current.map((row) => {
        if (patch.featured === true && row.id !== id) {
          return { ...row, featured: false };
        }
        if (row.id !== id) return row;
        return { ...row, ...patch };
      }),
    );
  }

  async function saveConfig(): Promise<boolean> {
    if (!dirty || busy) return false;
    setBusy(true);
    try {
      const snap = await putAdminPricingConfig(engineDraft, packagesDraft);
      setEngine(snap.engine);
      setPackages(snap.packages);
      setEngineDraft(clone(snap.engine));
      setPackagesDraft(clone(snap.packages));
      setFlash("Pricing saved.");
      return true;
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Save failed");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function discardConfig() {
    setEngineDraft(clone(engine));
    setPackagesDraft(clone(packages));
    setFlash("Discarded unsaved pricing edits.");
  }

  function openGenerator() {
    setDraft(defaultPromoDraft());
    setGeneratorOpen(true);
  }

  function closeGenerator() {
    setGeneratorOpen(false);
    setDraft(defaultPromoDraft());
  }

  async function issuePromo(): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    try {
      const created = await createAdminPromo(draft);
      setPromos((current) => [created, ...current]);
      setGeneratorOpen(false);
      setDraft(defaultPromoDraft());
      setFilter("all");
      setFlash(`Issued ${created.code}`);
      return true;
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Could not issue code");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function copyPromo(promo: PromoCode) {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setFlash(`Code is ${promo.code}`);
      return;
    }
    void navigator.clipboard.writeText(promo.code).then(
      () => setFlash(`Copied ${promo.code}`),
      () => setFlash(`Code is ${promo.code}`),
    );
  }

  function requestPromoAction(promo: PromoCode, kind: PromoActionKind) {
    if (kind === "copy") {
      copyPromo(promo);
      return;
    }
    setPending({ mode: kind, itemId: promo.id });
  }

  function cancelPending() {
    setPending(null);
  }

  async function confirmPending(): Promise<boolean> {
    if (!pending || busy) return false;
    setBusy(true);
    try {
      const updated =
        pending.mode === "pause"
          ? await pauseAdminPromo(pending.itemId)
          : pending.mode === "resume"
            ? await resumeAdminPromo(pending.itemId)
            : await endAdminPromo(pending.itemId);
      setPromos((current) =>
        current.map((row) => (row.id === updated.id ? updated : row)),
      );
      setFlash(
        pending.mode === "pause"
          ? `Paused ${updated.code}`
          : pending.mode === "resume"
            ? `Resumed ${updated.code}`
            : `Ended ${updated.code}`,
      );
      setPending(null);
      return true;
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Action failed");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return {
    status,
    errorMessage,
    engine,
    packages,
    engineDraft,
    packagesDraft,
    promos,
    dirty,
    filter,
    setFilter,
    query,
    setQuery,
    counts,
    visible,
    generatorOpen,
    draft,
    setDraft,
    pending,
    pendingPromo,
    busy,
    flash,
    cheapestPost,
    retry,
    patchEngine,
    patchPack,
    saveConfig,
    discardConfig,
    openGenerator,
    closeGenerator,
    issuePromo,
    requestPromoAction,
    cancelPending,
    confirmPending,
  };
}

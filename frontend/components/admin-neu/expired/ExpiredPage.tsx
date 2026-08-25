import { useDeferredValue, useMemo, useState } from "react";
import { H } from "../h";
import { ExpiredActionDialog } from "./ExpiredActionDialog";
import { ExpiredKpis, buildExpiredKpis } from "./ExpiredKpis";
import { ExpiredTable } from "./ExpiredTable";
import { ExpiredToolbar } from "./ExpiredToolbar";
import { MOCK_EXPIRED } from "./mockExpired";
import {
  ANCHOR_ISO,
  actionLabel,
  formatPct,
  posterName,
  reactivationRate,
  type ExpiredActionKind,
  type ExpiredQueue,
} from "./types";

export function ExpiredPage() {
  const [assets, setAssets] = useState(MOCK_EXPIRED);
  const [queue, setQueue] = useState<ExpiredQueue>("recent");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [pending, setPending] = useState<{
    assetId: string;
    kind: ExpiredActionKind;
  } | null>(null);
  const [note, setNote] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      recent: assets.filter((row) => row.queue === "recent").length,
      archived: assets.filter((row) => row.queue === "archived").length,
      pending_deletion: assets.filter((row) => row.queue === "pending_deletion")
        .length,
    }),
    [assets],
  );

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    return assets
      .filter((row) => row.queue === queue)
      .filter((row) => {
        if (!needle) return true;
        const hay =
          `${row.title} ${row.area} ${posterName(row)} ${row.poster.email}`.toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => (a.expiresAt < b.expiresAt ? -1 : 1));
  }, [assets, queue, deferredQuery]);

  const pendingAsset = assets.find((row) => row.id === pending?.assetId) ?? null;

  const kpis = useMemo(
    () =>
      buildExpiredKpis({
        total: assets.length,
        pending: counts.pending_deletion,
        rate: formatPct(reactivationRate(assets)),
      }),
    [assets, counts.pending_deletion],
  );

  function applyAction(assetId: string, kind: ExpiredActionKind) {
    const target = assets.find((row) => row.id === assetId);
    if (!target) return;

    if (kind === "remove" && target.queue === "pending_deletion") {
      setAssets((current) => current.filter((row) => row.id !== assetId));
      setFlash(`${actionLabel(kind)}: ${target.title}.`);
      return;
    }

    setAssets((current) =>
      current.map((row) => {
        if (row.id !== assetId) return row;
        if (kind === "nudge") {
          return {
            ...row,
            nudgeCount: row.nudgeCount + 1,
            nudgedAt: ANCHOR_ISO,
          };
        }
        if (kind === "archive") {
          return { ...row, queue: "archived" };
        }
        return { ...row, queue: "pending_deletion" };
      }),
    );

    if (kind === "nudge") {
      setFlash(`${actionLabel(kind)} to ${posterName(target)}.`);
    } else if (kind === "archive") {
      setFlash(`${actionLabel(kind)}: ${target.title}.`);
    } else {
      setFlash(`Moved to pending deletion: ${target.title}.`);
    }
  }

  return (
    <H className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <H className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <H>
          <H
            as="p"
            className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-moss"
          >
            Ops
          </H>
          <H
            as="h1"
            className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl"
          >
            Expired Assets
          </H>
          <H as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-clay-700">
            Track listings past the 30-day timer. Nudge posters to renew, keep
            the archive, or purge dead inventory.
          </H>
        </H>
        <H
          as="span"
          className="inline-flex w-fit rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
        >
          Demo data
        </H>
      </H>

      <ExpiredKpis items={kpis} />

      <ExpiredToolbar
        query={query}
        onQuery={setQuery}
        queue={queue}
        onQueue={setQueue}
        counts={counts}
      />

      {flash ? (
        <H
          as="p"
          role="status"
          aria-live="polite"
          className="rounded-neu-md bg-clay-100 px-4 py-2.5 text-sm text-moss shadow-neu-in-sm"
        >
          {flash}
        </H>
      ) : null}

      <ExpiredTable
        assets={visible}
        queue={queue}
        onAction={(asset, kind) => {
          setPending({ assetId: asset.id, kind });
          setNote("");
        }}
      />

      <ExpiredActionDialog
        kind={pending?.kind ?? null}
        asset={pendingAsset}
        note={note}
        onNote={setNote}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          applyAction(pending.assetId, pending.kind);
          setPending(null);
          setNote("");
        }}
      />
    </H>
  );
}

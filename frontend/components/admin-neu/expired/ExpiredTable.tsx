import { useBreakpoint } from "@/lib/breakpoints";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import {
  ADMIN_TABLE_HEAD,
  ADMIN_TABLE_ROW,
  ADMIN_TABLE_ROW_INTERACTIVE,
  ADMIN_TABLE_ROW_SELECTED,
  ADMIN_TABLE_STACK_AFTER_HEAD,
} from "../tableChrome";
import { ExpiredActions } from "./ExpiredActions";
import { DaysSincePill, ExpiredQueuePill } from "./ExpiredPills";
import {
  formatDay,
  posterName,
  queueLabel,
  typeLabel,
  type ExpiredActionKind,
  type ExpiredAsset,
  type ExpiredQueue,
} from "./types";

/** Must stay in source so `npm run admin:css` emits these arbitrary cols. */
const DESKTOP_ROW =
  "grid w-full min-w-0 grid-cols-[2.25rem_minmax(0,14rem)_minmax(0,10rem)_5.75rem_5.5rem_4rem_minmax(11rem,1fr)] items-center justify-start gap-x-3";

type Props = {
  assets: ExpiredAsset[];
  queue: ExpiredQueue;
  selectedId: string | null;
  selectedIds: Set<string>;
  highlightId?: string | null;
  hasQuery: boolean;
  page: number;
  pageCount: number;
  total: number;
  onPage: (page: number) => void;
  onSelect: (asset: ExpiredAsset) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onAction: (asset: ExpiredAsset, kind: ExpiredActionKind) => void;
};

export function ExpiredTable({
  assets,
  queue,
  selectedId,
  selectedIds,
  highlightId,
  hasQuery,
  page,
  pageCount,
  total,
  onPage,
  onSelect,
  onToggleSelect,
  onToggleSelectAll,
  onAction,
}: Props) {
  const bp = useBreakpoint();
  const compact = bp !== "desktop";
  const allSelected =
    assets.length > 0 && assets.every((row) => selectedIds.has(row.id));

  if (assets.length === 0) {
    return (
      <NeuSurface inset className="px-6 py-16 text-center">
        <H as="p" className="font-display text-lg font-semibold text-clay-900">
          {hasQuery ? "No matches" : "Queue empty"}
        </H>
        <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
          {hasQuery
            ? "Try another title, area, or poster — or clear search."
            : `Nothing in ${queueLabel(queue).toLowerCase()}. Switch All, Recently expired, Archived, or Pending deletion.`}
        </H>
      </NeuSurface>
    );
  }

  if (compact) {
    return (
      <H className="flex flex-col gap-3">
        <H className="flex items-center justify-between px-1">
          <H as="label" className="flex items-center gap-2 text-sm text-clay-700">
            <H
              as="input"
              type="checkbox"
              checked={allSelected}
              onChange={onToggleSelectAll}
              className="h-4 w-4 accent-[var(--admin-moss)]"
            />
            Select page
          </H>
          <H as="span" className="text-xs text-clay-500">
            {total} total
          </H>
        </H>
        <H className="grid gap-3">
          {assets.map((asset) => (
            <ExpiredCard
              key={asset.id}
              asset={asset}
              selected={selectedId === asset.id}
              highlighted={highlightId === asset.id}
              checked={selectedIds.has(asset.id)}
              onToggle={() => onToggleSelect(asset.id)}
              onSelect={() => onSelect(asset)}
              onAction={(kind) => onAction(asset, kind)}
            />
          ))}
        </H>
        <Pager
          page={page}
          pageCount={pageCount}
          shown={assets.length}
          total={total}
          onPage={onPage}
        />
      </H>
    );
  }

  return (
    <H className="flex flex-col gap-3">
      <NeuSurface inset className="min-w-0 overflow-hidden p-3">
        <H className={[DESKTOP_ROW, ADMIN_TABLE_HEAD].join(" ")}>
          <H as="span" className="flex items-center">
            <H
              as="input"
              type="checkbox"
              checked={allSelected}
              onChange={onToggleSelectAll}
              aria-label="Select all on page"
              className="h-4 w-4 accent-[var(--admin-moss)]"
            />
          </H>
          <H as="span">Property</H>
          <H as="span">Poster</H>
          <H as="span">Expiry</H>
          <H as="span">Days</H>
          <H as="span">Nudges</H>
          <H as="span" className="text-right">
            Actions
          </H>
        </H>

        <H className={ADMIN_TABLE_STACK_AFTER_HEAD}>
        {assets.map((asset) => (
          <H
            key={asset.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(asset)}
            onKeyDown={(event: { key: string }) => {
              if (event.key === "Enter" || event.key === " ") onSelect(asset);
            }}
            className={[
              DESKTOP_ROW,
              ADMIN_TABLE_ROW,
              ADMIN_TABLE_ROW_INTERACTIVE,
              selectedId === asset.id || highlightId === asset.id
                ? ADMIN_TABLE_ROW_SELECTED
                : "",
            ].join(" ")}
          >
            <H
              className="flex items-center"
              onClick={(event: { stopPropagation: () => void }) =>
                event.stopPropagation()
              }
            >
              <H
                as="input"
                type="checkbox"
                checked={selectedIds.has(asset.id)}
                onChange={() => onToggleSelect(asset.id)}
                aria-label={`Select ${asset.title}`}
                className="h-4 w-4 accent-[var(--admin-moss)]"
              />
            </H>
            <H className="flex min-w-0 items-center gap-3">
              <Cover asset={asset} />
              <H className="min-w-0">
                <H as="p" className="truncate font-display text-sm font-semibold">
                  {asset.title}
                </H>
                <H as="p" className="truncate text-xs text-clay-700">
                  {typeLabel(asset.listingType)} · {asset.area} · $
                  {asset.monthlyRentUsd}/mo
                </H>
              </H>
            </H>
            <H className="min-w-0">
              <H as="p" className="truncate text-sm font-medium">
                {posterName(asset)}
              </H>
              <H as="p" className="truncate text-xs text-clay-700">
                {asset.poster.email}
              </H>
            </H>
            <H as="span" className="whitespace-nowrap text-sm tabular-nums text-clay-700">
              {formatDay(asset.expiresAt)}
            </H>
            <DaysSincePill asset={asset} />
            <H as="span" className="text-sm tabular-nums text-clay-700">
              {asset.nudgeCount}
            </H>
            <H className="flex justify-end">
              <ExpiredActions
                compact
                asset={asset}
                onAction={(kind) => onAction(asset, kind)}
              />
            </H>
          </H>
        ))}
        </H>
      </NeuSurface>

      <Pager
        page={page}
        pageCount={pageCount}
        shown={assets.length}
        total={total}
        onPage={onPage}
      />
    </H>
  );
}

function Pager({
  page,
  pageCount,
  shown,
  total,
  onPage,
}: {
  page: number;
  pageCount: number;
  shown: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <H className="flex flex-wrap items-center justify-between gap-3 px-1">
      <H as="p" className="text-xs text-clay-700">
        On page {shown} of {total}
      </H>
      <H className="flex items-center gap-2">
        <NeuButton
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="px-3 py-1.5 text-xs"
        >
          Prev
        </NeuButton>
        <H as="span" className="text-xs font-medium text-clay-700">
          Page {page} / {pageCount}
        </H>
        <NeuButton
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
          className="px-3 py-1.5 text-xs"
        >
          Next
        </NeuButton>
      </H>
    </H>
  );
}

function ExpiredCard({
  asset,
  selected,
  highlighted,
  checked,
  onToggle,
  onSelect,
  onAction,
}: {
  asset: ExpiredAsset;
  selected: boolean;
  highlighted?: boolean;
  checked: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onAction: (kind: ExpiredActionKind) => void;
}) {
  return (
    <H
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event: { key: string }) => {
        if (event.key === "Enter" || event.key === " ") onSelect();
      }}
      className={[
        "w-full cursor-pointer rounded-neu bg-clay-100 p-4 text-left shadow-neu-sm transition-shadow duration-press",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
        selected || highlighted ? "shadow-press" : "",
      ].join(" ")}
    >
      <H className="flex items-start justify-between gap-3">
        <H className="flex min-w-0 items-center gap-3">
          <H
            onClick={(event: { stopPropagation: () => void }) =>
              event.stopPropagation()
            }
          >
            <H
              as="input"
              type="checkbox"
              checked={checked}
              onChange={onToggle}
              aria-label={`Select ${asset.title}`}
              className="h-4 w-4 accent-[var(--admin-moss)]"
            />
          </H>
          <Cover asset={asset} />
          <H className="min-w-0">
            <H as="p" className="truncate font-display font-semibold">
              {asset.title}
            </H>
            <H as="p" className="truncate text-xs text-clay-700">
              {posterName(asset)} · {asset.area}
            </H>
          </H>
        </H>
        <ExpiredQueuePill queue={asset.queue} />
      </H>
      <H className="mt-3 flex flex-wrap items-center gap-3">
        <H as="span" className="text-xs text-clay-700">
          Expired {formatDay(asset.expiresAt)}
        </H>
        <DaysSincePill asset={asset} />
        <H as="span" className="text-xs text-clay-700">
          {asset.nudgeCount} nudges
        </H>
      </H>
      <H className="mt-3">
        <ExpiredActions asset={asset} onAction={onAction} />
      </H>
    </H>
  );
}

function Cover({ asset }: { asset: ExpiredAsset }) {
  const cover = asset.photos[0];
  return (
    <H
      className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-clay-100 shadow-neu-in-sm"
      aria-hidden
    >
      {cover ? (
        <H
          as="img"
          src={cover.url}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : null}
    </H>
  );
}

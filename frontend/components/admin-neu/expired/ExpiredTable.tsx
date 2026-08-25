import { H } from "../h";
import { NeuSurface } from "../NeuPrimitives";
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

const DESKTOP_ROW =
  "grid grid-cols-[minmax(220px,1.7fr)_minmax(140px,1fr)_110px_92px_minmax(168px,1fr)] items-center gap-3";

type Props = {
  assets: ExpiredAsset[];
  queue: ExpiredQueue;
  onAction: (asset: ExpiredAsset, kind: ExpiredActionKind) => void;
};

export function ExpiredTable({ assets, queue, onAction }: Props) {
  if (assets.length === 0) {
    return (
      <NeuSurface className="p-2 sm:p-3">
        <H className="rounded-neu-md bg-clay-100 px-6 py-16 text-center shadow-neu-in">
          <H as="p" className="font-display text-lg font-semibold text-clay-900">
            No listings in {queueLabel(queue).toLowerCase()}
          </H>
          <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
            Try another title, or switch Recently expired, Archived, and Pending
            deletion.
          </H>
        </H>
      </NeuSurface>
    );
  }

  return (
    <>
      <H className="grid gap-3 md:hidden">
        {assets.map((asset) => (
          <ExpiredCard
            key={asset.id}
            asset={asset}
            onAction={(kind) => onAction(asset, kind)}
          />
        ))}
      </H>

      <NeuSurface className="hidden overflow-hidden p-2 sm:p-3 md:block">
      <H className="overflow-hidden rounded-neu-md bg-clay-100 shadow-neu-in">
        <H className="neu-scroll overflow-x-auto">
          <H className="min-w-[860px]">
            <H
              className={[
                DESKTOP_ROW,
                "border-b border-clay-200/80 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-clay-700",
              ].join(" ")}
            >
              <H as="span">Property title</H>
              <H as="span">Poster name</H>
              <H as="span">Expiry date</H>
              <H as="span">Days since</H>
              <H as="span" className="text-right">
                Actions
              </H>
            </H>

            {assets.map((asset) => (
              <H
                key={asset.id}
                className={[
                  DESKTOP_ROW,
                  "border-t border-clay-200/80 px-5 py-3.5",
                ].join(" ")}
              >
                <H className="flex min-w-0 items-center gap-3">
                  <Cover asset={asset} />
                  <H className="min-w-0">
                    <H
                      as="p"
                      className="truncate font-display text-sm font-semibold"
                    >
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
                <H as="span" className="text-sm tabular-nums text-clay-700">
                  {formatDay(asset.expiresAt)}
                </H>
                <DaysSincePill asset={asset} />
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
        </H>
      </H>
    </NeuSurface>
    </>
  );
}

function ExpiredCard({
  asset,
  onAction,
}: {
  asset: ExpiredAsset;
  onAction: (kind: ExpiredActionKind) => void;
}) {
  return (
    <H className="w-full rounded-neu bg-clay-100 p-4 shadow-neu-sm">
      <H className="flex items-start justify-between gap-3">
        <H className="flex min-w-0 items-center gap-3">
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

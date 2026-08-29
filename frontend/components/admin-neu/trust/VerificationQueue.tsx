import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import {
  ADMIN_TABLE_ROW,
  ADMIN_TABLE_ROW_INTERACTIVE,
  ADMIN_TABLE_ROW_SELECTED,
  ADMIN_TABLE_STACK,
} from "../tableChrome";
import { BadgePill, KycQueuePill } from "./TrustPills";
import {
  formatStamp,
  initials,
  personName,
  queueLabel,
  type KycCase,
  type KycQueue,
} from "./types";

type Props = {
  cases: KycCase[];
  queue: KycQueue;
  selectedId: string | null;
  hasQuery: boolean;
  page: number;
  pageCount: number;
  total: number;
  onPage: (page: number) => void;
  onSelect: (kyc: KycCase) => void;
};

export function VerificationQueue({
  cases,
  queue,
  selectedId,
  hasQuery,
  page,
  pageCount,
  total,
  onPage,
  onSelect,
}: Props) {
  if (cases.length === 0) {
    return (
      <NeuSurface inset className="px-6 py-16 text-center">
        <H as="p" className="font-display text-lg font-semibold text-clay-900">
          {hasQuery ? "No matches" : "Queue is clear"}
        </H>
        <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
          {hasQuery
            ? "Try another name, phone, or area — or clear search."
            : `No submissions in ${queueLabel(queue)}. Try another status.`}
        </H>
      </NeuSurface>
    );
  }

  return (
    <H className="flex flex-col gap-3">
      <H className="flex items-center justify-between px-1">
        <H as="span" className="text-xs text-clay-500">
          {total} total
        </H>
      </H>

      <NeuSurface inset className="overflow-hidden p-3">
        <H
          className={[
            "neu-scroll max-h-[min(85vh,900px)] overflow-y-auto",
            ADMIN_TABLE_STACK,
          ].join(" ")}
          role="listbox"
          aria-label="Poster verification queue"
        >
          {cases.map((row) => {
            const selected = selectedId === row.id;
            return (
              <H
                key={row.id}
                role="option"
                aria-selected={selected}
                tabIndex={0}
                onClick={() => onSelect(row)}
                onKeyDown={(event: { key: string }) => {
                  if (event.key === "Enter" || event.key === " ") onSelect(row);
                }}
                className={[
                  ADMIN_TABLE_ROW,
                  ADMIN_TABLE_ROW_INTERACTIVE,
                  selected ? ADMIN_TABLE_ROW_SELECTED : "",
                ].join(" ")}
              >
                <H className="flex items-start gap-3">
                  <H
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-clay-100 font-display text-sm font-semibold text-moss shadow-neu-in-sm"
                    aria-hidden
                  >
                    {initials(row.poster)}
                  </H>
                  <H className="min-w-0 flex-1">
                    <H className="flex flex-wrap items-center gap-2">
                      <KycQueuePill queue={row.queue} />
                      <BadgePill badge={row.badge} />
                      <H as="span" className="ml-auto text-[11px] text-clay-500">
                        {formatStamp(row.submittedAt)}
                      </H>
                    </H>
                    <H as="p" className="mt-1.5 truncate font-display text-sm font-semibold">
                      {personName(row.poster)}
                    </H>
                    <H as="p" className="truncate text-xs text-clay-700">
                      {row.poster.area} · {row.poster.listingCount} listings ·{" "}
                      {row.poster.phone}
                    </H>
                  </H>
                </H>
              </H>
            );
          })}
        </H>
      </NeuSurface>

      {pageCount > 1 ? (
        <H className="flex items-center justify-between gap-3 px-1">
          <NeuButton
            disabled={page <= 1}
            className="text-xs"
            onClick={() => onPage(page - 1)}
          >
            Previous
          </NeuButton>
          <H as="span" className="text-xs text-clay-700">
            Page {page} / {pageCount}
          </H>
          <NeuButton
            disabled={page >= pageCount}
            className="text-xs"
            onClick={() => onPage(page + 1)}
          >
            Next
          </NeuButton>
        </H>
      ) : null}
    </H>
  );
}

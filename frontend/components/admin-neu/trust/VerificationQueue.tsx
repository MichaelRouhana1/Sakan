import { H } from "../h";
import { NeuSurface } from "../NeuPrimitives";
import { BadgePill, KycQueuePill } from "./TrustPills";
import {
  formatStamp,
  initials,
  personName,
  type KycCase,
} from "./types";

type Props = {
  cases: KycCase[];
  selectedId: string | null;
  onSelect: (kyc: KycCase) => void;
};

export function VerificationQueue({ cases, selectedId, onSelect }: Props) {
  if (cases.length === 0) {
    return (
      <NeuSurface inset className="px-6 py-16 text-center">
        <H as="p" className="font-display text-lg font-semibold text-clay-900">
          Queue is clear
        </H>
        <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
          No submissions in this status. Try another tab or search.
        </H>
      </NeuSurface>
    );
  }

  return (
    <NeuSurface inset className="overflow-hidden">
      <H
        className="neu-scroll max-h-[min(70vh,720px)] overflow-y-auto"
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
                "cursor-pointer border-t border-clay-200/80 px-4 py-3.5 transition-colors duration-press first:border-t-0",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-moss",
                selected ? "bg-moss-soft/40" : "hover:bg-clay-50/60",
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
  );
}

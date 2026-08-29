import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import {
  ADMIN_TABLE_ROW,
  ADMIN_TABLE_ROW_INTERACTIVE,
  ADMIN_TABLE_ROW_SELECTED,
  ADMIN_TABLE_STACK,
} from "../tableChrome";
import { FeedbackActions } from "./FeedbackActions";
import { CategoryPill, QueuePill } from "./FeedbackPills";
import {
  formatStamp,
  initials,
  personName,
  previewText,
  queueLabel,
  type FeedbackActionKind,
  type FeedbackItem,
  type FeedbackQueue,
} from "./types";

type Props = {
  items: FeedbackItem[];
  queue: FeedbackQueue;
  selectedId: string | null;
  hasQuery: boolean;
  page: number;
  pageCount: number;
  total: number;
  onPage: (page: number) => void;
  onSelect: (item: FeedbackItem) => void;
  onAction: (item: FeedbackItem, kind: FeedbackActionKind) => void;
};

export function FeedbackInbox({
  items,
  queue,
  selectedId,
  hasQuery,
  page,
  pageCount,
  total,
  onPage,
  onSelect,
  onAction,
}: Props) {
  if (items.length === 0) {
    return (
      <NeuSurface inset className="px-6 py-16 text-center">
        <H as="p" className="font-display text-lg font-semibold text-clay-900">
          {hasQuery ? "No matches" : "Inbox is clear"}
        </H>
        <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
          {hasQuery
            ? "Try another name, campus, or listing — or clear search."
            : `No notes in ${queueLabel(queue)}. Try another status or category.`}
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
          aria-label="Feedback notes"
        >
          {items.map((item) => {
            const selected = selectedId === item.id;
            return (
              <H
                key={item.id}
                role="option"
                aria-selected={selected}
                tabIndex={0}
                onClick={() => onSelect(item)}
                onKeyDown={(event: { key: string }) => {
                  if (event.key === "Enter" || event.key === " ") onSelect(item);
                }}
                className={[
                  ADMIN_TABLE_ROW,
                  ADMIN_TABLE_ROW_INTERACTIVE,
                  selected ? ADMIN_TABLE_ROW_SELECTED : "",
                ].join(" ")}
              >
                <H className="flex items-start gap-3">
                  <H
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-clay-100 font-display text-xs font-semibold text-moss shadow-neu-in-sm"
                    aria-hidden
                  >
                    {initials(item.user)}
                  </H>
                  <H className="min-w-0 flex-1">
                    <H className="flex flex-wrap items-center gap-2">
                      <CategoryPill category={item.category} />
                      <QueuePill queue={item.queue} />
                      <H as="span" className="ml-auto text-[11px] text-clay-500">
                        {formatStamp(item.createdAt)}
                      </H>
                    </H>
                    <H
                      as="p"
                      className="mt-1.5 truncate font-display text-sm font-semibold text-clay-900"
                    >
                      {personName(item.user)}
                    </H>
                    <H as="p" className="truncate text-xs text-clay-700">
                      {item.user.campus}
                      {item.listing ? ` · ${item.listing.title}` : ""}
                    </H>
                    <H as="p" className="mt-1 truncate text-sm text-clay-700">
                      {previewText(item.message, 88)}
                    </H>
                  </H>
                </H>
                <H className="mt-3 pl-14">
                  <FeedbackActions
                    compact
                    item={item}
                    onAction={(kind) => onAction(item, kind)}
                  />
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

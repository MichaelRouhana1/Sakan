import { useBreakpoint } from "@/lib/breakpoints";
import { H } from "../h";
import { NeuSurface } from "../NeuPrimitives";
import { FeedbackActions } from "./FeedbackActions";
import { CategoryPill } from "./FeedbackPills";
import {
  formatDay,
  personName,
  previewText,
  type FeedbackActionKind,
  type FeedbackItem,
} from "./types";

const DESKTOP_ROW =
  "grid grid-cols-[minmax(160px,1.1fr)_110px_minmax(220px,1.8fr)_110px_minmax(220px,1.15fr)] items-center gap-3";

type Props = {
  items: FeedbackItem[];
  selectedId: string | null;
  onSelect: (item: FeedbackItem) => void;
  onAction: (item: FeedbackItem, kind: FeedbackActionKind) => void;
};

export function FeedbackInbox({ items, selectedId, onSelect, onAction }: Props) {
  const bp = useBreakpoint();
  const compact = bp === "mobile";

  if (items.length === 0) {
    return (
      <NeuSurface inset className="px-6 py-16 text-center">
        <H as="p" className="font-display text-lg font-semibold text-clay-900">
          Inbox is clear
        </H>
        <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
          No notes in this slice. Try another status or category.
        </H>
      </NeuSurface>
    );
  }

  if (compact) {
    return (
      <H className="grid gap-3">
        {items.map((item) => (
          <FeedbackCard
            key={item.id}
            item={item}
            selected={selectedId === item.id}
            onSelect={() => onSelect(item)}
            onAction={(kind) => onAction(item, kind)}
          />
        ))}
      </H>
    );
  }

  return (
    <NeuSurface inset className="overflow-hidden">
      <H className="neu-scroll overflow-x-auto">
        <H className="min-w-[920px]">
          <H
            className={[
              DESKTOP_ROW,
              "border-b border-clay-200/80 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-clay-700",
            ].join(" ")}
          >
            <H as="span">User</H>
            <H as="span">Category</H>
            <H as="span">Message</H>
            <H as="span">Date</H>
            <H as="span" className="text-right">
              Actions
            </H>
          </H>

          {items.map((item) => {
            const selected = selectedId === item.id;
            return (
              <H
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(item)}
                onKeyDown={(event: { key: string }) => {
                  if (event.key === "Enter" || event.key === " ") onSelect(item);
                }}
                className={[
                  DESKTOP_ROW,
                  "cursor-pointer border-t border-clay-200/80 px-5 py-3.5 text-sm transition-colors duration-press",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-moss",
                  selected ? "bg-moss-soft/40" : "hover:bg-clay-50/60",
                ].join(" ")}
              >
                <H className="min-w-0">
                  <H as="p" className="truncate font-display font-semibold text-clay-900">
                    {personName(item)}
                  </H>
                  <H as="p" className="truncate text-[11px] text-clay-500">
                    {item.user.campus}
                  </H>
                </H>
                <CategoryPill category={item.category} />
                <H as="p" className="truncate text-clay-700">
                  {previewText(item.message, 88)}
                </H>
                <H as="p" className="text-xs tabular-nums text-clay-700">
                  {formatDay(item.createdAt)}
                </H>
                <H className="justify-self-end">
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
      </H>
    </NeuSurface>
  );
}

function FeedbackCard({
  item,
  selected,
  onSelect,
  onAction,
}: {
  item: FeedbackItem;
  selected: boolean;
  onSelect: () => void;
  onAction: (kind: FeedbackActionKind) => void;
}) {
  return (
    <NeuSurface
      className={[
        "cursor-pointer p-4 transition-shadow duration-press",
        selected ? "shadow-press" : "",
      ].join(" ")}
    >
      <H
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event: { key: string }) => {
          if (event.key === "Enter" || event.key === " ") onSelect();
        }}
      >
        <H className="flex items-start justify-between gap-3">
          <H className="min-w-0">
            <H as="p" className="font-display text-sm font-semibold text-clay-900">
              {personName(item)}
            </H>
            <H as="p" className="mt-0.5 text-[11px] text-clay-500">
              {item.user.campus} · {formatDay(item.createdAt)}
            </H>
          </H>
          <CategoryPill category={item.category} />
        </H>
        <H as="p" className="mt-3 text-sm leading-relaxed text-clay-700">
          {previewText(item.message, 140)}
        </H>
      </H>
      <H className="mt-3">
        <FeedbackActions compact item={item} onAction={onAction} />
      </H>
    </NeuSurface>
  );
}

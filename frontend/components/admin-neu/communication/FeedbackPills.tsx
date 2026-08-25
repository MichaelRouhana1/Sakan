import { H } from "../h";
import { categoryLabel, type FeedbackCategory, type FeedbackQueue, queueLabel } from "./types";

const CATEGORY_CLASS: Record<FeedbackCategory, { text: string; dot: string }> = {
  feature: { text: "text-moss", dot: "bg-moss" },
  bug: { text: "text-ember", dot: "bg-ember" },
  general: { text: "text-ochre", dot: "bg-ochre" },
};

const QUEUE_CLASS: Record<FeedbackQueue, { text: string; dot: string }> = {
  unread: { text: "text-ochre", dot: "bg-ochre" },
  read: { text: "text-clay-700", dot: "bg-clay-500" },
  archived: { text: "text-clay-500", dot: "bg-clay-500" },
};

export function CategoryPill({ category }: { category: FeedbackCategory }) {
  const tone = CATEGORY_CLASS[category];
  return (
    <H
      as="span"
      className={[
        "inline-flex items-center gap-1.5 rounded-full bg-clay-100 px-2.5 py-1 text-xs font-semibold shadow-neu-in-sm",
        tone.text,
      ].join(" ")}
    >
      <H as="span" className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden />
      {categoryLabel(category)}
    </H>
  );
}

export function QueuePill({ queue }: { queue: FeedbackQueue }) {
  const tone = QUEUE_CLASS[queue];
  return (
    <H
      as="span"
      className={[
        "inline-flex items-center gap-1.5 rounded-full bg-clay-100 px-2.5 py-1 text-xs font-semibold shadow-neu-in-sm",
        tone.text,
      ].join(" ")}
    >
      <H as="span" className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden />
      {queueLabel(queue)}
    </H>
  );
}

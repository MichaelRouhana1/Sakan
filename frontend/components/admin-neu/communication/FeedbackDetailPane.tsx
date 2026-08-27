import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Smartphone,
  User,
} from "lucide-react-native";
import { Link, type Href } from "expo-router";
import type { ReactNode } from "react";
import { H } from "../h";
import { ADMIN_MUTED } from "../theme";
import { NeuIconButton, NeuSurface } from "../NeuPrimitives";
import { FeedbackActions } from "./FeedbackActions";
import { CategoryPill, QueuePill } from "./FeedbackPills";
import {
  formatStamp,
  historyKindLabel,
  initials,
  personName,
  type FeedbackActionKind,
  type FeedbackItem,
} from "./types";

type Props = {
  item: FeedbackItem | null;
  showBack?: boolean;
  onBack?: () => void;
  onAction: (kind: FeedbackActionKind) => void;
};

export function FeedbackDetailPane({
  item,
  showBack,
  onBack,
  onAction,
}: Props) {
  if (!item) {
    return (
      <NeuSurface
        inset
        className="flex min-h-[min(85vh,900px)] items-center justify-center px-6 py-16 text-center"
      >
        <H>
          <H as="p" className="font-display text-lg font-semibold text-clay-900">
            Pick a note
          </H>
          <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
            Full message, replies, and user context stay on this side while you
            triage.
          </H>
        </H>
      </NeuSurface>
    );
  }

  return (
    <NeuSurface className="flex min-h-[min(85vh,900px)] flex-col p-5 sm:p-6">
      <H className="flex items-start justify-between gap-3">
        <H className="min-w-0">
          {showBack ? (
            <NeuIconButton
              ariaLabel="Back to inbox"
              className="mb-3"
              onClick={onBack}
            >
              <ArrowLeft size={18} strokeWidth={1.75} />
            </NeuIconButton>
          ) : null}
          <H className="flex flex-wrap items-center gap-2">
            <CategoryPill category={item.category} />
            <QueuePill queue={item.queue} />
          </H>
          <H as="h2" className="mt-2 font-display text-xl font-semibold text-clay-900">
            {personName(item.user)}
          </H>
        </H>
        <H
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-clay-100 font-display text-sm font-semibold text-moss shadow-neu-in-sm"
          aria-hidden
        >
          {initials(item.user)}
        </H>
      </H>

      <H className="mt-4 grid gap-2">
        <MetaRow
          icon={<User size={16} strokeWidth={1.75} color={ADMIN_MUTED} />}
          label={`${item.user.email} · ${item.user.campus}`}
        />
        <MetaRow
          icon={<Calendar size={16} strokeWidth={1.75} color={ADMIN_MUTED} />}
          label={formatStamp(item.createdAt)}
        />
        {item.device ? (
          <MetaRow
            icon={
              <Smartphone size={16} strokeWidth={1.75} color={ADMIN_MUTED} />
            }
            label={item.device}
          />
        ) : null}
      </H>

      <H className="mt-4 flex flex-wrap gap-2">
        <DeepLink href={`/admin/users?id=${item.user.id}`} label="User" />
        {item.listing ? (
          <DeepLink
            href={`/admin/listings?id=${item.listing.id}`}
            label="Listing"
          />
        ) : null}
      </H>

      <H className="mt-5 rounded-neu-md bg-clay-100 px-4 py-3 shadow-neu-in-sm">
        <H
          as="p"
          className="text-[11px] font-semibold uppercase tracking-wide text-clay-500"
        >
          Their note
        </H>
        <H as="p" className="mt-1.5 text-sm leading-relaxed text-clay-700">
          {item.message}
        </H>
      </H>

      {item.replies.length > 0 ? (
        <H className="mt-4">
          <H
            as="p"
            className="text-[11px] font-semibold uppercase tracking-wide text-clay-500"
          >
            Replies
          </H>
          <H className="mt-2 grid gap-2">
            {item.replies.map((entry) => (
              <H
                key={`${entry.at}-${entry.actor}`}
                className="rounded-neu-md bg-clay-100 px-4 py-3 shadow-neu-in-sm"
              >
                <H as="p" className="text-xs text-clay-500">
                  {entry.actor} · {formatStamp(entry.at)}
                </H>
                <H as="p" className="mt-1 text-sm leading-relaxed text-clay-700">
                  {entry.body}
                </H>
              </H>
            ))}
          </H>
        </H>
      ) : null}

      <H className="mt-5">
        <FeedbackActions item={item} onAction={onAction} />
      </H>

      {item.history.length > 0 ? (
        <H className="mt-6">
          <H
            as="p"
            className="text-[11px] font-semibold uppercase tracking-wide text-clay-500"
          >
            Staff history
          </H>
          <H className="mt-2 grid gap-2">
            {item.history
              .slice()
              .reverse()
              .map((entry) => (
                <H
                  key={entry.id}
                  className="rounded-neu-md bg-clay-100 px-3 py-2.5 shadow-neu-in-sm"
                >
                  <H as="p" className="text-xs font-medium text-clay-900">
                    {historyKindLabel(entry.kind)} · {entry.actor}
                  </H>
                  <H as="p" className="mt-0.5 text-xs text-clay-700">
                    {entry.note}
                  </H>
                  <H as="p" className="mt-0.5 text-[11px] text-clay-500">
                    {formatStamp(entry.at)}
                  </H>
                </H>
              ))}
          </H>
        </H>
      ) : null}
    </NeuSurface>
  );
}

function DeepLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href as Href}
      className="inline-flex items-center gap-1.5 rounded-full bg-clay-100 px-3 py-1.5 text-xs font-medium text-moss shadow-neu-sm"
    >
      <ExternalLink size={12} strokeWidth={1.75} />
      {label}
    </Link>
  );
}

function MetaRow({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <H className="flex items-center gap-2 text-sm text-clay-700">
      <H className="text-clay-500">{icon}</H>
      <H as="span" className="min-w-0 truncate">
        {label}
      </H>
    </H>
  );
}

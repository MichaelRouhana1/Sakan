import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  MapPin,
  User,
  X,
} from "lucide-react-native";
import { Link, type Href } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { H } from "../h";
import { ADMIN_MUTED } from "../theme";
import { NeuIconButton, NeuSurface } from "../NeuPrimitives";
import { ReportActions } from "./ReportActions";
import { ReasonPill, ReportStatusPill } from "./ReportPills";
import {
  accountStatusLabel,
  formatStamp,
  historyKindLabel,
  listingStatusLabel,
  personName,
  reasonLabel,
  type AdminReport,
  type ReportActionKind,
} from "./types";

type Props = {
  report: AdminReport | null;
  related: AdminReport[];
  showBack?: boolean;
  onBack?: () => void;
  onAction: (kind: ReportActionKind) => void;
  onOpenRelated: (report: AdminReport) => void;
};

export function ReportDetailPane({
  report,
  related,
  showBack,
  onBack,
  onAction,
  onOpenRelated,
}: Props) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    setLightboxUrl(null);
  }, [report?.id]);

  useEffect(() => {
    if (!lightboxUrl) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxUrl(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxUrl]);

  if (!report) {
    return (
      <NeuSurface
        inset
        className="flex min-h-[min(85vh,900px)] items-center justify-center px-6 py-16 text-center"
      >
        <H>
          <H as="p" className="font-display text-lg font-semibold text-clay-900">
            Pick a ticket
          </H>
          <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
            Listing photos and poster context stay on this side while you triage.
          </H>
        </H>
      </NeuSurface>
    );
  }

  const cover = report.listing.photos[0] ?? {
    url: report.listing.coverUrl,
    caption: report.listing.title,
  };

  return (
    <>
      <NeuSurface className="flex min-h-[min(85vh,900px)] max-h-[min(85vh,900px)] flex-col overflow-hidden">
        <H className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
          <H className="flex min-w-0 items-start gap-3">
            {showBack ? (
              <NeuIconButton ariaLabel="Back to inbox" onClick={onBack}>
                <ArrowLeft size={18} strokeWidth={1.75} />
              </NeuIconButton>
            ) : null}
            <H className="min-w-0">
              <H
                as="h2"
                className="font-display text-lg font-semibold leading-snug"
              >
                {report.listing.title}
              </H>
              <H className="mt-2 flex flex-wrap items-center gap-2">
                <ReasonPill label={reasonLabel(report.reason)} />
                <ReportStatusPill queue={report.queue} />
              </H>
            </H>
          </H>
        </H>

        <H className="neu-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5">
          <H
            as="button"
            type="button"
            className="block w-full cursor-pointer border-0 bg-transparent p-0 text-left"
            onClick={() => setLightboxUrl(cover.url)}
            aria-label="Enlarge cover photo"
          >
            <NeuSurface inset className="overflow-hidden p-2">
              <H
                as="img"
                src={cover.url}
                alt={`${report.listing.title}, ${cover.caption}`}
                className="h-56 w-full rounded-neu-md object-cover sm:h-64"
              />
            </NeuSurface>
          </H>
          {report.listing.photos.length > 1 ? (
            <H className="neu-scroll flex gap-2 overflow-x-auto">
              {report.listing.photos.map((photo) => (
                <H
                  as="button"
                  type="button"
                  key={photo.id}
                  onClick={() => setLightboxUrl(photo.url)}
                  className="h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-neu-md border-0 bg-clay-100 p-0.5 shadow-neu-sm"
                  aria-label={`Enlarge ${photo.caption}`}
                >
                  <H
                    as="img"
                    src={photo.url}
                    alt={photo.caption}
                    className="h-full w-full rounded-[10px] object-cover"
                  />
                </H>
              ))}
            </H>
          ) : null}

          <H className="flex flex-wrap gap-2">
            <DeepLink
              href={`/admin/listings?id=${report.listing.id}`}
              label="Listing"
            />
            <DeepLink
              href={`/admin/users?id=${report.poster.id}`}
              label="Poster"
            />
            <DeepLink
              href={`/admin/users?id=${report.reporter.id}`}
              label="Reporter"
            />
          </H>

          <H className="grid grid-cols-2 gap-3">
            <PersonCard
              kicker="Reporter"
              person={report.reporter}
              meta={report.reporter.campus}
            />
            <PersonCard
              kicker="Poster"
              person={report.poster}
              meta={`${accountStatusLabel(report.poster.accountStatus)} · ${report.poster.warningCount} warn`}
            />
          </H>

          {report.reporterNote ? (
            <H className="rounded-neu-md bg-clay-100 px-4 py-3 shadow-neu-in-sm">
              <H
                as="p"
                className="text-[11px] font-semibold uppercase tracking-wide text-clay-500"
              >
                Reporter note
              </H>
              <H as="p" className="mt-1 text-sm leading-relaxed text-clay-700">
                {report.reporterNote}
              </H>
            </H>
          ) : null}

          <NeuSurface inset className="space-y-2.5 px-4 py-3">
            <MetaRow
              icon={<MapPin size={16} strokeWidth={1.75} color={ADMIN_MUTED} />}
              label={`${report.listing.area} · $${report.listing.monthlyRentUsd}/mo · ${listingStatusLabel(report.listing.status)}`}
            />
            <MetaRow
              icon={
                <Calendar size={16} strokeWidth={1.75} color={ADMIN_MUTED} />
              }
              label={`Filed ${formatStamp(report.createdAt)}`}
            />
            <MetaRow
              icon={<User size={16} strokeWidth={1.75} color={ADMIN_MUTED} />}
              label={
                report.reviewer
                  ? `${report.reviewer}${report.reviewedAt ? ` · ${formatStamp(report.reviewedAt)}` : ""}`
                  : "Unclaimed"
              }
            />
          </NeuSurface>

          {report.note ? (
            <H className="rounded-neu-md bg-clay-100 px-4 py-3 shadow-neu-in-sm">
              <H
                as="p"
                className="text-[11px] font-semibold uppercase tracking-wide text-clay-500"
              >
                Staff note
              </H>
              <H as="p" className="mt-1 text-sm leading-relaxed text-clay-700">
                {report.note}
              </H>
            </H>
          ) : null}

          <H>
            <H as="h3" className="font-display text-sm font-semibold">
              Moderation history
            </H>
            {report.moderationHistory.length === 0 ? (
              <NeuSurface inset className="mt-3 px-4 py-5 text-sm text-clay-700">
                No actions yet.
              </NeuSurface>
            ) : (
              <H as="ul" className="mt-3 space-y-2">
                {[...report.moderationHistory].reverse().map((entry) => (
                  <H
                    as="li"
                    key={entry.id}
                    className="rounded-neu-md bg-clay-100 px-3 py-2.5 shadow-neu-in-sm"
                  >
                    <H as="p" className="text-sm font-medium text-clay-900">
                      {historyKindLabel(entry.kind)}
                      <H as="span" className="font-normal text-clay-500">
                        {" "}
                        · {entry.actor} · {formatStamp(entry.at)}
                      </H>
                    </H>
                    <H as="p" className="mt-0.5 text-xs text-clay-700">
                      {entry.note}
                    </H>
                  </H>
                ))}
              </H>
            )}
          </H>

          <H>
            <H as="h3" className="font-display text-sm font-semibold">
              Other tickets on this listing
            </H>
            {related.length === 0 ? (
              <NeuSurface inset className="mt-3 px-4 py-5 text-sm text-clay-700">
                No sibling reports on this post.
              </NeuSurface>
            ) : (
              <H as="ul" className="mt-3 space-y-2">
                {related.map((item) => (
                  <H as="li" key={item.id}>
                    <H
                      as="button"
                      type="button"
                      onClick={() => onOpenRelated(item)}
                      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-neu-md bg-clay-100 px-3 py-2.5 text-left shadow-neu-sm transition-shadow duration-press hover:shadow-press focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
                    >
                      <H>
                        <H as="p" className="text-sm font-medium">
                          {personName(item.reporter)}
                        </H>
                        <H as="p" className="text-xs text-clay-700">
                          {reasonLabel(item.reason)} ·{" "}
                          {formatStamp(item.createdAt)}
                        </H>
                      </H>
                      <ReportStatusPill queue={item.queue} />
                    </H>
                  </H>
                ))}
              </H>
            )}
          </H>
        </H>

        <H className="border-t border-clay-200/70 px-5 py-4">
          <ReportActions report={report} onAction={onAction} />
        </H>
      </NeuSurface>

      {lightboxUrl ? (
        <H className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <H
            as="button"
            type="button"
            aria-label="Close photo"
            className="admin-scrim absolute inset-0 cursor-pointer border-0"
            onClick={() => setLightboxUrl(null)}
          />
          <H className="relative max-h-[90vh] max-w-[min(960px,100%)]">
            <NeuIconButton
              ariaLabel="Close"
              className="absolute right-2 top-2 z-10"
              onClick={() => setLightboxUrl(null)}
            >
              <X size={18} strokeWidth={1.75} />
            </NeuIconButton>
            <H
              as="img"
              src={lightboxUrl}
              alt=""
              className="max-h-[90vh] w-full rounded-neu-md object-contain shadow-neu"
            />
          </H>
        </H>
      ) : null}
    </>
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

function PersonCard({
  kicker,
  person,
  meta,
}: {
  kicker: string;
  person: { id: string; firstName: string; lastName: string; email: string };
  meta: string;
}) {
  return (
    <H className="rounded-neu-md bg-clay-100 px-3 py-3 shadow-neu-in-sm">
      <H
        as="p"
        className="text-[11px] font-semibold uppercase tracking-wide text-clay-500"
      >
        {kicker}
      </H>
      <H as="p" className="mt-1 truncate font-display text-sm font-semibold">
        {personName(person)}
      </H>
      <H as="p" className="truncate text-xs text-clay-700">
        {person.email}
      </H>
      <H as="p" className="mt-1 text-xs text-clay-500">
        {meta}
      </H>
    </H>
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

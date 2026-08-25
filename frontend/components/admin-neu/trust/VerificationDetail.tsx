import { ArrowLeft, Calendar, House, Phone } from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { H } from "../h";
import { ADMIN_MUTED } from "../theme";
import { NeuIconButton, NeuSurface } from "../NeuPrimitives";
import { DocumentPreview } from "./DocumentPreview";
import { BadgePill, KycQueuePill } from "./TrustPills";
import { VerificationActions } from "./VerificationActions";
import {
  accountStatusLabel,
  docKindLabel,
  docSideLabel,
  formatStamp,
  personName,
  type KycCase,
  type TrustActionKind,
} from "./types";

type Props = {
  kyc: KycCase | null;
  showBack?: boolean;
  onBack?: () => void;
  onAction: (
    kind: Extract<TrustActionKind, "grant_badge" | "revoke_badge" | "reject_kyc">,
  ) => void;
};

export function VerificationDetail({ kyc, showBack, onBack, onAction }: Props) {
  const [docIndex, setDocIndex] = useState(0);

  useEffect(() => {
    setDocIndex(0);
  }, [kyc?.id]);

  if (!kyc) {
    return (
      <NeuSurface
        inset
        className="flex min-h-[320px] items-center justify-center px-6 py-16 text-center"
      >
        <H>
          <H as="p" className="font-display text-lg font-semibold text-clay-900">
            Pick a submission
          </H>
          <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
            ID and deed stay on this side while you grant or revoke the badge.
          </H>
        </H>
      </NeuSurface>
    );
  }

  const current = kyc.documents[docIndex] ?? kyc.documents[0];

  return (
    <NeuSurface className="flex max-h-[min(70vh,720px)] min-h-0 flex-col overflow-hidden">
      <H className="shrink-0 space-y-3 px-5 pb-3 pt-5">
        <H className="flex items-start gap-3">
          {showBack ? (
            <NeuIconButton ariaLabel="Back to queue" onClick={onBack}>
              <ArrowLeft size={18} strokeWidth={1.75} />
            </NeuIconButton>
          ) : null}
          <H className="min-w-0 flex-1">
            <H as="h2" className="font-display text-lg font-semibold leading-snug">
              {personName(kyc.poster)}
            </H>
            <H className="mt-2 flex flex-wrap items-center gap-2">
              <KycQueuePill queue={kyc.queue} />
              <BadgePill badge={kyc.badge} />
            </H>
          </H>
        </H>
        <VerificationActions kyc={kyc} onAction={onAction} />
      </H>

      <H className="neu-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5">
        {current ? (
          <DocumentPreview document={current} person={kyc.poster} />
        ) : (
          <NeuSurface inset className="px-4 py-10 text-center text-sm text-clay-700">
            No documents uploaded.
          </NeuSurface>
        )}

        {kyc.documents.length > 1 ? (
          <H className="flex flex-wrap gap-2">
            {kyc.documents.map((doc, index) => {
              const selected = index === docIndex;
              return (
                <H
                  as="button"
                  type="button"
                  key={doc.id}
                  aria-current={selected ? "true" : undefined}
                  onClick={() => setDocIndex(index)}
                  className={[
                    "cursor-pointer rounded-neu-md bg-clay-100 px-3 py-2 text-left text-xs font-medium transition-shadow duration-press",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
                    selected ? "text-moss shadow-press" : "text-clay-700 shadow-neu-sm",
                  ].join(" ")}
                >
                  {docKindLabel(doc.kind)}
                  <H as="span" className="mt-0.5 block text-[11px] font-normal text-clay-500">
                    {docSideLabel(doc.side)}
                  </H>
                </H>
              );
            })}
          </H>
        ) : null}

        <H className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <H className="rounded-neu-md bg-clay-100 px-3 py-3 shadow-neu-in-sm">
            <H as="p" className="text-[11px] font-semibold uppercase tracking-wide text-clay-500">
              Clerk account
            </H>
            <H as="p" className="mt-1 truncate font-display text-sm font-semibold">
              {kyc.poster.email}
            </H>
            <H as="p" className="mt-1 text-xs text-clay-500">
              {accountStatusLabel(kyc.poster.accountStatus)}
            </H>
          </H>
          <NeuSurface inset className="space-y-2.5 px-4 py-3">
            <MetaRow
              icon={<Phone size={16} strokeWidth={1.75} color={ADMIN_MUTED} />}
              label={kyc.poster.phone}
            />
            <MetaRow
              icon={<House size={16} strokeWidth={1.75} color={ADMIN_MUTED} />}
              label={`${kyc.poster.area} · ${kyc.poster.listingCount} listings`}
            />
            <MetaRow
              icon={<Calendar size={16} strokeWidth={1.75} color={ADMIN_MUTED} />}
              label={`Filed ${formatStamp(kyc.submittedAt)}`}
            />
          </NeuSurface>
        </H>

        {kyc.note ? (
          <H className="rounded-neu-md bg-clay-100 px-4 py-3 shadow-neu-in-sm">
            <H as="p" className="text-[11px] font-semibold uppercase tracking-wide text-clay-500">
              Staff note
            </H>
            <H as="p" className="mt-1 text-sm leading-relaxed text-clay-700">
              {kyc.note}
            </H>
          </H>
        ) : null}
      </H>
    </NeuSurface>
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

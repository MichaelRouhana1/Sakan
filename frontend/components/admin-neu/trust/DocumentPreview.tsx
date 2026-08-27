import { H } from "../h";
import { NeuSurface } from "../NeuPrimitives";
import {
  docKindLabel,
  docSideLabel,
  initials,
  personName,
  type KycDocument,
  type TrustPerson,
} from "./types";

type Props = {
  document: KycDocument;
  person: TrustPerson;
};

export function DocumentPreview({ document, person }: Props) {
  if (document.url) {
    return <PhotoCard document={document} person={person} />;
  }
  if (document.kind === "property_deed") {
    return <DeedCard document={document} person={person} />;
  }
  return <IdCard document={document} person={person} />;
}

function PhotoCard({ document, person }: Props) {
  return (
    <NeuSurface inset className="overflow-hidden p-3 sm:p-4">
      <H className="overflow-hidden rounded-neu-md bg-clay-100 shadow-neu-sm">
        <H
          as="img"
          src={document.url}
          alt={`${docKindLabel(document.kind)} ${docSideLabel(document.side)} for ${personName(person)}`}
          className="h-48 w-full object-cover sm:h-56"
        />
        <H className="flex items-start justify-between gap-3 px-4 py-3">
          <H>
            <H
              as="p"
              className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-moss"
            >
              {docKindLabel(document.kind)}
            </H>
            <H as="p" className="mt-1 text-xs text-clay-500">
              {docSideLabel(document.side)} · {document.numberMasked} · issued{" "}
              {formatIssued(document.issuedOn)}
            </H>
            {document.extra ? (
              <H as="p" className="mt-1 text-xs leading-relaxed text-clay-700">
                {document.extra}
              </H>
            ) : null}
          </H>
        </H>
      </H>
    </NeuSurface>
  );
}

function IdCard({ document, person }: Props) {
  const passport = document.kind === "passport";
  return (
    <NeuSurface inset className="overflow-hidden p-3 sm:p-4">
      <H
        className={[
          "relative overflow-hidden rounded-neu-md bg-clay-100 px-4 py-4 shadow-neu-sm sm:px-5 sm:py-5",
          passport ? "min-h-[220px]" : "min-h-[200px]",
        ].join(" ")}
      >
        <H className="absolute inset-y-0 left-0 w-1.5 bg-moss" aria-hidden />
        <H className="flex items-start justify-between gap-3 pl-2">
          <H>
            <H
              as="p"
              className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-moss"
            >
              {passport ? "Passport" : "Identity card"}
            </H>
            <H as="p" className="mt-1 text-[11px] font-medium text-clay-500">
              Lebanese Republic · {docSideLabel(document.side)}
            </H>
          </H>
          <H
            as="span"
            className="rounded-full bg-clay-100 px-2.5 py-1 text-[11px] font-semibold text-clay-700 shadow-neu-in-sm"
          >
            {docKindLabel(document.kind)}
          </H>
        </H>

        <H className="mt-5 flex items-center gap-4 pl-2">
          <H
            className="flex h-16 w-14 shrink-0 items-center justify-center rounded-neu-md bg-clay-100 font-display text-lg font-semibold text-moss shadow-neu-in-sm sm:h-[4.5rem] sm:w-16"
            aria-hidden
          >
            {initials(person)}
          </H>
          <H className="min-w-0">
            <H as="p" className="font-display text-lg font-semibold leading-tight">
              {personName(person)}
            </H>
            <H as="p" className="mt-1 font-display text-sm tabular-nums text-clay-700">
              {document.numberMasked}
            </H>
            <H as="p" className="mt-1 text-xs text-clay-500">
              Issued {formatIssued(document.issuedOn)}
              {document.extra ? ` · ${document.extra}` : ""}
            </H>
          </H>
        </H>

        <H className="mt-5 grid grid-cols-2 gap-2 pl-2 text-[11px] text-clay-500">
          <Field kicker="MRZ" value="redacted for review" />
          <Field kicker="Machine zone" value="not transmitted" />
        </H>
      </H>
    </NeuSurface>
  );
}

function DeedCard({ document, person }: Props) {
  return (
    <NeuSurface inset className="overflow-hidden p-3 sm:p-4">
      <H className="rounded-neu-md bg-clay-100 px-4 py-5 shadow-neu-sm sm:px-6">
        <H className="flex items-start justify-between gap-3">
          <H>
            <H
              as="p"
              className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-ochre"
            >
              Title deed
            </H>
            <H as="p" className="mt-1 font-display text-base font-semibold">
              Cadastre extract
            </H>
          </H>
          <H
            as="span"
            className="rounded-full bg-clay-100 px-2.5 py-1 text-[11px] font-semibold text-ochre shadow-neu-in-sm"
          >
            Ownership
          </H>
        </H>

        <H className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field kicker="Registered to" value={personName(person)} />
          <Field kicker="Reference" value={document.numberMasked} />
          <Field kicker="Parcel" value={document.extra ?? "—"} />
          <Field kicker="Issued" value={formatIssued(document.issuedOn)} />
        </H>
        <H as="p" className="mt-4 text-xs leading-relaxed text-clay-500">
          Demo extract. Compare name to the account and listing address before
          granting a badge.
        </H>
      </H>
    </NeuSurface>
  );
}

function Field({ kicker, value }: { kicker: string; value: string }) {
  return (
    <H className="rounded-neu-md bg-clay-100 px-3 py-2.5 shadow-neu-in-sm">
      <H as="p" className="text-[10px] font-semibold uppercase tracking-wide text-clay-500">
        {kicker}
      </H>
      <H as="p" className="mt-0.5 truncate text-sm font-medium text-clay-900">
        {value}
      </H>
    </H>
  );
}

function formatIssued(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

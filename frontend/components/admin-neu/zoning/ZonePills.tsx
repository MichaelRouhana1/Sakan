import { H } from "../h";
import type { ZoneKind, ZoneOrigin } from "./types";

export function OriginPill({ origin }: { origin: ZoneOrigin }) {
  const custom = origin === "custom";
  return (
    <H
      as="span"
      className={[
        "inline-flex items-center gap-1.5 rounded-full bg-clay-100 px-2.5 py-1 text-xs font-semibold shadow-neu-in-sm",
        custom ? "text-ochre" : "text-moss",
      ].join(" ")}
    >
      <H
        as="span"
        className={["h-1.5 w-1.5 rounded-full", custom ? "bg-ochre" : "bg-moss"].join(
          " ",
        )}
        aria-hidden
      />
      {custom ? "Custom" : "Official"}
    </H>
  );
}

export function KindPill({ kind }: { kind: ZoneKind }) {
  const label =
    kind === "governorate" ? "Governorate" : kind === "district" ? "District" : "Area";
  return (
    <H
      as="span"
      className="inline-flex rounded-full bg-clay-100 px-2.5 py-1 text-xs font-semibold tracking-wide text-clay-700 shadow-neu-sm"
    >
      {label}
    </H>
  );
}

export function CountPill({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <H
      as="span"
      className="inline-flex items-center gap-1 rounded-full bg-clay-100 px-2.5 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
    >
      <H as="span" className="tabular-nums font-semibold text-clay-900">
        {value}
      </H>
      {label}
    </H>
  );
}

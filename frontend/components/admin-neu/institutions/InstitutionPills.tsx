import { H } from "../h";
import type { RegistryStatus } from "./types";

export function RegistryStatusPill({ status }: { status: RegistryStatus }) {
  const active = status === "active";
  return (
    <H
      as="span"
      className={[
        "inline-flex items-center gap-1.5 rounded-full bg-clay-100 px-2.5 py-1 text-xs font-semibold shadow-neu-in-sm",
        active ? "text-moss" : "text-clay-700",
      ].join(" ")}
    >
      <H
        as="span"
        className={["h-1.5 w-1.5 rounded-full", active ? "bg-moss" : "bg-clay-500"].join(" ")}
        aria-hidden
      />
      {active ? "Active" : "Inactive"}
    </H>
  );
}

export function AcronymPill({ value }: { value: string }) {
  return (
    <H
      as="span"
      className="inline-flex rounded-full bg-clay-100 px-2.5 py-1 text-xs font-semibold tracking-wide text-clay-700 shadow-neu-sm"
    >
      {value}
    </H>
  );
}

export function MainCampusPill() {
  return (
    <H
      as="span"
      className="inline-flex rounded-full bg-clay-100 px-2 py-0.5 text-[11px] font-semibold text-moss shadow-neu-in-sm"
    >
      Main
    </H>
  );
}

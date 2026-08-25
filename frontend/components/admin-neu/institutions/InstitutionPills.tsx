import { X } from "lucide-react-native";
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

export function DomainChip({
  domain,
  onRemove,
}: {
  domain: string;
  onRemove?: () => void;
}) {
  return (
    <H
      as="span"
      className="inline-flex items-center gap-1 rounded-full bg-clay-100 px-2.5 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
    >
      {domain}
      {onRemove ? (
        <H
          as="button"
          type="button"
          aria-label={`Remove ${domain}`}
          onClick={(event: { stopPropagation: () => void; preventDefault: () => void }) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove();
          }}
          className="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-clay-500 hover:text-ember focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
        >
          <X size={10} strokeWidth={2.25} />
        </H>
      ) : null}
    </H>
  );
}

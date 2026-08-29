import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react-native";
import { H } from "../h";
import { ADMIN_MUTED } from "../theme";
import type { AdminGovernorate } from "./types";

const WELL =
  "flex min-h-[44px] w-full items-center rounded-neu-md bg-clay-50 px-3 shadow-neu-in";

type GroupedOption = {
  group: string;
  options: { id: string; label: string }[];
};

type Props = {
  label: string;
  value: string;
  placeholder?: string;
  locked?: boolean;
  /** Flat options (merge targets). */
  options?: { id: string; label: string }[];
  /** Governorate → district tree (parent district / move). */
  tree?: AdminGovernorate[];
  onChange: (id: string) => void;
};

function labelForValue(
  value: string,
  tree: AdminGovernorate[] | undefined,
  options: { id: string; label: string }[] | undefined,
): string | null {
  if (!value) return null;
  if (options) {
    return options.find((row) => row.id === value)?.label ?? null;
  }
  if (tree) {
    for (const gov of tree) {
      for (const district of gov.districts) {
        if (district.id === value) {
          return `${district.name} · ${gov.name}`;
        }
      }
    }
  }
  return null;
}

function groupsFromTree(tree: AdminGovernorate[]): GroupedOption[] {
  return tree.map((gov) => ({
    group: `${gov.name} · ${gov.arabicName}`,
    options: gov.districts.map((district) => ({
      id: district.id,
      label: district.name,
    })),
  }));
}

/** Neu listbox — avoids native select white-on-white in dark admin. */
export function ZoneSelect({
  label,
  value,
  placeholder = "Select…",
  locked,
  options,
  tree,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();
  const selectedLabel = labelForValue(value, tree, options);
  const groups = tree
    ? groupsFromTree(tree)
    : options
      ? [{ group: "", options }]
      : [];

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <H
      className="relative block"
      ref={(node: HTMLDivElement | null) => {
        rootRef.current = node;
      }}
    >
      <H as="span" className="mb-1.5 block text-sm font-medium text-clay-900">
        {label}
      </H>
      <H
        as="button"
        type="button"
        disabled={locked}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (!locked) setOpen((current) => !current);
        }}
        className={[
          WELL,
          "w-full cursor-pointer justify-between gap-2 text-left transition-shadow duration-press",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
          "disabled:cursor-not-allowed disabled:opacity-60",
          open ? "shadow-press" : "",
        ].join(" ")}
      >
        <H
          as="span"
          className={[
            "min-w-0 flex-1 truncate py-2.5 text-sm",
            selectedLabel ? "font-medium text-clay-900" : "text-clay-500",
          ].join(" ")}
        >
          {selectedLabel ?? placeholder}
        </H>
        <ChevronDown size={16} strokeWidth={1.75} color={ADMIN_MUTED} />
      </H>

      {open ? (
        <H
          id={listId}
          role="listbox"
          aria-label={label}
          className="neu-scroll absolute left-0 right-0 top-[calc(100%+0.4rem)] z-40 max-h-56 overflow-y-auto rounded-neu-md bg-clay-100 p-1.5 shadow-neu"
        >
          {groups.every((group) => group.options.length === 0) ? (
            <H as="p" className="px-3 py-2 text-sm text-clay-700">
              No options
            </H>
          ) : (
            groups.map((group) => (
              <H key={group.group || "flat"}>
                {group.group ? (
                  <H
                    as="p"
                    className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-clay-500"
                  >
                    {group.group}
                  </H>
                ) : null}
                {group.options.map((row) => {
                  const active = row.id === value;
                  return (
                    <H
                      as="button"
                      type="button"
                      role="option"
                      key={row.id}
                      aria-selected={active}
                      onClick={() => {
                        onChange(row.id);
                        setOpen(false);
                      }}
                      className={[
                        "flex w-full cursor-pointer items-start rounded-neu-md px-3 py-2 text-left text-sm transition-shadow duration-press",
                        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
                        active
                          ? "bg-clay-100 font-medium text-moss shadow-press"
                          : "text-clay-900 hover:shadow-neu-in-sm",
                      ].join(" ")}
                    >
                      {row.label}
                    </H>
                  );
                })}
              </H>
            ))
          )}
        </H>
      ) : null}
    </H>
  );
}

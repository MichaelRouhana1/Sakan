"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type SearchSelectOption = {
  value: string;
  label: string;
};

type SearchSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SearchSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  ariaLabel: string;
};

export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search",
  ariaLabel,
}: SearchSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  function onSearchKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[highlight];
      if (option) choose(option.value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-3.5 py-3 text-left text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
        onClick={() => setOpen((current) => !current)}
      >
        <span className={selected ? "text-ink" : "text-ink-faint"}>
          {selected?.label ?? placeholder}
        </span>
        <span aria-hidden className="text-xs text-ink-faint">
          ▾
        </span>
      </button>
      {open ? (
        <div className="mt-1 overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg">
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onSearchKey}
            placeholder={searchPlaceholder}
            aria-label={`${ariaLabel} search`}
            className="w-full border-b border-black/5 px-3.5 py-3 text-base text-ink outline-none placeholder:text-ink-faint"
          />
          <ul id={listId} role="listbox" aria-label={ariaLabel} className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3.5 py-3 text-sm text-ink-muted">No matches</li>
            ) : (
              filtered.map((option, index) => {
                const active = option.value === value;
                return (
                  <li key={option.value} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`flex min-h-11 w-full items-center px-3.5 py-2.5 text-left text-base ${
                        index === highlight ? "bg-brand-mist" : ""
                      } ${active ? "font-medium text-brand" : "text-ink"}`}
                      onMouseEnter={() => setHighlight(index)}
                      onClick={() => choose(option.value)}
                    >
                      {option.label}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

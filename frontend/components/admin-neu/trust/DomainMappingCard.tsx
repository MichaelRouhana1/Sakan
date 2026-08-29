import { ExternalLink, GraduationCap, Plus } from "lucide-react-native";
import { Link, type Href } from "expo-router";
import { useState } from "react";
import { H } from "../h";
import { ADMIN_MUTED } from "../theme";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import { DomainChip } from "./TrustPills";
import { parseDomain, type AcademicDomain } from "./types";

type Props = {
  domains: AcademicDomain[];
  busy?: boolean;
  onAdd: (domain: string) => Promise<boolean>;
  onRemove: (domain: AcademicDomain) => void;
};

export function DomainMappingCard({ domains, busy, onAdd, onRemove }: Props) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const parsed = parseDomain(raw);
    if (!parsed) {
      setError("Use a domain like edu.lb or aub.edu.lb");
      return;
    }
    if (domains.some((row) => row.domain === parsed)) {
      setError("That domain is already mapped");
      return;
    }
    const ok = await onAdd(parsed);
    if (!ok) {
      setError("Could not add domain");
      return;
    }
    setRaw("");
    setError(null);
  }

  const students = domains.reduce((sum, row) => sum + row.studentCount, 0);

  return (
    <NeuSurface as="section" className="flex flex-col p-5">
      <H className="flex items-start gap-3">
        <H
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-clay-100 shadow-neu-sm"
          aria-hidden
        >
          <GraduationCap size={18} strokeWidth={1.75} color={ADMIN_MUTED} />
        </H>
        <H>
          <H as="h2" className="font-display text-lg font-semibold">
            Academic domain mapping
          </H>
          <H as="p" className="mt-1 text-sm leading-relaxed text-clay-700">
            Demo only. Clerk student-domain grant is not wired. Mapping here
            does not write Institutions.
          </H>
        </H>
      </H>

      <H className="mt-4 rounded-neu-md bg-clay-100 px-3 py-2.5 shadow-neu-in-sm">
        <H as="p" className="text-xs leading-relaxed text-clay-700">
          Institutions owns university + campus pins. Student email domains
          live here until a shared API exists.
        </H>
        <Link
          href={"/admin/universities" as Href}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-moss"
        >
          <ExternalLink size={12} strokeWidth={1.75} />
          Open Institutions
        </Link>
      </H>

      <H as="label" className="mt-5 block">
        <H as="span" className="mb-2 block text-sm font-medium text-clay-900">
          Add university domain
        </H>
        <H className="flex gap-2">
          <H className="flex min-w-0 flex-1 items-center gap-2 rounded-neu-md bg-clay-100 px-3 py-2 shadow-neu-in-sm">
            <H as="span" className="text-sm text-clay-500">
              @
            </H>
            <H
              as="input"
              value={raw}
              onChange={(event: { target: { value: string } }) => {
                setRaw(event.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(event: { key: string; preventDefault: () => void }) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void submit();
                }
              }}
              placeholder="edu.lb"
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-clay-900 shadow-none outline-none ring-0 placeholder:text-clay-500 focus:outline-none focus:ring-0"
            />
          </H>
          <NeuButton ariaLabel="Add domain" onClick={() => void submit()} disabled={busy}>
            <Plus size={16} strokeWidth={1.75} />
            Add
          </NeuButton>
        </H>
        {error ? (
          <H as="p" className="mt-2 text-xs text-ember">
            {error}
          </H>
        ) : (
          <H as="p" className="mt-2 text-[11px] text-clay-500">
            Press Enter to add. Leading @ is stripped.
          </H>
        )}
      </H>

      <H className="mt-4 flex flex-wrap gap-1.5">
        {domains.map((row) => (
          <DomainChip
            key={row.id}
            domain={row.domain}
            onRemove={() => onRemove(row)}
          />
        ))}
      </H>

      <H className="mt-4 space-y-2">
        {domains.map((row) => (
          <H
            key={`${row.id}-row`}
            className="flex items-center justify-between gap-3 rounded-neu-md bg-clay-100 px-3 py-2.5 shadow-neu-in-sm"
          >
            <H className="min-w-0">
              <H as="p" className="truncate text-sm font-medium text-clay-900">
                @{row.domain}
              </H>
              <H as="p" className="text-[11px] text-clay-500">
                {row.institution}
              </H>
            </H>
            <H as="p" className="shrink-0 font-display text-sm font-semibold tabular-nums">
              {row.studentCount}
            </H>
          </H>
        ))}
      </H>

      <H className="mt-auto pt-4 text-xs text-clay-500">
        {domains.length} domains · {students} auto-verified students in demo data
      </H>
    </NeuSurface>
  );
}

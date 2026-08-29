import { Save } from "lucide-react-native";
import { useMemo, useState } from "react";
import { H } from "../h";
import { NeuButton, NeuSurface } from "../NeuPrimitives";
import {
  PERMISSIONS,
  TIER_HINT,
  TIER_LABEL,
  TIERS,
  grantedCount,
  type AdminTier,
  type PermissionId,
  type RoleMatrix,
} from "./types";

type Props = {
  matrix: RoleMatrix;
  dirty: boolean;
  busy?: boolean;
  onToggle: (tier: AdminTier, permission: PermissionId) => void;
  onSave: () => void;
  onReset: () => void;
};

export function RbacPanel({
  matrix,
  dirty,
  busy,
  onToggle,
  onSave,
  onReset,
}: Props) {
  const [tier, setTier] = useState<AdminTier>("moderator");
  const groups = useMemo(() => groupPermissions(), []);
  const locked = tier === "super_admin";
  const granted = grantedCount(matrix, tier);
  const total = PERMISSIONS.length;

  return (
    <NeuSurface as="section" className="flex h-full flex-col p-5 sm:p-6">
      <H className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <H>
          <H
            as="p"
            className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-moss"
          >
            Access control
          </H>
          <H as="h2" className="mt-1 font-display text-xl font-semibold text-clay-900">
            Role permissions
          </H>
          <H as="p" className="mt-1 max-w-xl text-sm leading-relaxed text-clay-700">
            Demo tiers · not enforced on desks yet. Staff gate today is binary
            admin. Super Admin stays fully locked on.
          </H>
        </H>
        <H className="flex flex-wrap gap-2">
          <NeuButton onClick={onReset} disabled={!dirty || busy} inset>
            Reset
          </NeuButton>
          <NeuButton tone="moss" onClick={onSave} disabled={!dirty || busy}>
            <Save size={16} strokeWidth={1.75} />
            {busy ? "Saving…" : "Save matrix"}
          </NeuButton>
        </H>
      </H>

      <H
        className="mt-5 neu-scroll inline-flex w-full gap-1 overflow-x-auto rounded-full bg-clay-100 p-1.5 shadow-neu-in"
        role="tablist"
        aria-label="Admin tier"
      >
        {TIERS.map((id) => {
          const selected = tier === id;
          const count = grantedCount(matrix, id);
          return (
            <H
              key={id}
              as="button"
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTier(id)}
              className={[
                "flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-shadow duration-press sm:px-4",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
                selected
                  ? "bg-clay-100 text-clay-900 shadow-press"
                  : "bg-transparent text-clay-700",
              ].join(" ")}
            >
              {TIER_LABEL[id]}
              <H
                as="span"
                className="rounded-full bg-clay-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-clay-700 shadow-neu-in-sm"
              >
                {count}/{total}
              </H>
            </H>
          );
        })}
      </H>

      <H className="mt-4 flex flex-wrap items-center gap-2">
        <H
          as="span"
          className="inline-flex rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
        >
          {TIER_HINT[tier]}
        </H>
        <H as="span" className="text-xs tabular-nums text-clay-500">
          {granted} of {total} capabilities granted
        </H>
        {locked ? (
          <H
            as="span"
            className="inline-flex rounded-full bg-clay-100 px-3 py-1 text-xs font-semibold text-moss shadow-neu-sm"
          >
            Locked
          </H>
        ) : null}
      </H>

      <H className="mt-5 space-y-5">
        {groups.map((group) => (
          <H key={group.name}>
            <H
              as="p"
              className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-moss"
            >
              {group.name}
            </H>
            <H className="grid gap-2 sm:grid-cols-2">
              {group.items.map((perm) => {
                const on = matrix[tier][perm.id];
                return (
                  <H
                    key={perm.id}
                    className="flex items-center justify-between gap-3 rounded-neu-md bg-clay-100 px-3.5 py-3 shadow-neu-in-sm"
                  >
                    <H className="min-w-0">
                      <H className="flex flex-wrap items-center gap-2">
                        <H
                          as="p"
                          className="font-display text-sm font-semibold text-clay-900"
                        >
                          {perm.label}
                        </H>
                        <LevelPill level={perm.level} />
                      </H>
                      <H as="p" className="mt-0.5 text-[11px] text-clay-700">
                        {perm.hint}
                      </H>
                    </H>
                    <NeuSwitch
                      active={on}
                      locked={locked}
                      label={`${on ? "Revoke" : "Grant"} ${perm.label} for ${TIER_LABEL[tier]}`}
                      onChange={() => {
                        if (locked) return;
                        onToggle(tier, perm.id);
                      }}
                    />
                  </H>
                );
              })}
            </H>
          </H>
        ))}
      </H>

      {dirty ? (
        <H
          as="p"
          role="status"
          className="mt-5 rounded-neu-md bg-clay-100 px-3 py-2 text-xs text-ochre shadow-neu-in-sm"
        >
          Unsaved RBAC changes. Save to append an audit row.
        </H>
      ) : null}
    </NeuSurface>
  );
}

function LevelPill({ level }: { level: string }) {
  const tone =
    level === "delete"
      ? "text-ember"
      : level === "edit"
        ? "text-ochre"
        : "text-moss";
  return (
    <H
      as="span"
      className={[
        "inline-flex rounded-full bg-clay-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-neu-sm",
        tone,
      ].join(" ")}
    >
      {level}
    </H>
  );
}

function groupPermissions() {
  const map = new Map<string, typeof PERMISSIONS>();
  for (const perm of PERMISSIONS) {
    const list = map.get(perm.group) ?? [];
    list.push(perm);
    map.set(perm.group, list);
  }
  return Array.from(map.entries()).map(([name, items]) => ({ name, items }));
}

function NeuSwitch({
  active,
  locked,
  label,
  onChange,
}: {
  active: boolean;
  locked?: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <H
      as="button"
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={label}
      aria-disabled={locked || undefined}
      disabled={locked}
      onClick={onChange}
      className={[
        "relative h-8 w-14 shrink-0 rounded-full bg-clay-100 p-1 shadow-neu-in-sm",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
        locked ? "cursor-not-allowed opacity-70" : "cursor-pointer",
      ].join(" ")}
    >
      <H
        className={[
          "pointer-events-none flex h-6 w-6 items-center justify-center rounded-full bg-clay-100 shadow-neu-sm transition-transform duration-panel",
          active ? "translate-x-6" : "translate-x-0",
        ].join(" ")}
      >
        <H
          as="span"
          className={[
            "h-2 w-2 rounded-full",
            active ? "bg-moss shadow-dot-moss" : "bg-clay-500",
          ].join(" ")}
          aria-hidden
        />
      </H>
    </H>
  );
}

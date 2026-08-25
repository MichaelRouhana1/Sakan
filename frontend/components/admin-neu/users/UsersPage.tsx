import { useDeferredValue, useMemo, useState } from "react";
import { H } from "../h";
import { NeuSurface } from "../NeuPrimitives";
import { UserDetailDrawer } from "./UserDetailDrawer";
import { UserModerationDialog } from "./UserModerationDialog";
import { UsersTable } from "./UsersTable";
import { UsersToolbar } from "./UsersToolbar";
import { MOCK_USERS } from "./mockUsers";
import {
  displayName,
  type AccountStatus,
  type ModerationKind,
  type UserRole,
} from "./types";

export function UsersPage() {
  const [users, setUsers] = useState(MOCK_USERS);
  const [role, setRole] = useState<UserRole>("renter");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    userId: string;
    kind: ModerationKind;
  } | null>(null);
  const [note, setNote] = useState("");

  const renterCount = users.filter((user) => user.role === "renter").length;
  const posterCount = users.filter((user) => user.role === "poster").length;
  const reviewCount = users.filter(
    (user) =>
      user.role === role &&
      (user.accountStatus !== "active" || user.history.length > 0),
  ).length;

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    return users.filter((user) => {
      if (user.role !== role) return false;
      if (!needle) return true;
      const hay = `${displayName(user)} ${user.email}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [users, role, deferredQuery]);

  const selected = users.find((user) => user.id === selectedId) ?? null;
  const pendingUser = users.find((user) => user.id === pending?.userId) ?? null;

  function applyAction(userId: string, kind: ModerationKind, staffNote: string) {
    setUsers((current) =>
      current.map((user) => {
        if (user.id !== userId) return user;
        const nextStatus: AccountStatus =
          kind === "ban"
            ? "banned"
            : kind === "restrict"
              ? "restricted"
              : kind === "restore"
                ? "active"
                : user.accountStatus;
        return {
          ...user,
          accountStatus: nextStatus,
          activeListingCount:
            kind === "ban" ? 0 : user.activeListingCount,
          history: [
            ...user.history,
            {
              id: `h-${user.id}-${Date.now()}`,
              kind,
              note: staffNote,
              at: new Date().toISOString(),
              actor: "You",
            },
          ],
        };
      }),
    );
  }

  return (
    <H className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <H className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <H>
          <H as="h1" className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Users
          </H>
          <H as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-clay-700">
            Review renter and poster accounts. Warn, suspend, or ban when reports
            or listings break the rules.
          </H>
        </H>
        <H
          as="span"
          className="inline-flex w-fit rounded-full bg-clay-100 px-3 py-1 text-xs font-medium text-clay-700 shadow-neu-in-sm"
        >
          Demo data
        </H>
      </H>

      <H className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label={role === "renter" ? "Renters shown" : "Posters shown"} value={String(visible.length)} />
        <Kpi label="Needs review" value={String(reviewCount)} />
        <Kpi label="Roster" value={String(role === "renter" ? renterCount : posterCount)} />
      </H>

      <UsersToolbar
        query={query}
        onQuery={setQuery}
        role={role}
        onRole={setRole}
        renterCount={renterCount}
        posterCount={posterCount}
      />

      <UsersTable
        users={visible}
        selectedId={selectedId}
        onSelect={(user) => setSelectedId(user.id)}
        onAction={(user, kind) => {
          setPending({ userId: user.id, kind });
          setNote("");
        }}
      />

      <UserDetailDrawer
        user={selected}
        onClose={() => setSelectedId(null)}
        onAction={(kind) => {
          if (!selected) return;
          setPending({ userId: selected.id, kind });
          setNote("");
        }}
      />

      <UserModerationDialog
        kind={pending?.kind ?? null}
        name={pendingUser ? displayName(pendingUser) : ""}
        note={note}
        onNote={setNote}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          applyAction(pending.userId, pending.kind, note.trim());
          setPending(null);
          setNote("");
        }}
      />
    </H>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <NeuSurface inset className="px-4 py-4">
      <H as="p" className="text-xs font-medium text-clay-700">
        {label}
      </H>
      <H as="p" className="mt-1 font-display text-2xl font-semibold text-clay-900">
        {value}
      </H>
    </NeuSurface>
  );
}

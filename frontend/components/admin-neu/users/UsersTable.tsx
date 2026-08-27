import { ChevronRight } from "lucide-react-native";
import { useBreakpoint } from "@/lib/breakpoints";
import { H } from "../h";
import { ADMIN_MUTED } from "../theme";
import { NeuSurface } from "../NeuPrimitives";
import { UserModerationActions } from "./UserModerationActions";
import { UserRolePill, UserStatusPill } from "./UserPills";
import {
  displayName,
  formatJoinDate,
  initials,
  type AdminUser,
  type ModerationKind,
} from "./types";

const DESKTOP_ROW =
  "grid w-full min-w-0 grid-cols-[minmax(0,20rem)_6.5rem_8rem_7.25rem_11.5rem] items-center justify-start gap-x-3";

type Props = {
  users: AdminUser[];
  selectedId: string | null;
  onSelect: (user: AdminUser) => void;
  onAction: (user: AdminUser, kind: ModerationKind) => void;
};

export function UsersTable({ users, selectedId, onSelect, onAction }: Props) {
  const bp = useBreakpoint();
  const compact = bp !== "desktop";

  if (users.length === 0) {
    return (
      <NeuSurface inset className="px-6 py-16 text-center">
        <H as="p" className="font-display text-lg font-semibold text-clay-900">
          No matches in this view
        </H>
        <H as="p" className="mx-auto mt-2 max-w-sm text-sm text-clay-700">
          Try another name, clear Needs review, or switch All / Renters / Posters.
        </H>
      </NeuSurface>
    );
  }

  if (compact) {
    return (
      <H className="grid gap-3">
        {users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            selected={selectedId === user.id}
            onSelect={() => onSelect(user)}
            onAction={(kind) => onAction(user, kind)}
          />
        ))}
      </H>
    );
  }

  return (
    <NeuSurface inset className="min-w-0 overflow-hidden">
      <H
        className={[
          DESKTOP_ROW,
          "border-b border-clay-200/80 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-clay-700",
        ].join(" ")}
      >
        <H as="span">Name</H>
        <H as="span">Role</H>
        <H as="span">Status</H>
        <H as="span" className="whitespace-nowrap">
          Join Date
        </H>
        <H as="span" className="text-right">
          Actions
        </H>
      </H>

      {users.map((user) => (
        <H
          key={user.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(user)}
          onKeyDown={(event: { key: string }) => {
            if (event.key === "Enter" || event.key === " ") onSelect(user);
          }}
          className={[
            DESKTOP_ROW,
            "cursor-pointer border-t border-clay-200/80 px-5 py-3.5 transition-colors duration-press",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-moss",
            selectedId === user.id ? "bg-moss-soft/40" : "hover:bg-clay-50/60",
          ].join(" ")}
        >
          <H className="flex min-w-0 items-center gap-3">
            <Avatar user={user} />
            <H className="min-w-0">
              <H as="p" className="truncate font-display text-sm font-semibold">
                {displayName(user)}
              </H>
              <H as="p" className="truncate text-xs text-clay-700">
                {user.email}
              </H>
            </H>
          </H>
          <UserRolePill role={user.role} />
          <UserStatusPill status={user.accountStatus} />
          <H as="span" className="whitespace-nowrap text-sm text-clay-700">
            {formatJoinDate(user.createdAt)}
          </H>
          <H className="flex justify-end">
            <UserModerationActions
              compact
              status={user.accountStatus}
              onAction={(kind) => onAction(user, kind)}
            />
          </H>
        </H>
      ))}
    </NeuSurface>
  );
}

function UserCard({
  user,
  selected,
  onSelect,
  onAction,
}: {
  user: AdminUser;
  selected: boolean;
  onSelect: () => void;
  onAction: (kind: ModerationKind) => void;
}) {
  return (
    <H
      as="button"
      type="button"
      onClick={onSelect}
      className={[
        "w-full cursor-pointer rounded-neu bg-clay-100 p-4 text-left shadow-neu-sm transition-shadow duration-press",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss",
        selected ? "shadow-press" : "",
      ].join(" ")}
    >
      <H className="flex items-start justify-between gap-3">
        <H className="flex min-w-0 items-center gap-3">
          <Avatar user={user} />
          <H className="min-w-0">
            <H as="p" className="truncate font-display font-semibold">
              {displayName(user)}
            </H>
            <H as="p" className="truncate text-xs text-clay-700">
              {user.email}
            </H>
          </H>
        </H>
        <ChevronRight size={16} strokeWidth={1.75} color={ADMIN_MUTED} />
      </H>
      <H className="mt-3 flex flex-wrap items-center gap-2">
        <UserRolePill role={user.role} />
        <UserStatusPill status={user.accountStatus} />
        <H as="span" className="text-xs text-clay-700">
          {formatJoinDate(user.createdAt)}
        </H>
      </H>
      <H className="mt-3">
        <UserModerationActions
          compact
          status={user.accountStatus}
          onAction={onAction}
        />
      </H>
    </H>
  );
}

function Avatar({ user }: { user: AdminUser }) {
  return (
    <H
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-clay-100 font-display text-xs font-semibold text-moss shadow-neu-in-sm"
      aria-hidden
    >
      {initials(user)}
    </H>
  );
}

import { H } from "../h";
import { statusLabel, type AccountStatus } from "./types";

const STATUS_CLASS: Record<AccountStatus, string> = {
  active: "text-moss",
  restricted: "text-ochre",
  banned: "text-ember",
};

export function UserStatusPill({ status }: { status: AccountStatus }) {
  return (
    <H
      as="span"
      className={[
        "inline-flex items-center gap-1.5 rounded-full bg-clay-100 px-2.5 py-1 text-xs font-semibold shadow-neu-in-sm",
        STATUS_CLASS[status],
      ].join(" ")}
    >
      <H
        as="span"
        className={[
          "h-1.5 w-1.5 rounded-full",
          status === "active" && "bg-moss",
          status === "restricted" && "bg-ochre",
          status === "banned" && "bg-ember",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden
      />
      {statusLabel(status)}
    </H>
  );
}

export function UserRolePill({ role }: { role: "renter" | "poster" }) {
  return (
    <H
      as="span"
      className="inline-flex rounded-full bg-clay-100 px-2.5 py-1 text-xs font-medium text-clay-700 shadow-neu-sm"
    >
      {role === "renter" ? "Renter" : "Poster"}
    </H>
  );
}

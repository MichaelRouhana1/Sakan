import { BadgeCheck, ShieldOff, X } from "lucide-react-native";
import { NeuButton } from "../NeuPrimitives";
import { H } from "../h";
import type { KycCase, TrustActionKind } from "./types";

type Props = {
  kyc: KycCase;
  onAction: (kind: Extract<TrustActionKind, "grant_badge" | "revoke_badge" | "reject_kyc">) => void;
};

export function VerificationActions({ kyc, onAction }: Props) {
  const canGrant = kyc.badge !== "verified" && kyc.poster.accountStatus !== "banned";
  const canRevoke = kyc.badge === "verified";
  const canReject = kyc.queue === "pending";

  return (
    <H
      className="flex flex-wrap gap-2"
      onClick={(event: { stopPropagation: () => void }) => event.stopPropagation()}
    >
      <NeuButton
        tone="moss"
        disabled={!canGrant}
        ariaLabel="Grant Verified Poster badge"
        className={canGrant ? "shadow-glow-moss" : ""}
        onClick={() => onAction("grant_badge")}
      >
        <BadgeCheck size={16} strokeWidth={1.75} />
        Grant badge
      </NeuButton>
      <NeuButton
        tone="ochre"
        disabled={!canRevoke}
        ariaLabel="Revoke Verified Poster badge"
        onClick={() => onAction("revoke_badge")}
      >
        <ShieldOff size={16} strokeWidth={1.75} />
        Revoke
      </NeuButton>
      <NeuButton
        tone="ember"
        disabled={!canReject}
        ariaLabel="Reject verification"
        onClick={() => onAction("reject_kyc")}
      >
        <X size={16} strokeWidth={1.75} />
        Reject
      </NeuButton>
    </H>
  );
}

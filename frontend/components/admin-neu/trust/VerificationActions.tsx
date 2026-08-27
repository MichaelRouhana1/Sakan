import { BadgeCheck, RotateCcw, ShieldOff, X } from "lucide-react-native";
import { NeuButton } from "../NeuPrimitives";
import { H } from "../h";
import {
  canGrant,
  canReject,
  canReopen,
  canRevoke,
  type KycActionKind,
  type KycCase,
} from "./types";

type Props = {
  kyc: KycCase;
  onAction: (kind: KycActionKind) => void;
};

export function VerificationActions({ kyc, onAction }: Props) {
  const grant = canGrant(kyc);
  const revoke = canRevoke(kyc);
  const reject = canReject(kyc);
  const reopen = canReopen(kyc);

  return (
    <H
      className="flex flex-wrap gap-2"
      onClick={(event: { stopPropagation: () => void }) => event.stopPropagation()}
    >
      <NeuButton
        tone="moss"
        disabled={!grant}
        ariaLabel="Grant Verified Poster badge"
        className={grant ? "shadow-glow-moss" : ""}
        onClick={() => onAction("grant_badge")}
      >
        <BadgeCheck size={16} strokeWidth={1.75} />
        Grant badge
      </NeuButton>
      <NeuButton
        tone="ochre"
        disabled={!revoke}
        ariaLabel="Revoke Verified Poster badge"
        onClick={() => onAction("revoke_badge")}
      >
        <ShieldOff size={16} strokeWidth={1.75} />
        Revoke
      </NeuButton>
      <NeuButton
        tone="ember"
        disabled={!reject}
        ariaLabel="Reject verification"
        onClick={() => onAction("reject_kyc")}
      >
        <X size={16} strokeWidth={1.75} />
        Reject
      </NeuButton>
      <NeuButton
        disabled={!reopen}
        ariaLabel="Reopen verification"
        onClick={() => onAction("reopen")}
      >
        <RotateCcw size={16} strokeWidth={1.75} />
        Reopen
      </NeuButton>
    </H>
  );
}

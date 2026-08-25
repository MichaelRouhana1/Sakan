import { Copy, Pause, Play, TimerOff } from "lucide-react-native";
import { NeuButton } from "../NeuPrimitives";
import { H } from "../h";
import type { PromoCode } from "./types";

export type PromoActionKind = "copy" | "pause" | "resume" | "expire";

type Props = {
  promo: PromoCode;
  compact?: boolean;
  onAction: (kind: PromoActionKind) => void;
};

export function PromoActions({ promo, compact, onAction }: Props) {
  const icon = compact ? 14 : 16;
  const live = promo.status === "active" || promo.status === "scheduled";
  const paused = promo.status === "paused";
  const dead = promo.status === "expired";

  return (
    <H
      className={
        compact
          ? "flex items-center justify-end gap-1.5"
          : "flex flex-wrap gap-2"
      }
    >
      <NeuButton
        ariaLabel="Copy code"
        className={compact ? "px-2.5 py-1.5 text-xs" : ""}
        onClick={() => onAction("copy")}
      >
        <Copy size={icon} strokeWidth={1.75} />
        {compact ? null : "Copy"}
      </NeuButton>
      {live ? (
        <NeuButton
          tone="ochre"
          ariaLabel="Pause campaign"
          className={compact ? "px-2.5 py-1.5 text-xs" : ""}
          onClick={() => onAction("pause")}
        >
          <Pause size={icon} strokeWidth={1.75} />
          {compact ? null : "Pause"}
        </NeuButton>
      ) : null}
      {paused ? (
        <NeuButton
          tone="moss"
          ariaLabel="Resume campaign"
          className={compact ? "px-2.5 py-1.5 text-xs" : ""}
          onClick={() => onAction("resume")}
        >
          <Play size={icon} strokeWidth={1.75} />
          {compact ? null : "Resume"}
        </NeuButton>
      ) : null}
      {!dead ? (
        <NeuButton
          tone="ember"
          ariaLabel="End campaign"
          className={compact ? "px-2.5 py-1.5 text-xs" : ""}
          onClick={() => onAction("expire")}
        >
          <TimerOff size={icon} strokeWidth={1.75} />
          {compact ? null : "End"}
        </NeuButton>
      ) : null}
    </H>
  );
}
